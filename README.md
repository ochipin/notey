# Notey v2

ドキュメント専用サイトのための Hugo テーマ。Starlight 系のレイアウト（左サイドバー + 本文 + 右目次）を、素の CSS / JavaScript だけで構成しています。

- **トップページ** — ヒーロー、スペック帯、カード、段組み、CTA を Markdown とショートコードで自由に組み立て
- **Pagefind 全文検索** — Ctrl/⌘ + K、`/`、キーボード操作、日本語対応
- **多言語（i18n）** — `/ja/` `/en/` のサブディレクトリ構成、言語切替
- **バージョン切替** — `params.versions` からヘッダのドロップダウンを生成
- **ライト / ダーク** — 初回は OS 設定、以降は localStorage、切替時に Mermaid も再描画
- **モバイル** — 左からのドロワー、スクリム、リンク選択で自動クローズ
- **画像** — 段幅に自動リサイズ + WebP srcset + 遅延読み込み + クリックで拡大ライトボックス
- **コードブロック** — 言語ラベル、タイトル、コピーボタン、Chroma のライト/ダーク配色
- **ショートコード** — 注意書き・カード・タブ・手順・動画に加え、ヒーロー・段組み・ボタンなど全22種類
- **Mermaid** — 図のあるページだけ遅延読み込み
- **OG 画像** — 背景画像とフォントを配置するとページごとに自動生成、または既定画像

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

### 日本語だけで使う場合

`exampleSite/hugo.yaml` は日英の多言語サンプルです。日本語だけを `/` 以下に公開する場合は、`languages` の `en` を削除し、次のように設定してください。

```yaml
defaultContentLanguage: ja
defaultContentLanguageInSubdir: false
disableLanguages: [en]  # 同梱の英語コンテンツを公開しない
languages:
  ja:
    label: 日本語
    locale: ja-JP
    weight: 1
```

`exampleSite` の英語ファイルを残す場合は、`disableLanguages: [en]` も指定します。英語ファイルをすべて削除済みなら、この指定は不要です。

日本語だけでも `/ja/` 配下に統一したい場合は、`defaultContentLanguageInSubdir: true` にします。通常は `/` から `/ja/` へ自動転送されますが、各記事の接頭辞なし URL も同時に用意されるわけではありません。

本文の同じ言語へのリンクには、`/ja/` や `/en/` を付けず、`/guides/getting-started/` のように書きます。Markdown のリンクと `button`・`card` は、現在の言語のページを探し、Hugo が決めた公開 URL を使います。同じ記述で、日本語を直下に公開する設定なら `/guides/getting-started/`、言語別のサブディレクトリ設定なら `/ja/guides/getting-started/` になります。`baseURL` に公開先のサブディレクトリがあれば、その配下に解決します。

## ビルドと検索インデックス

```bash
hugo --minify
npx -y pagefind --site public
```

Pagefind を実行しないと検索ダイアログにインデックス未生成のメッセージが表示されます（他の機能は動作します）。

## コンテンツ構成

```
content/
  _index.md                 # トップ（本文の Markdown とショートコードで構成）
  guides/
    _index.md               # セクション（title / params.icon / weight / description）
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
description: ""       # 一覧カード・OG・meta description
draft: true
params:
  icon: "terminal"    # 見出しとサイドバーのアイコン（未指定なら親から継承）
  badge: "new"        # サイドバーに付くラベル（任意）
```

`title`・`weight`・`description`・`draft` など Hugo の標準項目は直下に置きます。`icon`・`badge`・`lead`・`image`・`private`・`open` など Notey 独自のページ設定は、すべて `params` の中に置いてください。

## トップページ

`content/_index.md` の**本文**に、表示したい順番で Markdown とショートコードを書きます。カード・表・コード・画像も本文で編集でき、ブロックを移動・追加・削除すると、そのままページ構成に反映されます。実例は [exampleSite/content/_index.ja.md](exampleSite/content/_index.ja.md) を参照してください。

キャッチコピーなど、まとめて管理したい情報だけを `params.hero` に残せます。`hero` ショートコードは、省略した引数を `params.hero` から読みます。

