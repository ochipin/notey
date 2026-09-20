const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.NOTEY_PLAYWRIGHT || 'playwright');

const theme = path.resolve(__dirname, '..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'notey-navigation-'));
const output = path.join(work, 'public');
const origin = 'https://notey.test';
const prefix = '/review';
const sections = Array.from({ length: 18 }, (_, i) => 'topic-' + String(i + 1).padStart(2, '0'));
const config = {
  baseURL: origin + prefix + '/', title: 'DocumentationForProgrammingAndIndependentSoftwareDevelopment',
  theme: path.basename(theme), themesDir: path.dirname(theme),
  defaultContentLanguage: 'ja', defaultContentLanguageInSubdir: true,
  languages: { ja: { locale: 'ja-JP', label: '日本語' }, en: { locale: 'en-US', label: 'English' } },
  params: { fonts: { google: false } },
  menus: { main: [
    { name: 'Custom guide', pageRef: '/topic-01/nested/article', weight: 1 },
    { name: 'External resource', url: 'https://example.com/resource', weight: 2 }
  ] }
};
function content(file, title, extra = '', body = '') {
  const target = path.join(work, 'content', file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, '---\ntitle: ' + title + '\n' + extra + '---\n' + body);
}
for (const language of ['ja', 'en']) {
  content('_index.' + language + '.md', 'Navigation home');
  sections.forEach((section, i) => content(section + '/_index.' + language + '.md',
    (language === 'ja' ? 'カテゴリと技術資料 ' : 'Category documentation ') + (i + 1), 'weight: ' + (i + 1) + '\n'));
  content('topic-01/nested/_index.' + language + '.md', 'Nested guides');
  content('topic-01/nested/article.' + language + '.md', 'Current article', 'weight: 1\ntags: [navigation]\n',
    Array.from({ length: 70 }, (_, i) => 'Paragraph ' + i + ': Enough article content to exercise page scrolling.').join('\n\n'));
  content('topic-01/nested/sibling.' + language + '.md', 'Sibling article', 'weight: 2\n');
  content('topic-02/unrelated.' + language + '.md', 'Unrelated article');
}
function build() {
  fs.writeFileSync(path.join(work, 'hugo.json'), JSON.stringify(config));
  execFileSync(process.env.NOTEY_HUGO || 'hugo', ['--source', work, '--cacheDir', path.join(work, 'cache'), '--cleanDestinationDir', '--minify', '--panicOnWarning'], { stdio: 'pipe' });
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
async function check(browser, language, customMenus) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const errors = [], missing = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    let file = path.join(output, decodeURIComponent(url.pathname.slice(prefix.length)));
    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    if (url.origin !== origin || !url.pathname.startsWith(prefix + '/') || !fs.existsSync(file)) {
      missing.push(url.href); return route.abort();
    }
    return route.fulfill({ path: file, contentType: mime[path.extname(file)] || 'application/octet-stream' });
  });
  try {
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const base = prefix + '/' + language + '/';
    const article = base + 'topic-01/nested/article/';
    const scroller = page.locator('.hdr-nav-scroll');
    const menu = page.locator('#menu-btn');
    const sidebar = page.locator('#sidebar');
    const sidebarTopics = page.locator('.sidebar-sections .topics a');
    await page.goto(origin + article);
    await page.evaluate(() => document.fonts.ready);
    assert.deepEqual(await page.locator('.hdr-sections a').evaluateAll(links => links.map(a => a.getAttribute('href'))), sections.map(section => base + section + '/'));
    assert.equal(await page.locator('.hdr-sections .is-current').getAttribute('href'), base + 'topic-01/');
    assert.equal(await page.locator('.hdr-sections .is-current').getAttribute('aria-current'), 'location');
    assert.equal(await page.locator('.tree-link[aria-current="page"]').getAttribute('href'), article);
    assert(await page.locator('.tree-group > details').first().evaluate(el => el.open), 'The current subsection stays expanded');
    assert.equal(await sidebar.locator('.tree-link').count(), 2, 'Desktop tree contains only the current top-level section');
    assert.equal(await sidebarTopics.first().isVisible(), false, 'Desktop sidebar hides the category list');
    if (customMenus) {
      assert.equal(await scroller.getByRole('link', { name: 'Custom guide', exact: true }).getAttribute('href'), article);
      assert.equal(await scroller.getByRole('link', { name: 'External resource', exact: true }).getAttribute('target'), '_blank');
    }
    for (const width of [320, 390, 860, 861, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      // Let media-query styles settle before measuring the resized layout.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, outside: [...document.querySelectorAll('body *')].filter(el => { const box = el.getBoundingClientRect(); return box.width && box.right > innerWidth + 1 && getComputedStyle(el).visibility !== 'hidden'; }).slice(0, 8).map(el => ({ selector: el.className, rect: el.getBoundingClientRect().toJSON() })) }));
      assert(overflow.width <= width, language + ': no viewport overflow at ' + width + ' ' + JSON.stringify(overflow));
      assert.equal(await menu.isVisible(), width <= 860);
      assert.equal(await scroller.isVisible(), width > 860);
      const header = await page.evaluate(() => {
        const bounds = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
        return { brand: bounds('.brand'), search: bounds('.hdr-search'), tools: bounds('.hdr-tools'), menu: bounds('#menu-btn') };
      });
      assert(header.brand.width > 0 && header.brand.right <= header.search.left + 1, 'Brand and search remain separate');
      assert(header.tools.right <= width, 'Header controls remain inside viewport');
      if (width <= 860) assert(header.menu.left >= header.search.right - 1 && header.menu.right <= width, 'Mobile menu is at the right of the header');
    }
    assert(await scroller.evaluate(el => el.scrollWidth > el.clientWidth), 'Many categories overflow inside the header scroller');
    await scroller.evaluate(el => { el.scrollLeft = 0; });
    await scroller.hover();
    await page.mouse.wheel(0, 160);
    await page.waitForFunction(() => document.querySelector('.hdr-nav-scroll').scrollLeft > 0);
    assert.equal(await page.evaluate(() => scrollY), 0, 'Consumed vertical wheel scrolls categories without scrolling the page');
    await scroller.evaluate(el => { el.scrollLeft = 0; });
    await page.mouse.wheel(180, 0);
    await page.waitForFunction(() => document.querySelector('.hdr-nav-scroll').scrollLeft >= 179);
    assert.equal(await page.evaluate(() => scrollY), 0, 'Native horizontal scrolling stays horizontal');
    await scroller.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    await page.mouse.wheel(0, 200);
    await page.waitForFunction(() => scrollY > 0);
    await scroller.evaluate(el => { el.scrollLeft = 0; });
    await page.evaluate(() => scrollTo(0, 300));
    await page.mouse.wheel(0, -150);
    await page.waitForFunction(() => scrollY < 300);
    await page.evaluate(() => scrollTo(0, 0));
    await page.locator('.brand').focus();
    for (let i = 0; i < sections.length; i++) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), base + sections[i] + '/', 'Tab reaches every category');
    }
    assert(await page.locator('.hdr-sections a').last().evaluate(el => {
      const link = el.getBoundingClientRect(), nav = el.closest('.hdr-nav-scroll').getBoundingClientRect();
      return link.right <= nav.right + 1 && link.left >= nav.left - 1;
    }), 'Keyboard focus reveals an overflowed category');
    await page.goto(origin + base + sections.at(-1) + '/');
    assert.equal(await page.locator('.hdr-sections .is-current').getAttribute('aria-current'), 'page');
    await page.waitForFunction(() => {
      const link = document.querySelector('.hdr-sections .is-current').getBoundingClientRect();
      const nav = document.querySelector('.hdr-nav-scroll').getBoundingClientRect();
      return link.left >= nav.left - 1 && link.right <= nav.right + 1;
    });
    assert.equal(await page.evaluate(() => scrollY), 0, 'Revealing the current category does not move the page');

    for (const route of ['', 'topic-01/nested/article/', 'tags/navigation/', '404.html']) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(origin + base + route);
      assert.equal(await sidebarTopics.count(), sections.length, 'Categories are available on every mobile page');
      await menu.click();
      await page.waitForFunction(() => document.querySelector('#sidebar').contains(document.activeElement));
      assert.equal(await menu.getAttribute('aria-expanded'), 'true');
      await page.waitForFunction(() => Math.abs(document.querySelector('#sidebar').getBoundingClientRect().left) < 1);
      assert.equal(await sidebarTopics.first().getAttribute('href'), base + 'topic-01/');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Open drawer fits the viewport');
      if (customMenus) assert.equal(await sidebar.getByRole('link', { name: 'Custom guide', exact: true }).getAttribute('href'), article);
      if (!route) {
        const previousTheme = await page.locator('html').getAttribute('data-theme');
        await sidebar.locator('[data-theme-toggle]').click();
        assert.notEqual(await page.locator('html').getAttribute('data-theme'), previousTheme, 'Theme control works inside the drawer');
        const picker = sidebar.locator('.picker-btn').first();
        await picker.click(); assert.equal(await picker.getAttribute('aria-expanded'), 'true');
        await page.keyboard.press('Escape');
        assert.equal(await picker.getAttribute('aria-expanded'), 'false');
        assert.equal(await menu.getAttribute('aria-expanded'), 'true', 'Escape closes a picker before closing its drawer');
      }
      await menu.focus(); await page.keyboard.press('Shift+Tab');
      assert(await page.evaluate(() => document.querySelector('#sidebar').contains(document.activeElement)), 'Shift+Tab wraps into the drawer');
      await page.keyboard.press('Tab');
      assert(await menu.evaluate(el => el === document.activeElement), 'Tab wraps back to the menu button');
      await page.keyboard.press('Escape');
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      assert(await menu.evaluate(el => el === document.activeElement), 'Escape restores menu focus');
      await menu.click();
      await page.locator('#scrim').click({ position: { x: 385, y: 30 } });
      assert.equal(await menu.getAttribute('aria-expanded'), 'false', 'Scrim closes the drawer');
      await menu.click();
      await page.setViewportSize({ width: 861, height: 900 });
      await page.waitForFunction(() => !document.body.classList.contains('nav-open'));
      if (!route || route === 'tags/navigation/' || route === '404.html') assert.equal(await sidebar.isVisible(), false, 'Plain pages have a mobile-only sidebar');
    }
    assert.deepEqual(errors, []); assert.deepEqual(missing, []);
    console.log(language + ': categories, wheel/keyboard, 320–1280px, drawer and localized links PASS' + (customMenus ? ' (custom menus)' : ' (no custom menus)'));
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({ ...(process.env.NOTEY_BROWSER ? { executablePath: process.env.NOTEY_BROWSER } : {}), headless: true });
  try {
    build();
    for (const language of ['ja', 'en']) await check(browser, language, true);
    delete config.menus; build();
    await check(browser, 'ja', false);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (process.env.NOTEY_KEEP_TEST_OUTPUT) console.log('Test output retained at ' + work);
  else fs.rmSync(work, { recursive: true, force: true });
});
