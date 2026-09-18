# Theme regression checks

Normal theme use needs no Node.js build step. This optional maintainer check
requires Hugo 0.166.0, Node.js, Playwright and Chromium.

With Playwright installed and its Chromium downloaded, run from the theme:

```sh
node scripts/check-offline-rendering.cjs
python3 scripts/check-vendor-assets.py
node scripts/check-search.cjs
```

If the test tools are installed elsewhere, `NOTEY_PLAYWRIGHT` can point to
the Playwright or playwright-core module, `NOTEY_BROWSER` to a Chromium
executable, and `NOTEY_HUGO` to a Hugo executable. The browser defaults to
Playwright's Chromium. Nothing is installed or downloaded by these scripts.

The rendering check builds a temporary multilingual site under `/review/`.
All assets are served from the generated files using browser request routing;
external requests are blocked and fail the check. It covers local fonts and
Mermaid chunks, math and nested shortcodes, literal code, multiple diagram
types, explicit ELK, math labels, inline formulas without scrollbars or clipping,
invalid-diagram isolation, theme switching, and mobile/desktop overflow.
The intentionally invalid diagram in the fixture must show a readable error
while subsequent diagrams still render.

The temporary site is deleted after the check. The vendor check is offline
and verifies provenance records, licenses, resource references and checksums.

The search check also requires the Pagefind CLI (`pagefind` on PATH, or
`NOTEY_PAGEFIND` set to its executable). It builds a temporary multilingual
site and a real search index, then checks article counts, up to three matching
heading links per article, pagination, keyboard navigation, stale searches,
and heading navigation into tabs and collapsed details. Search requests are
also mocked to exercise asynchronous updates and empty results predictably.