````markdown
---
title: "Notey"
description: "技術文書をまとめるドキュメントサイト"
params:
  hero:
    eyebrow: "Notey · Documentation theme"
    title: "技術を記録し、*知識を育てる。*"
    lead: "導入から運用まで、必要な情報をひとつに。"
    image: "/favicon.png"
    imageAlt: "本を読むキャラクター"
---

{{< hero >}}
{{< actions >}}
{{< button href="/guides/getting-started/" primary=true arrow=true >}}はじめる{{< /button >}}
{{< button href="/reference/shortcodes/" >}}表示例を見る{{< /button >}}
{{< /actions >}}
{{< command >}}hugo server{{< /command >}}
{{< /hero >}}

{{< specs >}}
{{< spec value="ja / en" >}}多言語に対応{{< /spec >}}
{{< spec value="Light / Dark" >}}配色を切り替えて比較{{< /spec >}}
{{< /specs >}}

{{< section title="必要な情報を見つける" >}}
{{< card-grid variant="feature" >}}
{{< card title="全文検索" icon="search" href="/guides/search/" >}}
**Pagefind** でドキュメント本文を検索できます。
{{< /card >}}
{{< card title="画像" icon="overview" href="/reference/images/" >}}
記事と画像を同じフォルダーで管理できます。
{{< /card >}}
{{< /card-grid >}}
{{< /section >}}

{{< section title="左右に内容を並べる" >}}
{{< columns layout="wide-right" align="center" >}}
{{< column >}}
### 編集してプレビュー

{{< checklist >}}
- 本文は Markdown で記述
- カードや図もショートコードで追加
{{< /checklist >}}

| ファイル | 用途 |
| --- | --- |
| `_index.md` | トップページ |
{{< /column >}}
{{< column >}}
```bash
hugo server
```
{{< /column >}}
{{< /columns >}}
{{< /section >}}

{{< section title="ドキュメントを書き始めよう" variant="cta" >}}
まずはサンプルの記事を開いてみてください。

{{< actions >}}
{{< button href="/guides/getting-started/" primary=true >}}ガイドを読む{{< /button >}}
{{< /actions >}}
{{< /section >}}
````

`params.hero` は任意です。`{{< hero title="見出し" lead="説明" image="/favicon.png" >}}…{{< /hero >}}` のように本文側だけで指定することもできます。見出しを省略した `hero` はページタイトルを使います。本文に `hero` を置かなければ、ヒーローを自動追加しません。

`columns` の `layout` は `equal`（均等・自動段組み）、`wide-right`（右を広く）、`wide-left`（左を広く）。`wide-right` / `wide-left` は画面幅 900px 以下で1列になります。`align="center"` で列の内容を縦方向に中央揃えできます。各 `column` の本文には通常の Markdown や他のショートコードを書けます。`card` も Markdown と従来の HTML に対応します。

使用例は `{{< ... >}}` 記法です。この記法の内側の見出しは Hugo の自動目次には含まれないため、記事の目次に載せる見出しはショートコードの外に書いてください。ページへのリンクは `/guides/` のように言語の接頭辞を省略します。`/favicon.png` など静的ファイルのパスにも言語の接頭辞は不要です。どちらもサブディレクトリ公開時には `baseURL` の配下へ解決します。

ショートコード内で同じ見出しを繰り返しても、見出しリンクが別の場所へ飛ばないように重複する ID を調整します。リンク先を明示したい場合は、`## インストール {#install-linux}` のようにページ内で一意の ID を指定できます。

以前のメタデータ中心のトップページから移行する場合、`hero` の `title`・`eyebrow`・`lead`・`image`・`imageAlt` は `params.hero` に移します。`hero.buttons`・`hero.install` は `actions` / `button` / `command`、`specs` は `specs` / `spec`、`features` は `section` / `card-grid` / `card`、`showcase` は `columns` / `column` と Markdown、`cta` は `section variant="cta"` として本文に書き直してください。旧メタデータのブロックは自動描画しません。

## 主な params

