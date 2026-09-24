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

async function check(browser, language, prefix) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = [], missing = [];
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
    let file = path.join(output, decodeURIComponent(url.pathname.slice(prefix.length)));
    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { missing.push(url.href); return route.abort(); }
    return route.fulfill({ path: file, contentType: mime[path.extname(file)] || 'text/plain' });
  });
  try {
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const base = prefix + (prefix ? '/' + language : '') + '/';
    await page.goto(origin + base + 'article/');
    await page.evaluate(() => document.fonts.ready);
    const dialog = page.locator('#credits-dialog');
    const footer = page.locator('.foot-credits');
    const searchCredit = page.locator('.sdlg-credit');
    const input = page.locator('#search-input');
    const search = page.locator('#search-dialog');
    const title = page.locator('#credits-title');
    const close = dialog.locator('[data-credits-close]');
    const isOpen = locator => locator.evaluate(el => el.open);
    const openCredits = async trigger => {
      await trigger.click();
      assert.equal(await isOpen(dialog), true);
      assert(await title.evaluate(el => el === document.activeElement), 'Opening credits focuses its title');
      assert.equal(await dialog.locator('details[open]').count(), 0, 'Opening credits resets component and dependency details to the overview');
    };
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

    await openCredits(footer);
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
    await page.goto(origin + base);
    assert.equal(await page.locator('.foot-credits').count(), 1, 'Home page also provides credits');
    assert.equal(await dialog.count(), 1, 'Home page contains exactly one shared modal');
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    console.log(language + ' ' + (prefix || 'root') + ': compact overview/details, notices, focus/Escape/backdrop, search preservation, light/dark 320–1440px and short viewport PASS (' + localLinks + ' local links)');
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({ ...(process.env.NOTEY_BROWSER ? { executablePath: process.env.NOTEY_BROWSER } : {}), headless: true });
  try {
    const prefix = build(true);
    for (const language of ['ja', 'en']) await check(browser, language, prefix);
    await check(browser, 'ja', build(false));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (process.env.NOTEY_KEEP_TEST_OUTPUT) console.log('Test output retained at ' + work);
  else fs.rmSync(work, { recursive: true, force: true });
});
