---
title: "Notey"
hero:
  eyebrow: "Hugo theme v2"
  title: "ドキュメントを、<em>ため込む・整理する・取り出す</em>"
  lead: "Hugo のためのドキュメント専用テーマ。Pagefind の全文検索、多言語、バージョン切替、ダークモードを最初から備えています。"
  image: "/favicon.png"
  imageAlt: "本を読むリスのキャラクター"
  install: "hugo mod get github.com/ochipin/notey"
  buttons:
    - text: "はじめる"
      url: "/ja/guides/getting-started/"
      primary: true
    - text: "GitHub"
      url: "https://github.com/ochipin/notey"
specs:
  - value: "v0.146+"
    key: "Hugo（extended 不要）"
  - value: "0"
    key: "npm 依存（ビルド不要）"
  - value: "ja / en"
    key: "同梱の言語ファイル"
  - value: "13"
    key: "ショートコード"
featuresTitle: "ドキュメントに必要なものだけ"
features:
  - icon: "search"
    title: "Pagefind 全文検索"
    text: "Ctrl / ⌘ + K で開く検索ダイアログ。日本語も分割して検索でき、インデックスはビルド後に 1 コマンドで生成します。"
    url: "/ja/guides/search/"
  - icon: "overview"
    title: "大きな画像もそのまま"
    text: "段幅に自動リサイズして WebP の srcset を付与。横スクロールは発生せず、クリックで原寸をライトボックス表示します。"
    url: "/ja/reference/images/"
  - icon: "menu"
    title: "モバイルは左ドロワー"
    text: "ヘッダ・サイドバー・目次をすべて再設計。狭い画面ではドロワーに集約し、リンクを選ぶと自動で閉じます。"
  - icon: "translate"
    title: "多言語とバージョン"
    text: "/ja/ /en/ のサブディレクトリ構成と、ヘッダからのバージョン切替に対応します。"
  - icon: "brightness"
    title: "ライト / ダーク"
    text: "初回は OS 設定に追従し、以降は選択を記憶。コードハイライトと Mermaid の配色も同時に切り替わります。"
  - icon: "code"
    title: "書き味はそのまま"
    text: "note / tips / warning / card / tab / details など、v1 のショートコードをそのまま使えます。"
showcase:
  title: "Markdown だけで、読みやすいページに"
  lead: "ショートコードと数字付きリストは、書いたまま整った見た目になります。"
  lang: "markdown"
  points:
    - "数字付きリストは自動でステップ表示"
    - "コードブロックに言語ラベルとコピーボタン"
    - "見出しから右側の目次を自動生成（h2 / h3 の階層）"
  url: "/ja/reference/shortcodes/"
  code: |
    ## インストール

    1. モジュールを取得する
       ```bash
       hugo mod tidy
       ```
    2. サーバを起動する

    {{< tips >}}
    enableGitInfo: true で更新日時を Git から表示します。
    {{< /tips >}}

    ![スクリーンショット](screenshot.png "クリックで拡大します")
cta:
  title: "5 分でドキュメントサイトを公開する"
  lead: "Hugo Modules でも themes/ 直置きでも動きます。"
  buttons:
    - text: "導入手順を読む"
      url: "/ja/guides/getting-started/"
      primary: true
    - text: "ショートコード一覧"
      url: "/ja/reference/shortcodes/"
---