| キー | 既定 | 説明 |
|:--|:--|:--|
| `params.tagline` | – | ホームの HTML タイトルに添える短い説明 |
| `params.character` | `/favicon.png` | hero の image とページの params.hero.image を省略したときの画像 |
| `params.logo` | `favicon` | ヘッダのロゴ画像 |
| `params.editURL` | – | 「このページを編集」のベース URL |
| `params.images.maxWidth` | `1440` | 本文画像のリサイズ上限 |
| `params.versions` | – | `[{name, url, current, label}]` |
| `params.og.default` | – | 既定の OG 画像 |
| `params.og.font` | `fonts/og.ttf` | OG 自動生成に使う TTF（assets 配下） |
| `params.fonts.google` | `true` | Google Fonts（Murecho / Source Code Pro）の読み込み |
| `params.mermaid.url` | jsDelivr | Mermaid の ESM URL |

OG 画像は、ページの `params.image`、ページバンドル内の `cover`・`og`・`thumbnail` 画像、自動生成画像、`params.og.default` の順に選びます。自動生成には `assets/og/base.png` と `assets/fonts/og.ttf`（または `params.og.font` の指定先）の両方が必要です。サンプルの既定画像は同梱の `/favicon.png` を使っています。`/images/share.png` のようなサイト内パスは `baseURL` の配下に解決されます。

## HuPongo のショートコード補完

`layouts/_shortcodes/` の全22種類に、説明・引数の案内、使用例、挿入用ひな形、実際の表示を撮影したプレビュー画像を同梱しています。

- 対象: `actions`、`badge`、`button`、`card`、`card-grid`、`checklist`、`column`、`columns`、`command`、`danger`、`hero`、`icon`、`info`、`num`、`section`、`spec`、`specs`、`steps`、`tab`、`tips`、`video`、`warning`
- `<名前>.html` の先頭 Hugo コメント: 説明と `@param` による引数の案内。
- `hupongo/shortcodes/<名前>.yaml`: `schema_version: 1`、詳細に表示する `usage`、選択時に挿入する `snippet`。
- `hupongo/shortcodes/<名前>.preview.png`: 同じ使用例を Notey の CSS・JavaScript・Material Symbols アイコンフォントで描画した、ライト配色の見本。

HuPongo の本文で `{{<` を入力し、候補の詳細を開くと確認できます。`card-grid`・`columns`・`specs`・`tab` のひな形は、子要素を含みます。`spec` の候補には親の `specs` も含めています。`column` は `columns` の内側に挿入してください。`card` と `column` の本文には Markdown を使えます。既存の `card` や `columns` に書いた `<p>`・`<div>` などの HTML も引き続き利用できます。

`video` の `/media/demo.webm` と `/media/demo-poster.png` は置き換え用の見本パスです。動画ファイルは同梱していないので、実際の動画・画像を `static/media/` などに配置してパスを変更してください。プレビュー画像のデモ映像は説明用に作成したものです。

説明用ファイルは Hugo のテンプレート領域の外にまとめており、除外用の `module.mounts` 設定は不要です。専用フォルダーに対応した HuPongo を利用してください。旧版の HuPongo では使用例・画像が出ない場合がありますが、通常の Hugo ビルドに影響はありません。

画像は本文領域だけを撮影した静的な見本です。文字の折り返しやフォントは閲覧環境で変わります。タブの操作や動画の再生は、実ページのプレビューで確認してください。

テンプレートを改修するときは、説明と引数を `layouts/_shortcodes/`、表示部分を `layouts/_partials/shortcodes/blocks/` で編集します。共通の `render.html` / `emit.html` は、入れ子の子要素を再変換せず、親の Markdown だけを描画するための処理です。開始・終了タグを持つショートコードでは、入口の `.InnerDeindent` 参照も残してください。Hugo が終了タグの有無を判定するために使用します。

本文を表示するテンプレートを上書きする場合は、`.Content` の代わりに `{{ partial "render-content.html" . }}` を使ってください。ページ全体でショートコード内の見出し ID を確定し、対応する見出しリンクも調整します。

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
