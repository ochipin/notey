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
const prefix = '/review';
const config = {
  baseURL: origin + prefix + '/', title: 'Search regression',
  theme: path.basename(theme), themesDir: path.dirname(theme),
  defaultContentLanguage: 'ja', defaultContentLanguageInSubdir: true,
  languages: { ja: { locale: 'ja-JP', label: '日本語' }, en: { locale: 'en-US', label: 'English' } },
  params: { fonts: { google: false } }
};
fs.mkdirSync(path.join(work, 'content'));
fs.writeFileSync(path.join(work, 'hugo.json'), JSON.stringify(config));
for (const language of ['ja', 'en']) {
  fs.writeFileSync(path.join(work, 'content/_index.' + language + '.md'), '---\ntitle: Search home\ndraft: false\n---\nOpen search to find an article.\n');
  for (const name of ['article', 'other', 'hidden']) fs.copyFileSync(path.join(fixture, name + '.md'), path.join(work, 'content/' + name + '.' + language + '.md'));
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json', '.wasm': 'application/wasm' };

// A generated index replaces Hugo's for predictable counts, ordering and races;
// the real MiniSearch module still runs. Shape: layouts/_partials/search-index.html.
function mockIndex(language) {
  const pages = [], docs = [];
  const add = (title, sections, intro) => {
    const p = pages.length;
    pages.push({ u: prefix + '/' + language + '/article/?article=' + p, t: title, c: 'Docs / Search' });
    docs.push({ p, a: '', h: title, x: intro || '' });
    for (const [a, h, x] of sections) docs.push({ p, a, h, x });
  };
  const sections = word => [
    ['install', 'Install <literal>', word + ' install'],
    ['install', 'Install duplicate', word + ' duplicate anchor'],
    ['upgrade', 'Upgrade', word + ' upgrade'],
    ['troubleshooting', 'Troubleshooting', word + ' troubleshoot'],
    ['extra', 'Extra', word + ' fourth heading']
  ];
  for (let i = 0; i < 13; i++) add('normal article ' + i, sections('normal keys'), 'Article excerpt normal keys ' + i);
  add('plainmatch article', [], 'Only the page text matches plainmatch.');
  for (let i = 0; i < 6; i++) add('fresh article ' + i, sections('fresh'), 'Article excerpt fresh ' + i);
  return JSON.stringify({ v: 1, pages, docs });
}

async function contextFor(browser, mock) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 950 } });
  const errors = [], missing = [];
  const control = { hold: null, fail: 0, requests: 0 };
  await context.addInitScript(() => { window.__searchTest = { clicks: [] }; });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || !url.pathname.startsWith(prefix + '/')) {
      missing.push(url.href); return route.abort();
    }
    if (mock && /\/search\/(ja|en)\.[0-9a-f]+\.json$/.test(url.pathname)) {
      control.requests++;
      if (control.fail) { control.fail--; return route.fulfill({ status: 500, body: 'error' }); }
      if (control.hold) await control.hold;
      return route.fulfill({ body: mockIndex(url.pathname.match(/\/search\/(ja|en)\./)[1]), contentType: 'application/json' });
    }
    let file = path.join(output, decodeURIComponent(url.pathname.slice(prefix.length)));
    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { missing.push(url.href); return route.abort(); }
    return route.fulfill({ path: file, contentType: mime[path.extname(file)] || 'application/octet-stream' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, errors, missing, control };
}

