# Notey v2

ドキュメント専用サイトのための Hugo テーマ。Starlight 系のレイアウト（左サイドバー + 本文 + 右目次）を、素の CSS / JavaScript だけで構成しています。

- **トップページ** — キャラクター入りのヒーロー、スペック帯、機能カード、Markdown ショーケース、CTA を front matter から組み立て
- **Pagefind 全文検索** — Ctrl/⌘ + K、`/`、キーボード操作、日本語対応
- **多言語（i18n）** — `/ja/` `/en/` のサブディレクトリ構成、言語切替
- **バージョン切替** — `params.versions` からヘッダのドロップダウンを生成
- **ライト / ダーク** — 初回は OS 設定、以降は localStorage、切替時に Mermaid も再描画
- **モバイル** — 左からのドロワー、スクリム、リンク選択で自動クローズ
- **画像** — 段幅に自動リサイズ + WebP srcset + 遅延読み込み + クリックで拡大ライトボックス
- **コードブロック** — 言語ラベル、タイトル、コピーボタン、Chroma のライト/ダーク配色
- **ショートコード** — note / tips / warning / danger / card / card-grid / tab / details / num / icon / steps / video / badge
- **Mermaid** — 図のあるページだけ遅延読み込み
- **OG 画像** — ページごとに自動生成（フォント同梱時）、または既定画像

## 必要環境

| ツール | バージョン |
|:--|:--|
| Hugo | v0.158.0 以上（extended 不要） |
| Git | 更新日時の表示（`enableGitInfo`） |
| Node.js | Pagefind の実行 |

## 導入

### Hugo Modules

```bash
hugo new site mydocs && cd mydocs
git init && hugo mod init github.com/you/mydocs
```

```yaml
module:
  imports:
    - path: github.com/ochipin/notey
```

```bash
hugo mod tidy
hugo server --bind 0.0.0.0
```

### themes/ 直置き

```bash
git submodule add https://github.com/ochipin/notey themes/notey
```

```yaml
theme: notey
```

設定の実例は `exampleSite/hugo.yaml` を参照してください。

## ビルドと検索インデックス

```bash
hugo --minify
npx -y pagefind --site public
```

Pagefind を実行しないと検索ダイアログにインデックス未生成のメッセージが表示されます（他の機能は動作します）。

## コンテンツ構成

```
content/
  _index.md                 # トップ（ドキュメント直行レイアウト）
  guides/
    _index.md               # セクション（title / icon / weight / description）
    getting-started.md
    installation/
      index.md              # ページバンドル
      screenshot.png        # 画像はページと同じ場所に置く
  reference/
    _index.md
```

### Front Matter

```yaml
title: "ページタイトル"
weight: 10            # サイドバー・前後ナビの並び順
icon: "terminal"      # 見出しとサイドバーのアイコン（未指定なら親から継承）
description: ""       # 一覧カード・OG・meta description
badge: "new"          # サイドバーに付くラベル（任意）
draft: true
```

## トップページ

`content/_index.md` の front matter でランディングを構成します（`hero` / `specs` / `features` / `showcase` / `cta`）。本文に書いた Markdown は `showcase` と `cta` の間に挿入されます。実例は `exampleSite/content/_index.ja.md` を参照してください。

```yaml
hero:
  eyebrow: "Hugo theme v2"
  title: "ドキュメントを、<em>ため込む・整理する・取り出す</em>"   # <em> は accent 色
  lead: "…"
  image: "/favicon.png"        # キャラクター画像
  install: "hugo mod get github.com/ochipin/notey"
  buttons:
    - { text: "はじめる", url: "/ja/guides/getting-started/", primary: true }
features:
  - { icon: "search", title: "…", text: "…", url: "/ja/guides/search/" }
```

front matter に `hero` を書かなければ、サイトタイトルと `params.tagline` から最小構成のヒーローを表示します。

## 主な params

