---
draft: false
title: "検索（Pagefind）"
weight: 20
description: "ビルド後に検索インデックスを生成する"
params:
  icon: "search"
---

## 仕組み

Notey は検索 UI だけをテーマに持ち、インデックスは [Pagefind](https://pagefind.app/) が生成します。日本語も分割して検索できます。

## ビルド手順

```bash
hugo --minify
npx -y pagefind --site public
```

{{< info title="CI に入れる" >}}
GitHub Actions では `hugo` の後に `npx -y pagefind --site public` を実行するステップを追加するだけです。
{{< /info >}}

## 検索対象の指定

本文は `data-pagefind-body` が付いた領域のみが対象です。除外したい要素には `data-pagefind-ignore` を付けます。

```html
<div data-pagefind-ignore>この部分は検索対象外</div>
```

## ショートカット

| キー | 動作 |
|:--|:--|
| Ctrl / ⌘ + K | 検索を開く |
| / | 検索を開く |
| ↑ ↓ | 候補を移動 |
| Enter | 開く |
| Esc | 閉じる |
