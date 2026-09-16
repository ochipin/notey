---
title: Mathematics
description: Write roots, fractions, integrals, and matrices in Markdown.
draft: false
weight: 30
params:
  icon: code
---

Hugo renders formulas when building the site. The theme includes the stylesheet and fonts, so formulas also display offline.

## A standalone formula

Use a `math` code fence without any additional configuration:

````markdown
```math
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
```
````

```math
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
```

## Inline formulas

This exampleSite enables Hugo's `passthrough` extension. Use `\(...\)` for inline formulas, and `$$...$$` or `\[...\]` for display formulas.

The distance is \(d = \sqrt{x^2 + y^2}\), and the area of a circle is \(S = \pi r^2\).

```markdown
The distance is \(d = \sqrt{x^2 + y^2}\), and the area of a circle is \(S = \pi r^2\).
```

## Integrals and matrices

$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$

\[
A = \begin{pmatrix}1 & 2 \\ 3 & 4\end{pmatrix}
\]

{{< tips >}}
Formulas also work inside notes and columns: \(\sqrt{9} = 3\). Currency such as `$500` and shell variables such as `$HOME` remain ordinary text.
{{< /tips >}}
