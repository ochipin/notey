---
title: "画像の扱い"
weight: 20
icon: "overview"
description: "自動リサイズ・WebP・ライトボックス"
---

## 標準の挙動

本文の画像は段幅に収まるよう自動で縮小され、WebP の `srcset` が付きます。クリックすると原寸をライトボックスで表示します。横スクロールは発生しません。

```markdown
![代替テキスト](screenshot.png "キャプションになります")
```

## 幅の指定

| 書き方 | 表示 |
|:--|:--|
| `![](img.png)` | 段幅（既定） |
| `![](img.png#inline)` | 小さめ（最大 22rem） |
| `![](img.png#wide)` | 段幅より広く |

{{< tips >}}
リサイズの上限は `params.images.maxWidth` で変更できます（既定 1440px）。SVG と GIF は変換せずそのまま表示します。
{{< /tips >}}
