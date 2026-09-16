---
title: "ショートコード"
weight: 10
icon: "code"
description: "ノート・タブ・カード・折り畳み"
---

## ノート

{{< info >}}
補足情報を書きます。
{{< /info >}}

{{< tips >}}
知っておくと便利なことを書きます。
{{< /tips >}}

{{< warning >}}
注意が必要なことを書きます。
{{< /warning >}}

{{< danger >}}
取り返しがつかない操作の警告を書きます。
{{< /danger >}}

## タブ

{{< tab title="macOS" active="true" >}}
```bash
brew install hugo
```
{{< /tab >}}

{{< tab title="Linux" >}}
```bash
sudo dnf install hugo
```
{{< /tab >}}

{{< tab title="Windows" >}}
```powershell
winget install Hugo.Hugo.Extended
```
{{< /tab >}}

## 折り畳み

```details {title="設定の全文を表示する"}
折り畳みの中身です。Markdown がそのまま書けます。
```

## 図（Mermaid）

```mermaid
flowchart LR
  A[content/*.md] --> B(hugo)
  B --> C[public/]
  C --> D(pagefind)
  D --> E[検索インデックス]
```
