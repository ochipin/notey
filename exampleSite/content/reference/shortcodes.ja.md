---
draft: false
title: "ショートコード"
weight: 10
description: "ノート・タブ・カード・折り畳み"
params:
  icon: "code"
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

Markdown の引用で書く GitHub 式のアラート（`> [!NOTE]` `> [!TIP]` `> [!IMPORTANT]` `> [!WARNING]` `> [!CAUTION]`）も、同じ箱で表示します。`[!NOTE]` の続きに書いた文字は見出しになります。

> [!WARNING]
> 引用の書き方でも、注意の箱になります。

> [!TIP] 見出しを変える
> `[!TIP]` の後ろに書いた文字が見出しです。

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

Mermaid 12.0.0 をテーマに同梱しています。図があるページだけローカルから読み込み、オフラインでも表示できます。

```mermaid
flowchart LR
  A[content/*.md] --> B(hugo)
  B --> C[public/]
  B --> D[検索インデックス]
```
