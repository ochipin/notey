---
draft: false
title: Notey
params:
  hero:
    eyebrow: Hugo theme v2
    title: ドキュメントを、<em>ため込む・整理する・取り出す</em>
    lead: Hugo のためのドキュメント専用テーマ。Pagefind の全文検索、多言語、バージョン切替、ダークモードを最初から備えています。
    image: /favicon.png
    imageAlt: 本を読むリスのキャラクター
---

{{< hero >}}
{{< actions >}}
{{< button href="/guides/getting-started/" primary=true arrow=true >}}はじめる{{< /button >}}
{{< button href="https://github.com/ochipin/notey" >}}GitHub{{< /button >}}
{{< /actions >}}

{{< command >}}hugo mod get github.com/ochipin/notey{{< /command >}}
{{< /hero >}}

{{< specs >}}
{{< spec value="v0.166+" >}}Hugo（extended 不要）{{< /spec >}}
{{< spec value="0" >}}npm 依存（ビルド不要）{{< /spec >}}
{{< spec value="ja / en" >}}同梱の言語ファイル{{< /spec >}}
{{< spec value="22" >}}ショートコード{{< /spec >}}
{{< /specs >}}

{{< section title="ドキュメントに必要なものだけ" >}}
{{< card-grid variant="feature" >}}

{{< card title="Pagefind 全文検索" icon="search" href="/guides/search/" >}}
Ctrl / ⌘ + K で開く検索ダイアログ。日本語も分割して検索でき、インデックスはビルド後に 1 コマンドで生成します。
{{< /card >}}

{{< card title="大きな画像もそのまま" icon="overview" href="/reference/images/" >}}
段幅に自動リサイズして WebP の srcset を付与。横スクロールは発生せず、クリックで原寸をライトボックス表示します。
{{< /card >}}

{{< card title="モバイルは左ドロワー" icon="menu" >}}
ヘッダ・サイドバー・目次をすべて再設計。狭い画面ではドロワーに集約し、リンクを選ぶと自動で閉じます。
{{< /card >}}

{{< card title="多言語とバージョン" icon="translate" >}}
/ja/ /en/ のサブディレクトリ構成と、ヘッダからのバージョン切替に対応します。
{{< /card >}}

{{< card title="ライト / ダーク" icon="brightness" >}}
初回は OS 設定に追従し、以降は選択を記憶。コードハイライトと Mermaid の配色も同時に切り替わります。
{{< /card >}}

{{< card title="書き味はそのまま" icon="code" >}}
note / tips / warning / card / tab / details など、v1 のショートコードをそのまま使えます。
{{< /card >}}

{{< /card-grid >}}
{{< /section >}}

{{< section >}}
{{< columns layout="wide-right" align="center" >}}
{{< column >}}

## Markdown だけで、読みやすいページに

ショートコードと数字付きリストは、書いたまま整った見た目になります。

{{< checklist >}}
- 数字付きリストは自動でステップ表示
- コードブロックに言語ラベルとコピーボタン
- 見出しから右側の目次を自動生成（h2 / h3 の階層）
{{< /checklist >}}

[詳しく読む →](/reference/shortcodes/)

{{< /column >}}
{{< column >}}

````markdown
## インストール

1. モジュールを取得する
   ```bash
   hugo mod tidy
   ```
2. サーバを起動する

{{</* tips */>}}
enableGitInfo: true で更新日時を Git から表示します。
{{</* /tips */>}}

![スクリーンショット](screenshot.png "クリックで拡大します")
````

{{< /column >}}
{{< /columns >}}
{{< /section >}}

{{< section variant="cta" title="5 分でドキュメントサイトを公開する" >}}

Hugo Modules でも themes/ 直置きでも動きます。

{{< actions >}}
{{< button href="/guides/getting-started/" primary=true >}}導入手順を読む{{< /button >}}
{{< button href="/reference/shortcodes/" >}}ショートコード一覧{{< /button >}}
{{< /actions >}}
{{< /section >}}
