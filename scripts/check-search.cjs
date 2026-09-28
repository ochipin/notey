const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.NOTEY_PLAYWRIGHT || 'playwright');

const theme = path.resolve(__dirname, '..');
const fixture = path.join(theme, 'tests/fixtures/search');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'notey-search-'));
const output = path.join(work, 'public');
const origin = 'https://notey.test';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

function build(multilingual) {
  const content = path.join(work, 'content');
  fs.rmSync(content, { recursive: true, force: true });
  fs.mkdirSync(content);
  const languages = multilingual ? ['ja', 'en'] : ['ja'];
  const prefix = multilingual ? '/review' : '';
  const config = {
    baseURL: origin + prefix + '/', title: 'Search regression',
    theme: path.basename(theme), themesDir: path.dirname(theme),
    defaultContentLanguage: 'ja', defaultContentLanguageInSubdir: multilingual,
    languages: Object.fromEntries(languages.map(language => [language, {
      locale: language === 'ja' ? 'ja-JP' : 'en-US', label: language === 'ja' ? '日本語' : 'English'
    }])),
    markup: { goldmark: { renderer: { unsafe: true } } },
    params: { fonts: { google: false } }
  };
  fs.writeFileSync(path.join(work, 'hugo.json'), JSON.stringify(config));
  for (const language of languages) {
    const write = (name, body) => fs.writeFileSync(path.join(content, name + '.' + language + '.md'), body);
    write('_index', '---\ntitle: Search home\ndraft: false\n---\nOpen search to find an article.\n');
    for (const name of ['article', 'other', 'hidden']) write(name, fs.readFileSync(path.join(fixture, name + '.md'), 'utf8'));
    write('localized', language === 'ja'
      ? '---\ntitle: 日本語の検索確認\ndraft: false\n---\n## 日本語の見出し {#japanese}\n\nこの検索機能では日本語の記事を探せます。jaonlyneedle\n'
      : '---\ntitle: English search check\ndraft: false\n---\n## English heading {#english}\n\nEnglish content is available in its own index. enonlyneedle\n');
    write('plain', '---\ntitle: Plain article\ndraft: false\n---\nPlainmatch appears before any heading.\n');
    write('math', '---\ntitle: 数式\ndraft: false\n---\n## 本文の数式 {#inline-math}\n\nここでは数式を文章に埋め込んで表示します。\n');
    write('title-only', '---\ntitle: Titleonlyneedle reference\ndraft: false\n---\n## First section\n\nNothing relevant here.\n\n## Second section\n\nAnother unrelated section.\n');
    write('escaping', '---\ntitle: "Escapeneedle <em>literal</em>"\ndraft: false\n---\n## Escapeneedle &lt;em&gt;heading&lt;/em&gt; {#escape}\n\nEscapeneedle &lt;img src=x onerror=window.__injected=1&gt; is literal text.\n');
    write('excluded', '---\ntitle: Excluded article\ndraft: false\nparams:\n  search: false\n---\nExcludedneedle must not be searchable.\n');
    write('draft', '---\ntitle: Draft article\ndraft: true\n---\nDraftneedle must not be searchable.\n');
    write('ignored', '---\ntitle: Ignored content\ndraft: false\n---\nVisible article content.\n\n<div data-search-ignore>Ignoredneedle must not be searchable.</div>\n<script>window.scriptneedle = true;</script>\n');
    for (let i = 0; i < 13; i++) {
      write('paging-' + String(i).padStart(2, '0'), '---\ntitle: Paging article ' + i + '\ndraft: false\n---\n' +
        ['Install', 'Upgrade', 'Troubleshooting', 'Extra'].map(heading => '## ' + heading + ' {#' + heading.toLowerCase() + '}\n\nPagingneedle describes this section.\n').join('\n'));
    }
  }
  execFileSync(process.env.NOTEY_HUGO || 'hugo', ['--source', work, '--cacheDir', path.join(work, 'cache'), '--cleanDestinationDir', '--minify', '--panicOnWarning'], { stdio: 'inherit' });
  return prefix;
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function contextFor(browser, language, prefix) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 950 } });
  // Exercise the bundled fallback in an older WebView as well as modern Intl.
  if (!prefix) await context.addInitScript(() => { Intl.Segmenter = undefined; });
  const errors = [], missing = [], requests = [], indexes = [];
  const state = { intercept: null };
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    requests.push(url.href);
    if (url.origin !== origin || !url.pathname.startsWith(prefix + '/')) {
      missing.push(url.href); return route.abort();
    }
    let file = path.join(output, decodeURIComponent(url.pathname.slice(prefix.length)));
    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { missing.push(url.href); return route.abort(); }
    if (/\/search\/[^/]+\.json$/.test(url.pathname)) {
      indexes.push(url.href);
      if (state.intercept) return state.intercept(route, file);
    }
    return route.fulfill({ path: file, contentType: mime[path.extname(file)] || 'application/octet-stream' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const base = origin + prefix + (prefix ? '/' + language : '') + '/';
  const input = page.locator('#search-input');
  const summary = page.locator('#search-summary');
  const articles = page.locator('#search-results > .sdlg-result');
  const open = async () => {
    await page.locator('.hdr-search [data-search-open]').click();
    await page.waitForFunction(() => document.activeElement === document.querySelector('#search-input'));
  };
  const rows = count => page.waitForFunction(count => document.querySelectorAll('#search-results > .sdlg-result').length === count, count);
  const query = async (value, count) => {
    await input.fill(value);
    await page.waitForFunction(() => !document.querySelector('#search-summary').hidden);
    await rows(Math.min(count, 6));
    assert.match(await summary.textContent(), new RegExp('(?:^|\\D)' + count + '(?:\\D|$)'));
  };
  return { context, page, errors, missing, requests, indexes, state, base, input, summary, articles, open, rows, query };
}

async function realChecks(browser, language, prefix) {
  const t = await contextFor(browser, language, prefix);
  const { context, page, errors, missing, requests, indexes, base, input, summary, articles, open, rows, query } = t;
  try {
    await page.goto(base);
    assert.equal(indexes.length, 0, 'Ordinary page loads do not fetch the search index');
    assert(!requests.some(url => /vendor\/minisearch/.test(url)), 'MiniSearch loads only when search opens');
    await page.keyboard.press('Control+k');
    await page.waitForFunction(() => document.activeElement === document.querySelector('#search-input'));
    await query('searchneedle', 2);
    const articleURL = new URL('article/', base).pathname;
    const article = articles.filter({ has: page.locator('a.sdlg-hit[href="' + articleURL + '"]') });
    assert.equal(await article.count(), 1);
    assert.equal(await article.locator('[data-search-hit]').count(), 4, 'Article and its three heading results are individually clickable');
    const links = await article.locator('a.sdlg-subhit').evaluateAll(els => els.map(el => el.getAttribute('href')));
    assert.equal(links.length, 3, 'Matching headings are limited to three per article');
    assert.equal(new Set(links).size, 3, 'Matching heading URLs are deduplicated');
    for (const href of links) {
      const url = new URL(href, origin);
      const source = fs.readFileSync(path.join(output, url.pathname.slice(prefix.length), 'index.html'), 'utf8');
      assert(source.includes('id=' + JSON.stringify(decodeURIComponent(url.hash.slice(1)))) || source.includes('id=' + decodeURIComponent(url.hash.slice(1))), 'Heading links target actual generated IDs: ' + href);
    }
    assert(await article.locator('mark').count() > 0, 'Excerpts highlight the matching text');
    const href = links[0];
    await article.locator('a.sdlg-subhit').first().click();
    await page.waitForURL(origin + href);
    assert.equal(await page.locator('[id="' + decodeURIComponent(new URL(href, origin).hash.slice(1)) + '"]').count(), 1);

    // A match inside initially hidden, nested tab/details content must reveal it.
    await open(); await query('hiddenneedle', 1);
    const hiddenLink = page.locator('a.sdlg-subhit').first();
    const hiddenHref = await hiddenLink.getAttribute('href');
    assert(new URL(hiddenHref, origin).hash);
    await hiddenLink.click(); await page.waitForURL(origin + hiddenHref);
    const checkRevealed = async () => {
      await page.waitForFunction(() => {
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        return target && target.getClientRects().length;
      });
      const state = await page.evaluate(() => {
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        const tabs = [], folds = [];
        for (let el = target; el; el = el.parentElement) {
          if (el.matches('.tab-panel')) tabs.push(!el.hidden);
          if (el.matches('details')) folds.push(el.open);
        }
        return { visible: !!target.getClientRects().length, tabs, folds };
      });
      assert(state.visible); assert.equal(state.tabs.length, 2); assert(state.tabs.every(Boolean));
      assert.equal(state.folds.length, 1); assert(state.folds.every(Boolean));
    };
    await checkRevealed();
    assert.equal(await page.locator('#search-dialog').evaluate(el => el.open), false);
    await page.reload(); await checkRevealed();
    await page.evaluate(() => {
      document.querySelectorAll('details').forEach(el => { el.open = false; });
      document.querySelectorAll('.tabs-bar').forEach(bar => bar.querySelector('button').click());
    });
    assert.equal(await page.evaluate(() => !!document.getElementById(decodeURIComponent(location.hash.slice(1))).getClientRects().length), false);
    await open(); await query('hiddenneedle', 1); await page.locator('a.sdlg-subhit').click();
    await page.waitForFunction(() => !document.querySelector('#search-dialog').open); await checkRevealed();

    await open(); await query('pagingneedle', 13);
    const more = page.locator('#search-more');
    assert.equal(await more.isVisible(), true);
    await more.click(); await rows(12);
    assert.match(await summary.textContent(), /13/, 'The summary counts articles across all batches');
    await more.click(); await rows(13); assert.equal(await more.isHidden(), true);
    const allLinks = await articles.locator('a.sdlg-hit').evaluateAll(els => els.map(el => el.getAttribute('href')));
    assert.equal(new Set(allLinks).size, 13, 'Paging neither skips nor duplicates articles');
    for (let i = 0; i < 13; i++) assert.equal(await articles.nth(i).locator('a.sdlg-subhit').count(), 3);
    await query('plainmatch', 1); assert.equal(await page.locator('a.sdlg-subhit').count(), 0);
    assert.match(await summary.textContent(), language === 'en' ? /1 article found/ : /1/);
    await query('titleonlyneedle', 1); assert.equal(await page.locator('a.sdlg-subhit').count(), 0, 'Title-only matches do not invent matching headings');
    // Intl.Segmenter tokenizes 数式 as one word: its first character must still
    // find that article, including in an English UI and without Segmenter.
    for (const term of ['数', '数式']) {
      await query(term, 1);
      const mathURL = new URL('math/', base).pathname;
      assert.equal(await articles.first().locator('a.sdlg-hit').getAttribute('href'), mathURL);
      assert.equal(await articles.first().locator('a.sdlg-subhit').count(), 1);
      assert.equal(await articles.first().locator('a.sdlg-subhit').getAttribute('href'), mathURL + '#inline-math');
      assert.equal(await articles.first().locator('.sdlg-subhit-title').textContent(), '本文の数式');
      const highlighted = await articles.first().locator('mark').allTextContents();
      assert(highlighted.some(text => text.includes(term)), 'Japanese prefix matches are highlighted: ' + term);
    }

    await query('escapeneedle', 1);
    assert.match(await articles.first().locator('.sdlg-hit-title').textContent(), /<em>literal<\/em>/);
    assert.match(await articles.first().locator('.sdlg-subhit-title').textContent(), /<em>heading<\/em>/);
    assert.equal(await articles.locator('em,img,script').count(), 0, 'Titles, headings and excerpts do not inject HTML');
    assert.equal(await page.evaluate(() => window.__injected), undefined);
    await query(language === 'ja' ? '検索機能' : 'enonlyneedle', 1);
    if (language === 'ja') {
      await input.fill('');
      await input.evaluate(el => {
        el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        el.value = '検索機能';
        el.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
      });
      await page.waitForTimeout(160);
      assert.equal(await articles.count(), 0, 'IME composition does not search unfinished Japanese input');
      assert.equal(await summary.isHidden(), true);
      await input.evaluate(el => el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
      await rows(1);
      assert.match(await summary.textContent(), /1/);
    }

    await query(language === 'ja' ? 'enonlyneedle' : 'jaonlyneedle', 0);
    for (const ignored of ['excludedneedle', 'draftneedle', 'ignoredneedle', 'scriptneedle', 'zzzzunmatched']) await query(ignored, 0);
    assert.equal(await more.isHidden(), true);
    assert.match(await page.locator('#search-status').textContent(), language === 'ja' ? /見つかりません|ありません/ : /No results/);

    await query('searchneedle', 2);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const selector of ['#search-dialog', '.sdlg-body']) assert(await page.locator(selector).evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Search fits a mobile viewport: ' + selector);
    await page.evaluate(() => {
      window.__searchClicks = [];
      document.querySelector('#search-results').addEventListener('click', event => {
        const link = event.target.closest('a[data-search-hit]');
        if (link) { event.preventDefault(); event.stopImmediatePropagation(); window.__searchClicks.push(link.getAttribute('href')); }
      }, true);
    });
    const expectedArticle = await articles.first().locator('a.sdlg-hit').getAttribute('href');
    const expectedHeading = await articles.first().locator('a.sdlg-subhit').first().getAttribute('href');
    await input.press('ArrowDown'); await input.press('ArrowDown');
    assert.equal(await page.locator('[data-search-hit].is-active').getAttribute('href'), expectedHeading);
    await input.press('Enter'); assert.equal(await page.evaluate(() => window.__searchClicks.at(-1)), expectedHeading);
    await input.press('ArrowUp'); await input.press('Enter'); assert.equal(await page.evaluate(() => window.__searchClicks.at(-1)), expectedArticle);
    await articles.first().locator('a.sdlg-hit').focus(); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), expectedHeading);
    await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => window.__searchClicks.at(-1)), expectedHeading);
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), await articles.first().locator('a.sdlg-subhit').nth(1).getAttribute('href'));
    await input.focus(); await input.press('Escape');
    assert.equal(await page.locator('#search-dialog').evaluate(el => el.open), false);
    await open(); assert.equal(await input.inputValue(), ''); assert.equal(await articles.count(), 0); assert.equal(await summary.isHidden(), true);
    assert(!requests.some(url => /pagefind|\.wasm(?:$|\?)/i.test(url)), 'Search does not request Pagefind or WASM');
    assert.deepEqual(errors, []); assert.deepEqual(missing, []);
    console.log(language + ' ' + (prefix || 'root') + ': actual MiniSearch counts, headings, paging, escaping, language isolation, keyboard, mobile and hidden-heading navigation PASS');
  } finally { await context.close(); }
}

