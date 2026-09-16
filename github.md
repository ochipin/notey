repo: ochipin/notey
branch: main

## Last sync
date: 2026-09-16T05:26:00Z

### Updated in this project
- Notey を v2 として全面的に書き直し（layouts / assets / i18n / exampleSite）
- 検索を Fuse.js + search.json から Pagefind に置き換え
- 画像は自動リサイズ + WebP srcset + ライトボックス、モバイルは左ドロワー
- バージョン切替・ダークモード・Mermaid・OG 画像生成を追加
- front matter 駆動のトップページ（ヒーロー / 機能カード / CTA）を追加

## Screen map
| 画面 / 成果物 | 元にした repo ファイル |
|:--|:--|
| layouts/baseof.html, header, sidebar | layouts/baseof.html, _partials/header.html, _partials/sidebar.html, sidebar/node.html, sidebar/topics.html |
| layouts/home.html（ランディング）, assets/css/90.home.css | static/favicon.png（キャラクター）, content/_index.md |
| layouts/page.html, section.html, 404.html | layouts/page.html, home.html, section.html, 404.html |
| layouts/_partials/prev-next.html, resolve-icon.html | _partials/footer-prev-next.html, flatten-pages.html, resolve-icon.html |
| layouts/_markup/* | layouts/_default/_markup/render-image.html, render-codeblock.html |
| layouts/_shortcodes/* | layouts/shortcodes/* |
| assets/css/80.icons.css, static/fonts/icomoon.woff | assets/css/1.style.css, static/fonts/icomoon.woff |
| i18n/ja.yaml, en.yaml | i18n/ja.yaml, en.yaml |