| キー | 既定 | 説明 |
|:--|:--|:--|
| `params.tagline` | – | トップの説明文（hero.lead 未指定時に使用） |
| `params.character` | `/favicon.png` | ヒーローのキャラクター画像 |
| `params.logo` | `favicon` | ヘッダのロゴ画像 |
| `params.editURL` | – | 「このページを編集」のベース URL |
| `params.images.maxWidth` | `1440` | 本文画像のリサイズ上限 |
| `params.versions` | – | `[{name, url, current, label}]` |
| `params.og.default` | – | 既定の OG 画像 |
| `params.og.font` | `fonts/og.ttf` | OG 自動生成に使う TTF（assets 配下） |
| `params.fonts.google` | `true` | Google Fonts（Murecho / Source Code Pro）の読み込み |
| `params.mermaid.url` | jsDelivr | Mermaid の ESM URL |

## HuPongo のショートコード補完

`layouts/_shortcodes/` の全13種類に、説明・引数の案内、使用例、挿入用ひな形、実際の表示を撮影したプレビュー画像を同梱しています。

- 対象: `badge`、`card`、`card-grid`、`columns`、`danger`、`icon`、`info`、`num`、`steps`、`tab`、`tips`、`video`、`warning`
- `<名前>.html` の先頭 Hugo コメント: 説明と `@param` による引数の案内。
- `hupongo/shortcodes/<名前>.yaml`: `schema_version: 1`、詳細に表示する `usage`、選択時に挿入する `snippet`。
- `hupongo/shortcodes/<名前>.preview.png`: 同じ使用例を Notey の CSS・JavaScript・Material Symbols アイコンフォントで描画した、ライト配色の見本。

HuPongo の本文で `{{<` を入力し、候補の詳細を開くと確認できます。`card-grid` と `tab` のひな形は、子カードや複数タブを含みます。`card` と `columns` の本文は HTML をそのまま出力するため、使用例では `<p>` や `<div>` を使っています。

`video` の `/media/demo.webm` と `/media/demo-poster.png` は置き換え用の見本パスです。動画ファイルは同梱していないので、実際の動画・画像を `static/media/` などに配置してパスを変更してください。プレビュー画像のデモ映像は説明用に作成したものです。

説明用ファイルは Hugo のテンプレート領域の外にまとめており、除外用の `module.mounts` 設定は不要です。専用フォルダーに対応した HuPongo を利用してください。旧版の HuPongo では使用例・画像が出ない場合がありますが、通常の Hugo ビルドに影響はありません。

画像は本文領域だけを撮影した静的な見本です。文字の折り返しやフォントは閲覧環境で変わります。タブの操作や動画の再生は、実ページのプレビューで確認してください。

## v1（旧 Notey）からの移行

- ショートコード名は互換です（`info` `tips` `warning` `danger` `card` `card-grid` `tab` `num` `icon`）。`tab` の `active` 指定もそのまま使えます。
- 検索は Fuse.js + `search.json` から Pagefind に置き換わりました。`outputs.home` の `JSON` と `outputFormats.JSON` の設定は削除できます。
- `page.word.html`（Word 出力）と `outputs.page: [HTML, word]` は同梱していません。必要なら v1 の該当ファイルを `layouts/` に戻してください。
- 見出し ID を使うため `autoHeadingID: false` は外してください。
- アイコンの名前・コードポイントと `icomoon.woff` のファイル名は互換性のため維持しています。48 個すべての図形を Google 公式の Material Symbols Rounded に置き換えたため、以前と形状が変わるものがあります。`proxmox`・`tux`（`linux`）・`docker`・`windows` は配布対象に含みません。

## ライセンス

テーマ本体は [MIT](LICENSE) です。アイコンの元 SVG と、それらから生成したフォントには [Apache License 2.0](LICENSES/Apache-2.0.txt) が適用されます。48 個すべてを Google 公式の Material Symbols Rounded から取得し直し、出典が未確定だった旧フォントの図形は使用していません。

取得元のコミット、アイコンごとの URL・SHA-256・名前の対応は [manifest.json](icons/material-symbols/manifest.json)、加工内容と配布時の扱いは [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) に記録しています。`icomoon` という名前は既存の CSS とファイル名の互換性のために残しており、現在のフォント生成には FontTools を使用します。

Apache 2.0 の条件を守ることで、有料アプリへの同梱も可能です。`static/fonts/NOTICE.txt` と `static/fonts/LICENSES/` は Hugo の出力にもコピーされます。テーマ、テーマを同梱するアプリ、フォントを含む生成サイトを配布する際は、対応するライセンス原文・著作権表示・加工の記録を保持してください。
