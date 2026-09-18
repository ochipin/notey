const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.NOTEY_PLAYWRIGHT || 'playwright');
const theme = path.resolve(__dirname, '..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'notey-offline-rendering-'));
const root = path.join(work, 'public');
const prefix = '/review';
const config = {
  baseURL: 'https://notey.test/review/', title: 'Offline rendering',
  theme: path.basename(theme), themesDir: path.dirname(theme),
  defaultContentLanguage: 'ja', defaultContentLanguageInSubdir: true,
  languages: { ja: { locale: 'ja-JP', label: '日本語' }, en: { locale: 'en-US', label: 'English' } },
  params: { fonts: { google: false } },
  markup: { highlight: { noClasses: false }, goldmark: { extensions: { passthrough: {
    enable: true, delimiters: { inline: [['\\(', '\\)']], block: [['$$', '$$'], ['\\[', '\\]']] }
  } } } }
};
fs.mkdirSync(path.join(work, 'content'));
fs.writeFileSync(path.join(work, 'hugo.json'), JSON.stringify(config));
for (const language of ['ja', 'en']) fs.copyFileSync(
  path.join(theme, 'tests/fixtures/offline-rendering/diagrams.md'), path.join(work, 'content/diagrams.' + language + '.md')
);
fs.writeFileSync(path.join(work, 'content/plain.ja.md'), '---\ntitle: Plain\ndraft: false\n---\nNo diagrams or formulas.\n');
(async () => {
  execFileSync(process.env.NOTEY_HUGO || 'hugo', ['--source', work, '--cacheDir', path.join(work, 'cache'), '--minify', '--panicOnWarning'], { stdio: 'inherit' });
  const browser = await chromium.launch({ ...(process.env.NOTEY_BROWSER ? { executablePath: process.env.NOTEY_BROWSER } : {}), headless: true });
  try {
    for (const language of ['ja', 'en']) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
      const external = [], missing = [], requested = [], errors = [];
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        requested.push(url.pathname);
        if (url.hostname !== 'notey.test') { external.push(url.href); return route.abort(); }
        if (!url.pathname.startsWith(prefix + '/')) { missing.push(url.pathname); return route.abort(); }
        let file = path.join(root, decodeURIComponent(url.pathname.slice(prefix.length)));
        if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
        if (!fs.existsSync(file)) { missing.push(url.pathname); return route.abort(); }
        const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json' };
        return route.fulfill({ path: file, contentType: mime[path.extname(file)] || 'application/octet-stream' });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('https://notey.test' + prefix + '/' + language + '/diagrams/');
      const waitForDiagrams = () => page.waitForFunction(() => {
        const diagrams = Array.from(document.querySelectorAll('pre.mermaid'));
        return diagrams.length && diagrams.every(el => ['ready','error'].includes(el.dataset.renderState));
      }, null, { timeout: 60000 });
      await waitForDiagrams();
      assert.equal(await page.locator('pre.mermaid[data-render-state="ready"]').count(), 11);
      assert.equal(await page.locator('pre.mermaid[data-render-state="error"]').count(), 1);
      assert.equal(await page.locator('.mermaid-error').count(), 1);
      assert.equal(await page.locator('pre.mermaid').last().getAttribute('data-render-state'), 'ready');
      assert(await page.locator('pre.mermaid math').count() > 0, 'Diagram math label');
      assert(await page.locator('.math .katex').count() >= 7, 'Server-rendered formulas');
      assert.equal(await page.locator('.code pre .math,.code pre math').count(), 0, 'Code examples must stay literal');
      assert.equal(await page.locator('.math--error').count(), 0);
      assert(await page.locator('.note .math').count() > 0, 'Nested shortcode math');
      assert(requested.some(url => url.includes('/vendor/katex/') && url.endsWith('.woff2')), 'Local math font loaded');
      assert(requested.some(url => url.includes('/vendor/mermaid/') && url.includes('elk')), 'Explicit ELK layout loads its local chunk');
      assert.deepEqual(external, [], 'External network requests');
      assert.deepEqual(missing, [], 'Missing bundled resource');
      assert.deepEqual(errors, [], 'Browser exceptions');

      const before = await page.locator('pre.mermaid svg').first().getAttribute('id');
      await page.locator('#theme-btn').click();
      await page.waitForFunction(oldID => document.querySelector('pre.mermaid svg').id !== oldID, before);
      await waitForDiagrams();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      const darkStyle = await page.locator('pre.mermaid svg style').first().textContent();
      await page.evaluate(() => { for(let i=0;i<7;i++) document.querySelector('#theme-btn').click(); });
      await waitForDiagrams();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      assert.notEqual(await page.locator('pre.mermaid svg style').first().textContent(), darkStyle);
      assert.equal(await page.locator('pre.mermaid[data-render-state="ready"]').count(), 11);
      const ids = await page.locator('pre.mermaid > svg').evaluateAll(els => els.map(el => el.id));
      assert.equal(new Set(ids).size, ids.length);

      await page.evaluate(() => document.fonts.ready);
      for (const width of [320, 390, 860, 1280]) {
        await page.setViewportSize({ width, height: 1000 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page overflow at ' + width);
        assert(await page.locator('.math--block').evaluateAll(els => els.every(el => el.clientWidth <= el.parentElement.clientWidth + 1)), 'Math block overflow');
        const inlineMath = await page.locator('.math--inline').evaluateAll(els => els.map(el => {
          // Detect scrollable formulas even when the OS uses invisible overlay scrollbars.
          el.scrollLeft = 10000;
          el.scrollTop = 10000;
          const style = getComputedStyle(el);
          const result = {
            formula: el.querySelector('annotation').textContent,
            scrollX: el.scrollLeft, scrollY: el.scrollTop,
            clipped: [style.overflowX, style.overflowY].some(value => ['hidden', 'clip'].includes(value))
          };
          el.scrollLeft = el.scrollTop = 0;
          return result;
        }));
        for (const formula of inlineMath) {
          assert.equal(formula.scrollX, 0, 'Inline math scrolls horizontally at ' + width + ': ' + formula.formula);
          assert.equal(formula.scrollY, 0, 'Inline math scrolls vertically at ' + width + ': ' + formula.formula);
          assert(!formula.clipped, 'Inline math must not hide overflowing glyphs');
        }
      }
      console.log(JSON.stringify({ language, status: 'PASS', diagrams: 12, checks: 'offline assets/fonts, math+diagram math, nested math, inline math without scrollbars or clipping, invalid diagram isolation, dark/rapid theme changes, responsive overflow' }));
      await context.close();
    }
    const page = await browser.newPage();
    const html = fs.readFileSync(path.join(root,'ja/plain/index.html'),'utf8');
    assert(!html.includes('katex.min.css'), 'Plain article should not load KaTeX CSS');
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      assert(!url.pathname.includes('/vendor/mermaid/'), 'Plain article loaded Mermaid');
      let file=path.join(root, url.pathname.slice(prefix.length));
      if(url.pathname.endsWith('/')) file=path.join(file,'index.html');
      if(!fs.existsSync(file)) return route.abort();
      return route.fulfill({path:file,contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'application/octet-stream'});
    });
    await page.goto('https://notey.test'+prefix+'/ja/plain/', {waitUntil:'networkidle'});
    console.log('Plain page: no Mermaid or KaTeX requests PASS');
    await page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; }).finally(() => { fs.rmSync(work, { recursive: true, force: true }); });