async function mockChecks(browser, language) {
  const { context, page, errors, missing, control } = await contextFor(browser, true);
  try {
    // Opening the dialog starts the download. If it and the search's own
    // attempt fail, a message is shown, and the next search tries again.
    control.fail = 2;
    let releaseIndex;
    await page.goto(origin + prefix + '/' + language + '/');
    const input = page.locator('#search-input');
    const more = page.locator('#search-more');
    const summary = page.locator('#search-summary');
    const status = page.locator('#search-status');
    const articles = page.locator('#search-results > .sdlg-result');
    const open = async () => {
      await page.locator('.hdr-search [data-search-open]').click();
      await page.waitForFunction(() => document.activeElement === document.querySelector('#search-input'));
    };
    const rows = count => page.waitForFunction(count => document.querySelectorAll('#search-results > .sdlg-result').length === count, count);
    const titles = () => page.locator('.sdlg-hit-title').allTextContents();
    const expected = (word, count) => Array.from({ length: count }, (_, i) => word + ' article ' + i);
    const articleURL = i => prefix + '/' + language + '/article/?article=' + i;

    await open();
    await input.fill('normal');
    await page.waitForFunction(text => document.querySelector('#search-status').textContent === text, await page.evaluate(() => document.documentElement.lang.startsWith('ja')) ? '検索インデックスを読み込めませんでした。ページを再読み込みしてください。' : 'Could not load the search index. Please reload the page.');
    await input.fill('normal '); await rows(6);
    assert.equal(control.requests, 3, 'A failed index download is retried by the next search');

    assert.equal(await summary.isVisible(), true);
    assert.match(await summary.textContent(), /13/);
    assert((await titles()).every(title => /^normal article \d+$/.test(title)));
    for (let i = 0; i < 6; i++) {
      const article = articles.nth(i);
      const url = await article.locator('a.sdlg-hit').getAttribute('href');
      assert.match(url, new RegExp('^' + prefix + '/' + language + '/article/\\?article=\\d+$'), 'Article links open the article, not its first heading');
      assert.equal(await article.locator('a.sdlg-hit').getAttribute('data-search-hit'), '');
      const subs = await article.locator('a.sdlg-subhit').evaluateAll(links => links.map(link => link.getAttribute('href')));
      assert.equal(subs.length, 3, 'At most three headings per article');
      assert.equal(new Set(subs).size, 3, 'Duplicate anchors are shown once');
      for (const sub of subs) assert(['install', 'upgrade', 'troubleshooting', 'extra'].map(anchor => url + '#' + anchor).includes(sub), sub);
      assert.equal(await article.locator('[data-search-hit]').count(), 4);
      assert.equal(await article.locator('a.sdlg-subhit em, a.sdlg-subhit literal').count(), 0, 'Heading titles must be escaped');
      if (subs.some(sub => sub.endsWith('#install'))) assert.match((await article.locator('a.sdlg-subhit').allTextContents()).join(' '), /Install (<literal>|duplicate)/);
      assert.equal(await article.locator('a.sdlg-hit mark').first().textContent(), 'normal', 'Matches are marked in the excerpt');
    }
    await more.click(); await rows(12);
    assert.match(await summary.textContent(), /13/, 'Total counts articles across all batches');
    await more.click(); await rows(13);
    assert.equal(await more.isHidden(), true);
    assert.deepEqual((await titles()).sort(), expected('normal', 13).sort());

    await input.fill('plainmatch'); await rows(1);
    assert.equal(await articles.first().locator('a.sdlg-hit').isVisible(), true);
    assert.equal(await articles.first().locator('a.sdlg-subhit').count(), 0);
    assert.match(await summary.textContent(), language === 'en' ? /1 article found/ : /1/);
    assert.equal(await more.isHidden(), true);

    await input.fill('absentword');
    await page.waitForFunction(() => !document.querySelector('#search-status').hidden && !document.querySelector('#search-results').children.length && !document.querySelector('#search-summary').hidden);
    assert.equal(await more.isHidden(), true);
    assert.match(await summary.textContent(), /0/);
    assert(!/13/.test(await summary.textContent()), 'Zero results must not retain the previous count');
    assert.match(await status.textContent(), language === 'ja' ? /見つかりません|ありません/ : /No results/);

    await input.fill(''); 
    assert.equal(await articles.count(), 0); assert.equal(await more.isHidden(), true); assert.equal(await summary.isHidden(), true);
    await input.press('Escape');

    // While the index downloads, a newer query replaces an older one, and
    // closing the dialog discards the pending search.
    await page.reload();
    control.hold = new Promise(resolve => { releaseIndex = resolve; });
    await open();
    await input.fill('normal'); await input.fill('fresh');
    await page.waitForTimeout(200);
    releaseIndex(); control.hold = null;
    await rows(6);
    assert.deepEqual((await titles()).sort(), expected('fresh', 6).sort(), 'A stale query must not replace the new one');
    assert.equal(await more.isHidden(), true);
    await input.press('Escape');

    await page.reload();
    control.hold = new Promise(resolve => { releaseIndex = resolve; });
    await open(); await input.fill('normal'); await page.waitForTimeout(200); await input.press('Escape');
    assert.equal(await page.locator('#search-dialog').evaluate(el => el.open), false);
    releaseIndex(); control.hold = null;
    await page.waitForTimeout(200); await open();
    assert.equal(await input.inputValue(), ''); assert.equal(await articles.count(), 0); assert.equal(await summary.isHidden(), true);

    await input.fill('keys'); await rows(6);
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.locator('#search-dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Search results fit a mobile dialog');
    assert(await page.locator('.sdlg-body').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Search result content fits the mobile body');
    // Cancel navigation only for the keyboard assertions; retain native clicks.
    await page.evaluate(() => document.querySelector('#search-results').addEventListener('click', event => {
      const link = event.target.closest('a[data-search-hit]');
      if (link) { event.preventDefault(); event.stopImmediatePropagation(); window.__searchTest.clicks.push(link.getAttribute('href')); }
    }, true));
    const first = articles.first();
    const firstURL = await first.locator('a.sdlg-hit').getAttribute('href');
    const [subURL, nextURL] = await first.locator('a.sdlg-subhit').evaluateAll(links => links.slice(0, 2).map(link => link.getAttribute('href')));
    await input.press('ArrowDown'); await input.press('ArrowDown');
    assert.equal(await page.locator('[data-search-hit].is-active').getAttribute('href'), subURL);
    await input.press('Enter');
    assert.equal(await page.evaluate(() => window.__searchTest.clicks.at(-1)), subURL, 'Arrow selection + Enter opens a heading');
    await input.press('ArrowUp'); await input.press('Enter');
    assert.equal(await page.evaluate(() => window.__searchTest.clicks.at(-1)), firstURL, 'Arrow selection + Enter opens an article');

    await first.locator('a.sdlg-hit').focus(); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), subURL, 'Tab reaches the heading link');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => window.__searchTest.clicks.at(-1)), subURL, 'Native Enter follows the focused link despite a different arrow selection');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), nextURL, 'Arrow navigation also moves focus when a result link has focus');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => window.__searchTest.clicks.at(-1)), nextURL);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => window.__searchTest.clicks.at(-1)), firstURL, 'Native Enter follows the focused article link');
    await input.focus(); await input.press('Escape');
    assert.equal(await page.locator('#search-dialog').evaluate(el => el.open), false);
    assert.deepEqual(errors, []); assert.deepEqual(missing, []);
    console.log(language + ': mock counts, headings, paging, retry, stale searches, clear/Escape and keyboard PASS');
  } finally { await context.close(); }
}

