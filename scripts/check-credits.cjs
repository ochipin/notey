const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.NOTEY_PLAYWRIGHT || 'playwright');

const theme = path.resolve(__dirname, '..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'notey-credits-'));
const output = path.join(work, 'public');
const origin = 'https://notey.test';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain' };

function build(multilingual) {
  const content = path.join(work, 'content');
  fs.rmSync(content, { recursive: true, force: true });
  fs.mkdirSync(content);
  const languages = multilingual ? ['ja', 'en'] : ['ja'];
  for (const language of languages) {
    fs.writeFileSync(path.join(content, '_index.' + language + '.md'), '---\ntitle: Credits home\ndraft: false\n---\nA home page with theme credits.\n');
    fs.writeFileSync(path.join(content, 'article.' + language + '.md'), '---\ntitle: Credits article\ndraft: false\n---\n## Introduction\n\nAn article with theme credits.\n');
  }
  const prefix = multilingual ? '/review' : '';
  const config = {
    baseURL: origin + prefix + '/', title: 'Credits regression',
    theme: path.basename(theme), themesDir: path.dirname(theme),
    defaultContentLanguage: 'ja', defaultContentLanguageInSubdir: multilingual,
    languages: Object.fromEntries(languages.map(language => [language, {
      locale: language === 'ja' ? 'ja-JP' : 'en-US', label: language === 'ja' ? '日本語' : 'English'
    }])),
    params: { fonts: { google: false } }
  };
  fs.writeFileSync(path.join(work, 'hugo.json'), JSON.stringify(config));
  execFileSync(process.env.NOTEY_HUGO || 'hugo', ['--source', work, '--cacheDir', path.join(work, 'cache'), '--cleanDestinationDir', '--minify', '--panicOnWarning'], { stdio: 'pipe' });
  assert.deepEqual(fs.readFileSync(path.join(output, 'licenses/notey/LICENSE.txt')), fs.readFileSync(path.join(theme, 'LICENSE')), 'The published Notey license is unchanged');
  return prefix;
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function check(browser, language, prefix) {
  const base = prefix + (prefix ? '/' + language : '') + '/';
  const rawArticle = fs.readFileSync(path.join(output, prefix ? language : '', 'article/index.html'), 'utf8');
  const sourceMatch = rawArticle.match(/\bdata-credits-src=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/);
  assert(sourceMatch, 'Article HTML advertises the shared credits fragment');
  const creditsURL = new URL(sourceMatch[1] || sourceMatch[2] || sourceMatch[3], origin + base).href;
  const creditsPath = new URL(creditsURL).pathname;
  assert(creditsPath.startsWith(prefix + '/'), 'Credits resource preserves the deployment prefix');
  assert(/\.[a-f0-9]{32,}\.html$/.test(creditsPath), 'Credits content is fingerprinted for safe browser caching');
  const creditsFile = path.join(output, decodeURIComponent(creditsPath.slice(prefix.length)));
  assert(fs.existsSync(creditsFile), 'The shared credits fragment is published');
  assert(!rawArticle.includes('class=credits-list') && !rawArticle.includes('class="credits-list"'), 'Article HTML omits the credits inventory');
  for (const notice of ['/licenses/notey/LICENSE.txt', '/fonts/NOTICE.txt', '/vendor/mermaid/12.0.0/LICENSE', '/licenses/pagefind/dependencies/']) {
    assert(!rawArticle.includes(notice), 'Article HTML does not embed license destinations: ' + notice);
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = [], missing = [], creditsRequests = [];
  let creditsInterceptor = null;
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || !url.pathname.startsWith(prefix + '/')) {
      missing.push(url.href); return route.abort();
    }
    if (url.pathname === prefix + '/pagefind/pagefind.js') return route.fulfill({ contentType: 'text/javascript', body: `
      export async function options() {}
      export async function init() {}
      export async function debouncedSearch(query) {
        const url = location.pathname;
        return { results: [{ data: async () => ({ url, meta: { title: 'Matching article' },
          excerpt: 'Search result for ' + query, sub_results: [{ title: 'Introduction',
          url: url + '#introduction', excerpt: query, anchor: { element: 'h2' } }] }) }] };
      }
    ` });
    if (url.href === creditsURL) {
      creditsRequests.push(url.href);
      if (creditsInterceptor) return creditsInterceptor(route);
    }
    let file = path.join(output, decodeURIComponent(url.pathname.slice(prefix.length)));
    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { missing.push(url.href); return route.abort(); }
    return route.fulfill({ path: file, contentType: mime[path.extname(file)] || 'text/plain' });
  });
  try {
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + base + 'article/');
    await page.evaluate(() => document.fonts.ready);
    const dialog = page.locator('#credits-dialog');
    const footer = page.locator('.foot-credits');
    const searchCredit = page.locator('.sdlg-credit');
    const input = page.locator('#search-input');
    const search = page.locator('#search-dialog');
    const title = page.locator('#credits-title');
    const close = dialog.locator('[data-credits-close]');
    const content = dialog.locator('.cdlg-content');
    const status = dialog.locator('.cdlg-status');
    const retry = dialog.locator('[data-credits-retry]');
    const isOpen = locator => locator.evaluate(el => el.open);
    const clickCredits = async trigger => {
      await trigger.click();
      assert.equal(await isOpen(dialog), true);
      assert(await title.evaluate(el => el === document.activeElement), 'Opening credits focuses its title');
      assert.equal(await dialog.locator('details[open]').count(), 0, 'Opening credits resets component and dependency details to the overview');
    };
    const waitForCredits = async () => {
      await page.waitForFunction(() => document.querySelectorAll('#credits-dialog .cdlg-content [data-credits-content] .credits-item').length === 5);
      assert.notEqual(await content.getAttribute('aria-busy'), 'true', 'Successful loading clears the busy state');
      assert.equal(await status.isVisible(), false, 'Loaded credits hide the loading status');
    };
    const openCredits = async trigger => { await clickCredits(trigger); await waitForCredits(); };
    const closeCredits = async (method, trigger, searchOpen) => {
      if (method === 'Escape') await page.keyboard.press('Escape');
      else if (method === 'button') await close.click();
      else await page.mouse.click(1, 1);
      await page.waitForFunction(() => !document.querySelector('#credits-dialog').open);
      await page.waitForFunction(selector => document.activeElement === document.querySelector(selector), trigger === footer ? '.foot-credits' : '.sdlg-credit');
      assert.equal(await isOpen(search), searchOpen, 'Closing credits preserves the underlying search state');
    };
    const shortcutsStayInCredits = async searchOpen => {
      for (const key of ['Control+k', '/']) {
        await page.keyboard.press(key);
        assert.equal(await isOpen(dialog), true);
        assert.equal(await isOpen(search), searchOpen);
        assert(await dialog.evaluate(el => el.contains(document.activeElement)), 'Search shortcuts do not steal credits focus');
      }
    };

    assert.equal(await dialog.count(), 1);
    assert.equal(await title.count(), 1);
    assert.equal(await dialog.getAttribute('aria-labelledby'), 'credits-title');
    assert.equal(await dialog.getAttribute('data-pagefind-ignore'), '');
    assert.equal(await page.locator('[data-pagefind-body] #credits-dialog').count(), 0, 'Credits are outside indexed article content');
    assert.equal(await footer.textContent(), language === 'ja' ? 'ライセンス・クレジット' : 'Licenses & credits');
    assert.equal(creditsRequests.length, 0, 'Page loading does not fetch credits');
    assert.equal(await content.locator('*').count(), 0, 'The initial dialog contains only an empty content placeholder');
    assert.equal(await dialog.locator('a').count(), 0, 'No credits links are embedded in the initial article DOM');
    await openCredits(footer);
    assert.equal(creditsRequests.length, 1, 'The first open fetches the shared credits fragment once');
    const items = dialog.locator('details.credits-item');
    const names = await items.locator('.credits-name').allTextContents();
    assert.deepEqual(names.map(name => name.trim()), ['Notey', 'Material Symbols Rounded', 'Mermaid', 'KaTeX', 'Pagefind']);
    for (const selector of ['.credits-purpose', '.credits-license', '.credits-toggle']) {
      const labels = await items.locator(selector).allTextContents();
      assert.equal(labels.length, 5);
      assert(labels.every(label => label.trim()), 'Each overview entry includes ' + selector);
    }
    const links = await dialog.locator('a').evaluateAll(els => els.map(el => ({ href: el.href, target: el.target, rel: el.rel })));
    let localLinks = 0;
    for (const link of links) {
      assert.equal(link.target, '_blank', 'License links preserve the current page and search');
      assert(link.rel.split(/\s+/).includes('noopener'));
      const url = new URL(link.href);
      if (url.origin !== origin) continue;
      localLinks++;
      assert(url.pathname.startsWith(prefix + '/'), 'License link preserves the deployment prefix');
      const file = path.join(output, decodeURIComponent(url.pathname.slice(prefix.length)));
      assert(fs.existsSync(file) && fs.statSync(file).isFile(), 'License links resolve to published files, not directories: ' + link.href);
    }
    assert.equal(localLinks, 129, 'All license texts and dependency notice files remain individually linked');
    assert.equal(links.length - localLinks, 5, 'Each component retains its upstream source link');

    const overview = await dialog.evaluate(el => {
      const body = el.querySelector('.cdlg-body');
      const bounds = body.getBoundingClientRect();
      const summaries = [...el.querySelectorAll('.credits-item > summary')];
      return { scrollHeight: body.scrollHeight, clientHeight: body.clientHeight,
        rowsVisible: summaries.every(summary => {
          const row = summary.getBoundingClientRect();
          return row.height > 0 && row.top >= bounds.top && row.bottom <= bounds.bottom + 1;
        }) };
    });
    assert(overview.rowsVisible && overview.scrollHeight <= overview.clientHeight + 1, 'All five collapsed entries fit the desktop dialog without scrolling');
    for (let i = 0; i < await items.count(); i++) {
      const item = items.nth(i);
      const summary = item.locator(':scope > summary');
      const detail = item.locator(':scope > .credits-detail');
      assert.equal(await detail.isVisible(), false, 'Long notices are hidden in the overview');
      await summary.focus();
      await page.keyboard.press('Enter');
      assert.equal(await isOpen(item), true, 'Keyboard opens component details');
      assert.equal(await detail.isVisible(), true);
      assert.equal(await detail.locator(':scope > .credits-links a').first().isVisible(), true, 'Expanded details expose original license links');
      await page.keyboard.press('Enter');
      assert.equal(await isOpen(item), false, 'Keyboard closes component details');
      await summary.click();
      assert.equal(await isOpen(item), true, 'Pointer opens component details');
      await summary.click();
      assert.equal(await isOpen(item), false, 'Pointer closes component details');
    }
    await closeCredits('Escape', footer, false);

    for (const method of ['Escape', 'button', 'backdrop']) {
      await openCredits(footer);
      await shortcutsStayInCredits(false);
      await closeCredits(method, footer, false);
    }
    await openCredits(footer);
    await title.focus();
    const tabStops = await dialog.locator('a,button,summary').evaluateAll(els => els.filter(el => el.checkVisibility()).length);
    assert.equal(tabStops, 6, 'Collapsed credits expose only the close button and five component summaries to keyboard navigation');
    for (let i = 0; i < tabStops + 2; i++) {
      await page.keyboard.press('Tab');
      assert(await page.evaluate(() => document.activeElement.tagName !== 'A'), 'Hidden license links are skipped by Tab');
      assert(await dialog.evaluate(el => el.contains(document.activeElement)), 'Tab stays within the top modal (step ' + i + '/' + tabStops + ', active ' + await page.evaluate(() => document.activeElement.outerHTML.slice(0, 180)) + ')');
    }
    for (let i = 0; i < tabStops + 2; i++) {
      await page.keyboard.press('Shift+Tab');
      assert(await page.evaluate(() => document.activeElement.tagName !== 'A'), 'Hidden license links are skipped by Shift+Tab');
      assert(await dialog.evaluate(el => el.contains(document.activeElement)), 'Shift+Tab stays within the top modal');
    }
    await closeCredits('Escape', footer, false);
    await page.locator('.hdr-search [data-search-open]').click();
    await input.fill('needle');
    await page.waitForFunction(() => document.querySelectorAll('#search-results > .sdlg-result').length === 1);
    const results = await page.locator('#search-results').innerHTML();
    for (const method of ['Escape', 'button', 'backdrop']) {
      await openCredits(searchCredit);
      await shortcutsStayInCredits(true);
      await closeCredits(method, searchCredit, true);
      assert.equal(await input.inputValue(), 'needle');
      assert.equal(await page.locator('#search-results').innerHTML(), results, 'Credits preserve search results and heading links');
    }

    const sizes = [{ width: 320, height: 740 }, { width: 375, height: 812 }, { width: 960, height: 900 }, { width: 1440, height: 900 }, { width: 844, height: 390 }];
    for (const color of ['light', 'dark']) {
      await page.evaluate(color => { document.documentElement.dataset.theme = color; }, color);
      for (const size of sizes) {
        await page.setViewportSize(size);
        assert.equal(await searchCredit.isVisible(), true, 'Search credits remain available on mobile');
        await openCredits(searchCredit);
        // Expanded dependency inventories exercise long filenames and body scrolling.
        await dialog.locator('details').evaluateAll(els => els.forEach(el => { el.open = true; }));
        const geometry = await dialog.evaluate(el => {
          const body = el.querySelector('.cdlg-body');
          const close = el.querySelector('[data-credits-close]').getBoundingClientRect();
          const box = el.querySelector('.cdlg-box').getBoundingClientRect();
          return { viewport: innerWidth, document: document.documentElement.scrollWidth,
            dialogOverflow: el.scrollWidth - el.clientWidth, bodyOverflow: body.scrollWidth - body.clientWidth,
            scrollable: body.scrollHeight > body.clientHeight, close: close.toJSON(), box: box.toJSON(), height: innerHeight };
        });
        const label = language + ' ' + color + ' ' + size.width + 'x' + size.height;
        assert(geometry.document <= geometry.viewport && geometry.dialogOverflow <= 1 && geometry.bodyOverflow <= 1, 'No horizontal overflow: ' + label + ' ' + JSON.stringify(geometry));
        assert(geometry.box.left >= 0 && geometry.box.right <= geometry.viewport && geometry.box.top >= 0 && geometry.box.bottom <= geometry.height + 1, 'Credits fit the viewport: ' + label);
        assert(geometry.close.top >= 0 && geometry.close.bottom <= geometry.height, 'Close control stays visible: ' + label);
        assert(geometry.scrollable, 'Long notices scroll inside the dialog: ' + label);
        await dialog.locator('.cdlg-body').evaluate(el => { el.scrollTop = el.scrollHeight; });
        assert(await dialog.locator('.cdlg-body').evaluate(el => el.scrollTop > 0));
        assert.equal(await close.isVisible(), true);
        await closeCredits('button', searchCredit, true);
        await openCredits(searchCredit);
        assert.equal(await dialog.locator('.cdlg-body').evaluate(el => el.scrollTop), 0, 'Reopened credits start at the introduction');
        if (process.env.NOTEY_CREDITS_SCREENSHOTS && language === 'ja' && prefix && color === 'light' && [320, 1440].includes(size.width)) {
          await page.screenshot({ path: path.join(process.env.NOTEY_CREDITS_SCREENSHOTS, 'notey-credits-' + size.width + '.png') });
        }
        await closeCredits('Escape', searchCredit, true);
      }
    }
    await page.keyboard.press('Escape');
    assert.equal(await isOpen(search), false, 'Search still closes independently after credits');
    assert.equal(creditsRequests.length, 1, 'Footer and search openings reuse the loaded fragment without another request');

    // Hold responses explicitly so loading, failure and close races do not depend on network timing.
    const controlledResponse = response => ({ entered: deferred(), release: deferred(), response });
    const useResponses = responses => {
      creditsInterceptor = async route => {
        const step = responses.shift();
        assert(step, 'No unexpected concurrent or duplicate credits request');
        step.entered.resolve();
        await step.release.promise;
        return route.fulfill(step.response);
      };
    };
    const assertLoading = async () => {
      assert.equal(await status.getAttribute('role'), 'status');
      assert.equal(await status.isVisible(), true, 'Loading is announced in the dialog');
      assert.equal(await content.getAttribute('aria-busy'), 'true');
      assert.equal(await retry.isVisible(), false, 'Retry is shown only after a failed request');
      assert((await status.locator('.cdlg-message').textContent()).trim(), 'Loading has a translated status message');
    };
    const assertFailure = async () => {
      await retry.waitFor({ state: 'visible' });
      assert.notEqual(await content.getAttribute('aria-busy'), 'true', 'Failures clear the busy state');
      assert.equal(await content.locator('[data-credits-content]').count(), 0, 'Failed or unrelated HTML is not inserted into the dialog');
      assert((await status.locator('.cdlg-message').textContent()).trim(), 'Failures have a readable status message');
    };
    const failure = controlledResponse({ status: 503, contentType: 'text/plain', body: 'Unavailable' });
    const fallback = controlledResponse({ status: 200, contentType: 'text/html', body: rawArticle });
    const recovered = controlledResponse({ path: creditsFile, contentType: 'text/html' });
    useResponses([failure, fallback, recovered]);
    await page.goto(origin + base + 'article/');
    assert.equal(creditsRequests.length, 1, 'Fresh article visits still do not prefetch credits');
    await page.setViewportSize({ width: 320, height: 740 });
    await clickCredits(footer);
    await failure.entered.promise;
    await assertLoading();
    const loadingMessage = await status.locator('.cdlg-message').textContent();
    failure.release.resolve();
    await assertFailure();
    assert.notEqual(await status.locator('.cdlg-message').textContent(), loadingMessage, 'Failure replaces the loading message');
    const errorGeometry = await dialog.evaluate(el => ({ width: innerWidth, document: document.documentElement.scrollWidth,
      content: el.querySelector('.cdlg-body').scrollWidth - el.querySelector('.cdlg-body').clientWidth,
      retryBottom: el.querySelector('[data-credits-retry]').getBoundingClientRect().bottom, height: innerHeight }));
    assert(errorGeometry.document <= errorGeometry.width && errorGeometry.content <= 1 && errorGeometry.retryBottom <= errorGeometry.height, 'The error and retry state fits mobile screens');
    await retry.click();
    await fallback.entered.promise;
    await assertLoading();
    fallback.release.resolve();
    await assertFailure();
    await retry.focus();
    await page.keyboard.press('Enter');
    await recovered.entered.promise;
    await assertLoading();
    recovered.release.resolve();
    await waitForCredits();
    assert(await title.evaluate(el => el === document.activeElement), 'A successful keyboard retry moves focus off the now-hidden retry control');
    assert.equal(creditsRequests.length, 4, 'HTTP failure and unrelated successful HTML each require an explicit retry');
    await closeCredits('Escape', footer, false);
    await openCredits(footer);
    assert.equal(creditsRequests.length, 4, 'A successful retry is cached for later openings');
    await closeCredits('button', footer, false);

    const delayed = controlledResponse({ path: creditsFile, contentType: 'text/html' });
    useResponses([delayed]);
    await page.goto(origin + base + 'article/');
    await clickCredits(footer);
    await delayed.entered.promise;
    await assertLoading();
    await page.keyboard.press('Tab');
    assert(await close.evaluate(el => el === document.activeElement), 'The loading state keeps its close button keyboard accessible');
    await page.keyboard.press('Tab');
    assert(await close.evaluate(el => el === document.activeElement), 'Loading does not expose hidden retry controls to Tab');
    await closeCredits('Escape', footer, false);
    await clickCredits(footer);
    await assertLoading();
    assert.equal(creditsRequests.length, 5, 'Reopening during a pending load shares the existing request');
    await closeCredits('Escape', footer, false);
    await page.keyboard.press('Control+k');
    await input.fill('after closing credits');
    await input.focus();
    delayed.release.resolve();
    await waitForCredits();
    assert.equal(await isOpen(dialog), false, 'A late response does not reopen a closed dialog');
    assert.equal(await isOpen(search), true, 'Search opened during a pending fetch remains open');
    assert(await input.evaluate(el => el === document.activeElement), 'A late response does not steal focus from the search input');
    assert.equal(await input.inputValue(), 'after closing credits');
    await page.keyboard.press('Escape');
    await openCredits(footer);
    assert.equal(creditsRequests.length, 5, 'The late response is reused when credits are next opened');
    await closeCredits('Escape', footer, false);
    creditsInterceptor = null;

    await page.goto(origin + base);
    assert.equal(await page.locator('.foot-credits').count(), 1, 'Home page also provides credits');
    assert.equal(await dialog.count(), 1, 'Home page contains exactly one shared modal');
    assert.equal(await content.locator('*').count(), 0, 'The home page also starts without embedded credits');
    assert.equal(await dialog.getAttribute('data-credits-src'), sourceMatch[1] || sourceMatch[2] || sourceMatch[3], 'Home and article pages share the same language resource');
    assert.equal(creditsRequests.length, 5, 'The home page does not prefetch the credits resource');
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    console.log(language + ' ' + (prefix || 'root') + ': lazy/cache/retry/close races, compact overview/details, notices, focus/Escape/backdrop, search preservation, light/dark 320–1440px and short viewport PASS (' + localLinks + ' local links)');
    return creditsURL;
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({ ...(process.env.NOTEY_BROWSER ? { executablePath: process.env.NOTEY_BROWSER } : {}), headless: true });
  try {
    const prefix = build(true);
    const japaneseCredits = await check(browser, 'ja', prefix);
    const englishCredits = await check(browser, 'en', prefix);
    assert.notEqual(japaneseCredits, englishCredits, 'Japanese and English use separate translated credits resources');
    await check(browser, 'ja', build(false));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (process.env.NOTEY_KEEP_TEST_OUTPUT) console.log('Test output retained at ' + work);
  else fs.rmSync(work, { recursive: true, force: true });
});
