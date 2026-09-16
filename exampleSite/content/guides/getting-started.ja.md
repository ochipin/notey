---
title: "はじめる"
weight: 10
description: "Notey を Hugo サイトに導入する手順"
params:
  icon: "terminal"
---

## 必要なもの

- Hugo v0.166.0 以上（extended 不要）
- Git（更新日時の表示に使用）
- Node.js（Pagefind の実行に使用）

## インストール

Hugo Modules を使う場合:

```bash {title="terminal"}
hugo new site mydocs && cd mydocs
git init
hugo mod init github.com/you/mydocs
```

`hugo.yaml` に次を追記します。

```yaml {title="hugo.yaml"}
module:
  imports:
    - path: github.com/ochipin/notey
```

themes ディレクトリに直接置く場合は `theme: notey` を指定します。

{{< tips >}}
`enableGitInfo: true` を設定すると、記事の更新日時を Git のコミット日時から自動で表示します。
{{< /tips >}}

## 起動

1. モジュールを取得する
   ```bash
   hugo mod tidy
   ```
2. 開発サーバを起動する
   ```bash
   hugo server --bind 0.0.0.0
   ```
3. http://localhost:1313 を開く

{{< warning >}}
`markup.goldmark.parser.autoHeadingID` は `true`（既定）のままにしてください。見出しの ID が目次とアンカーリンクに必要です。
{{< /warning >}}