async function realChecks(browser, language) {
  const { context, page, errors, missing } = await contextFor(browser, false);
  try {
    await page.goto(origin + prefix + '/' + language + '/');
    await page.locator('.hdr-search [data-search-open]').click();
    await page.locator('#search-input').fill('searchneedle');
    await page.waitForFunction(() => document.querySelectorAll('#search-results > .sdlg-result').length === 2);
    assert.match(await page.locator('#search-summary').textContent(), /2/);
    const article = page.locator('.sdlg-result').filter({ has: page.locator('a.sdlg-hit[href="' + prefix + '/' + language + '/article/"]') });
    assert.equal(await article.count(), 1);
    const links = await article.locator('a.sdlg-subhit').evaluateAll(els => els.map(el => el.getAttribute('href')));
    assert.equal(links.length, 3, 'The real index yields matching heading links, limited to three');
    for (const href of links) {
      const url = new URL(href, origin);
      const file = path.join(output, url.pathname.slice(prefix.length), 'index.html');
      const source = fs.readFileSync(file, 'utf8');
      assert(source.includes('id=' + JSON.stringify(decodeURIComponent(url.hash.slice(1)))) || source.includes('id=' + decodeURIComponent(url.hash.slice(1))), 'Search heading points to a generated ID: ' + href);
    }
    const href = links[0];
    await article.locator('a.sdlg-subhit').first().click();
    await page.waitForURL(origin + href);
    assert.equal(await page.locator('[id="' + decodeURIComponent(new URL(href, origin).hash.slice(1)) + '"]').count(), 1);
    // A real match inside initially hidden, nested tab/details content.
    await page.locator('.hdr-search [data-search-open]').click();
    await page.locator('#search-input').fill('hiddenneedle');
    await page.waitForFunction(() => document.querySelectorAll('#search-results > .sdlg-result').length === 1);
    assert.match(await page.locator('#search-summary').textContent(), language === 'en' ? /1 article found/ : /1/);
    const hiddenLink = page.locator('a.sdlg-subhit').first();
    const hiddenHref = await hiddenLink.getAttribute('href');
    assert(new URL(hiddenHref, origin).hash, 'The hidden match has a heading URL');
    await hiddenLink.click(); await page.waitForURL(origin + hiddenHref);
    const checkRevealed = async () => {
      // Revealing/scanning a hash runs on requestAnimationFrame after navigation
      // or dialog close. Wait for that observable result before asserting it.
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
        return { target: !!target, visible: !!target && !!target.getClientRects().length, tabs, folds };
      });
      assert.equal(state.target, true); assert.equal(state.visible, true);
      assert.equal(state.tabs.length, 2); assert(state.tabs.every(Boolean));
      assert.equal(state.folds.length, 1); assert(state.folds.every(Boolean));
    };
    await checkRevealed();
    assert.equal(await page.locator('#search-dialog').evaluate(el => el.open), false);
    await page.reload(); await checkRevealed();
    // Retain the hash, hide the content again, and select the same search hit.
    await page.evaluate(() => {
      document.querySelectorAll('details').forEach(el => { el.open = false; });
      document.querySelectorAll('.tabs-bar').forEach(bar => bar.querySelector('button').click());
    });
    assert.equal(await page.evaluate(() => !!document.getElementById(decodeURIComponent(location.hash.slice(1))).getClientRects().length), false, 'Same-hash test starts with hidden content');
    await page.locator('.hdr-search [data-search-open]').click();
    await page.locator('#search-input').fill('hiddenneedle');
    await page.waitForFunction(() => document.querySelectorAll('a.sdlg-subhit').length === 1);
    await page.locator('a.sdlg-subhit').click();
    await page.waitForFunction(() => !document.querySelector('#search-dialog').open);
    await checkRevealed();
    // Japanese text is found from the middle of a word and by one character.
    for (const query of ['れた見', '隠']) {
      await page.locator('.hdr-search [data-search-open]').click();
      await page.locator('#search-input').fill(query);
      await page.waitForFunction(() => document.querySelectorAll('a.sdlg-subhit').length === 1);
      assert.equal(await page.locator('a.sdlg-subhit .sdlg-subhit-title').textContent(), '隠れた見出し', query);
      await page.locator('#search-input').press('Escape');
    }
    assert.deepEqual(errors, []); assert.deepEqual(missing, []);
    console.log(language + ': real index article count, heading navigation and Japanese PASS');
  } finally { await context.close(); }
}

(async () => {
  execFileSync(process.env.NOTEY_HUGO || 'hugo', ['--source', work, '--cacheDir', path.join(work, 'cache'), '--minify', '--panicOnWarning'], { stdio: 'inherit' });
  const browser = await chromium.launch({ ...(process.env.NOTEY_BROWSER ? { executablePath: process.env.NOTEY_BROWSER } : {}), headless: true });
  try {
    for (const language of ['ja', 'en']) { await mockChecks(browser, language); await realChecks(browser, language); }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (process.env.NOTEY_KEEP_TEST_OUTPUT) console.log('Test output retained at ' + work);
  else fs.rmSync(work, { recursive: true, force: true });
});
