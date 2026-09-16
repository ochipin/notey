---
title: 数式
description: ルート・分数・積分・行列を Markdown に書く方法。
draft: false
weight: 30
params:
  icon: code
---

数式は Hugo のビルド時に生成します。表示用の CSS とフォントもテーマに同梱しているため、オフラインでも表示できます。

## 単独の数式

追加設定なしで、`math` のコードフェンスを使えます。

````markdown
```math
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
```
````

```math
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
```

## 本文中の数式

この exampleSite では `passthrough` を設定済みです。本文中は `\(...\)`、独立した数式は `$$...$$` または `\[...\]` でも書けます。

例えば、距離は \(d = \sqrt{x^2 + y^2}\)、円の面積は \(S = \pi r^2\) です。

```markdown
例えば、距離は \(d = \sqrt{x^2 + y^2}\)、円の面積は \(S = \pi r^2\) です。
```

## 積分と行列

$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$

\[
A = \begin{pmatrix}1 & 2 \\ 3 & 4\end{pmatrix}
\]

{{< tips >}}
注意書きや段組みの中でも、\(\sqrt{9} = 3\) のように数式を使えます。`$500` などの通貨表記や `$HOME` などのシェル変数は通常の文字列のままです。
{{< /tips >}}
