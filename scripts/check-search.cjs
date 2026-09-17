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

async function contextFor(browser, mock) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 950 } });
  const errors = [], missing = [];
  await context.addInitScript(() => {
    window.__searchTest = { queries: {}, calls: [], rows: [], pending: [], completed: [], release: {}, clicks: [] };
  });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || !url.pathname.startsWith(prefix + '/')) {
      missing.push(url.href); return route.abort();
    }
    if (mock && url.pathname === prefix + '/pagefind/pagefind.js') return route.fulfill({ path: path.join(fixture, 'mock-pagefind.js'), contentType: 'text/javascript' });
    let file = path.join(output, decodeURIComponent(url.pathname.slice(prefix.length)));
    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { missing.push(url.href); return route.abort(); }
    return route.fulfill({ path: file, contentType: mime[path.extname(file)] || 'application/octet-stream' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, errors, missing };
}

async function mockChecks(browser, language) {
  const { context, page, errors, missing } = await contextFor(browser, true);
  try {
    await page.goto(origin + prefix + '/' + language + '/');
    const input = page.locator('#search-input');
    const more = page.locator('#search-more');
    const summary = page.locator('#search-summary');
    const articles = page.locator('#search-results > .sdlg-result');
    const open = async () => {
      await page.locator('.hdr-search [data-search-open]').click();
      await page.waitForFunction(() => document.activeElement === document.querySelector('#search-input'));
    };
    const rows = count => page.waitForFunction(count => document.querySelectorAll('#search-results > .sdlg-result').length === count, count);
    const settings = (query, value) => page.evaluate(({ query, value }) => { window.__searchTest.queries[query] = value; }, { query, value });
    const pending = key => page.waitForFunction(key => window.__searchTest.pending.includes(key), key);
    const release = async key => {
      await page.evaluate(key => { window.__searchTest.release[key](); }, key);
      await page.waitForFunction(key => window.__searchTest.completed.includes(key), key);
      await page.evaluate(() => new Promise(requestAnimationFrame));
    };
    const releaseRows = async query => {
      await page.evaluate(query => {
        for (const [key, resolve] of Object.entries(window.__searchTest.release)) if (key.startsWith(query + ':row:')) resolve();
      }, query);
      await page.waitForFunction(query => window.__searchTest.pending.filter(key => key.startsWith(query + ':row:')).every(key => window.__searchTest.completed.includes(key)), query);
      await page.evaluate(() => new Promise(requestAnimationFrame));
    };
    const titles = () => page.locator('.sdlg-hit-title').allTextContents();
    const expected = (query, count) => Array.from({ length: count }, (_, i) => query + ' article ' + i);

    await open();
    await settings('normal', { holdRowsFrom: 6 });
    await input.fill('normal'); await rows(6);
    assert.equal(await summary.isVisible(), true);
    assert.match(await summary.textContent(), /13/);
    assert.deepEqual(await titles(), expected('normal', 6));
    for (let i = 0; i < 6; i++) {
      const article = articles.nth(i);
      const url = prefix + '/' + language + '/article/?query=normal&article=' + i;
      assert.equal(await article.locator('a.sdlg-hit').getAttribute('href'), url, 'Article links open the article, not its first heading');
      assert.equal(await article.locator('a.sdlg-hit').getAttribute('data-search-hit'), '');
      assert.deepEqual(await article.locator('a.sdlg-subhit').evaluateAll(links => links.map(link => link.getAttribute('href'))), ['install', 'upgrade', 'troubleshooting'].map(anchor => url + '#' + anchor));
      assert.equal(await article.locator('[data-search-hit]').count(), 4);
      assert.equal(await article.locator('a.sdlg-subhit em').count(), 0, 'Heading titles must be escaped');
      assert.match(await article.locator('a.sdlg-subhit').first().textContent(), /Install <literal>/);
      assert(!/Page-level result|Install duplicate|Empty anchor|Fourth heading/.test(await article.textContent()));
    }
    // A second click while rows are pending must not request the same batch twice.
    await more.evaluate(button => { button.click(); button.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await pending('normal:row:6'); assert.equal(await more.isDisabled(), true);
    await releaseRows('normal'); await rows(12);
    assert.match(await summary.textContent(), /13/, 'Total counts articles across all batches');
    await more.click(); await pending('normal:row:12'); await releaseRows('normal'); await rows(13);
    assert.equal(await more.isHidden(), true);
    assert.deepEqual(await titles(), expected('normal', 13));
    const fetched = await page.evaluate(() => window.__searchTest.rows.filter(key => key.startsWith('normal:')));
    assert.equal(fetched.length, 13); assert.equal(new Set(fetched).size, 13);

    await settings('plainmatch', { count: 1, noHeadings: true }); await input.fill('plainmatch'); await rows(1);
    assert.equal(await articles.first().locator('a.sdlg-hit').isVisible(), true);
    assert.equal(await articles.first().locator('a.sdlg-subhit').count(), 0);
    assert.match(await summary.textContent(), language === 'en' ? /1 article found/ : /1/);
    assert.equal(await more.isHidden(), true);

    await settings('empty', { count: 0 }); await input.fill('empty');
    await page.waitForFunction(() => window.__searchTest.calls.includes('empty') && !document.querySelector('#search-status').hidden && !document.querySelector('#search-results').children.length);
    assert.equal(await more.isHidden(), true);
    assert.equal(await summary.isVisible(), true);
    assert.match(await summary.textContent(), /0/);
    assert(!/13/.test(await summary.textContent()), 'Zero results must not retain the previous count');
    assert.match(await page.locator('#search-status').textContent(), language === 'ja' ? /見つかりません|ありません/ : /No results/);

    await settings('heldsearch', { holdSearch: true }); await input.fill('heldsearch'); await pending('heldsearch:search');
    await input.fill('fresh'); await rows(6); await release('heldsearch:search');
    assert.deepEqual(await titles(), expected('fresh', 6), 'Stale API response must not replace the new query');

    await settings('heldbatch', { holdRowsFrom: 6 }); await input.fill('heldbatch'); await rows(6); await more.click(); await pending('heldbatch:row:6');
    await input.fill('newbatch'); await rows(6); await releaseRows('heldbatch');
    assert.deepEqual(await titles(), expected('newbatch', 6), 'Stale load-more results must not append to the new query');

    await settings('clear', { holdRowsFrom: 0 }); await input.fill('clear'); await pending('clear:row:0'); await input.fill(''); await releaseRows('clear');
    assert.equal(await articles.count(), 0); assert.equal(await more.isHidden(), true); assert.equal(await summary.isHidden(), true);

    await settings('closing', { holdRowsFrom: 0 }); await input.fill('closing'); await pending('closing:row:0'); await input.press('Escape');
    assert.equal(await page.locator('#search-dialog').evaluate(el => el.open), false);
    await releaseRows('closing'); await open();
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
    await input.press('ArrowDown'); await input.press('ArrowDown');
    const subURL = prefix + '/' + language + '/article/?query=keys&article=0#install';
    assert.equal(await page.locator('[data-search-hit].is-active').getAttribute('href'), subURL);
    await input.press('Enter');
    assert.equal(await page.evaluate(() => window.__searchTest.clicks.at(-1)), subURL, 'Arrow selection + Enter opens a heading');
    await input.press('ArrowUp'); await input.press('Enter');
    const articleURL = prefix + '/' + language + '/article/?query=keys&article=0';
    assert.equal(await page.evaluate(() => window.__searchTest.clicks.at(-1)), articleURL, 'Arrow selection + Enter opens an article');

    await articles.first().locator('a.sdlg-hit').focus(); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), subURL, 'Tab reaches the heading link');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => window.__searchTest.clicks.at(-1)), subURL, 'Native Enter follows the focused link despite a different arrow selection');
    await page.keyboard.press('ArrowDown');
    const upgradeURL = prefix + '/' + language + '/article/?query=keys&article=0#upgrade';
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), upgradeURL, 'Arrow navigation also moves focus when a result link has focus');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => window.__searchTest.clicks.at(-1)), upgradeURL);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => window.__searchTest.clicks.at(-1)), articleURL, 'Native Enter follows the focused article link');
    await input.focus(); await input.press('Escape');
    assert.equal(await page.locator('#search-dialog').evaluate(el => el.open), false);
    assert.deepEqual(errors, []); assert.deepEqual(missing, []);
    console.log(language + ': mock counts, headings, paging, stale responses, clear/Escape and keyboard PASS');
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
    assert.equal(links.length, 3, 'Real Pagefind yields matching heading links, limited to three');
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
    assert.deepEqual(errors, []); assert.deepEqual(missing, []);
    console.log(language + ': real Pagefind article count and heading navigation PASS');
  } finally { await context.close(); }
}

(async () => {
  execFileSync(process.env.NOTEY_HUGO || 'hugo', ['--source', work, '--cacheDir', path.join(work, 'cache'), '--minify', '--panicOnWarning'], { stdio: 'inherit' });
  execFileSync(process.env.NOTEY_PAGEFIND || 'pagefind', ['--site', output], { stdio: 'inherit' });
  const browser = await chromium.launch({ ...(process.env.NOTEY_BROWSER ? { executablePath: process.env.NOTEY_BROWSER } : {}), headless: true });
  try {
    for (const language of ['ja', 'en']) { await mockChecks(browser, language); await realChecks(browser, language); }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (process.env.NOTEY_KEEP_TEST_OUTPUT) console.log('Test output retained at ' + work);
  else fs.rmSync(work, { recursive: true, force: true });
});