async function loadingChecks(browser, language, prefix) {
  const t = await contextFor(browser, language, prefix);
  const { context, page, errors, missing, indexes, state, base, input, summary, articles, open, rows, query } = t;
  try {
    const hold = () => {
      const entered = deferred(), release = deferred();
      state.intercept = async (route, file) => { entered.resolve(); await release.promise; return route.fulfill({ path: file, contentType: 'application/json' }); };
      return { entered, release };
    };
    let controlled = hold();
    await page.goto(base); await open(); await controlled.entered.promise;
    await input.fill('searchneedle');
    // Wait for the query callback to attach to the deliberately held load.
    await page.waitForTimeout(160);
    await input.fill('pagingneedle'); await page.waitForTimeout(160);
    controlled.release.resolve(); await rows(6);
    assert.match(await summary.textContent(), /13/, 'A delayed index response uses only the latest query');
    assert((await page.locator('.sdlg-hit-title').allTextContents()).every(title => title.startsWith('Paging article')));
    assert.equal(indexes.length, 1, 'Concurrent queries share the pending index request');

    controlled = hold(); await page.goto(base); await open(); await controlled.entered.promise;
    await input.fill('searchneedle'); await page.waitForTimeout(160); await input.fill('');
    controlled.release.resolve(); await page.waitForTimeout(160);
    assert.equal(await articles.count(), 0); assert.equal(await summary.isHidden(), true);

    controlled = hold(); await page.goto(base); await open(); await controlled.entered.promise;
    await input.fill('searchneedle'); await page.waitForTimeout(160); await input.press('Escape');
    controlled.release.resolve(); await page.waitForTimeout(160);
    assert.equal(await page.locator('#search-dialog').evaluate(el => el.open), false);
    await open(); assert.equal(await input.inputValue(), ''); assert.equal(await articles.count(), 0); assert.equal(await summary.isHidden(), true);
    await query('searchneedle', 2);

    // A failed fetch can be retried without reloading the article or losing keyboard access.
    let attempts = 0;
    const failed = { entered: deferred(), release: deferred() };
    state.intercept = async route => {
      attempts++; failed.entered.resolve(); await failed.release.promise;
      return route.fulfill({ status: 503, contentType: 'text/plain', body: 'Unavailable' });
    };
    await page.goto(base); await open(); await failed.entered.promise;
    await input.fill('searchneedle'); await page.waitForTimeout(160); failed.release.resolve();
    await page.waitForFunction(() => /読み込めません|取得|Could not|not found/i.test(document.querySelector('#search-status').textContent));
    assert.equal(await summary.isHidden(), true); assert.equal(await articles.count(), 0);
    state.intercept = (route, file) => {
      attempts++; return route.fulfill({ path: file, contentType: 'application/json' });
    };
    await input.fill(''); await query('searchneedle', 2);
    assert.equal(attempts, 2, 'Typing a new query retries failed index loading once');

    // Query strings survive article links as well as their heading fragments.
    state.intercept = (route, file) => {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      const article = data.pages.find(row => row.url.endsWith('/article/'));
      article.url += '?edition=review&language=' + language;
      article.sections.forEach(section => {
        const hash = section.url.indexOf('#');
        section.url = article.url + (hash < 0 ? '' : section.url.slice(hash));
      });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    };
    await page.goto(base); await open(); await query('searchneedle', 2);
    const article = articles.filter({ has: page.locator('a.sdlg-hit[href*="?edition=review"]') });
    assert.equal(await article.count(), 1);
    const articleURL = await article.locator('a.sdlg-hit').getAttribute('href');
    assert.equal(new URL(articleURL, origin).search, '?edition=review&language=' + language);
    for (const link of await article.locator('a.sdlg-subhit').evaluateAll(els => els.map(el => el.getAttribute('href')))) {
      assert.equal(new URL(link, origin).search, new URL(articleURL, origin).search);
      assert(new URL(link, origin).hash, 'Heading links preserve both query and fragment');
    }
    assert.deepEqual(errors, []); assert.deepEqual(missing, []);
    console.log(language + ' ' + (prefix || 'root') + ': lazy index sharing, stale query/clear/close and failed-fetch retry PASS');
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({ ...(process.env.NOTEY_BROWSER ? { executablePath: process.env.NOTEY_BROWSER } : {}), headless: true });
  try {
    const prefix = build(true);
    for (const language of ['ja', 'en']) { await realChecks(browser, language, prefix); await loadingChecks(browser, language, prefix); }
    await realChecks(browser, 'ja', build(false));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (process.env.NOTEY_KEEP_TEST_OUTPUT) console.log('Test output retained at ' + work);
  else fs.rmSync(work, { recursive: true, force: true });
});
