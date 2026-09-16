---
title: Diagrams and formulas
draft: false
---

## Formula

Inline \(\sqrt{x^2+y^2}\) and currency $500, $600; shell `$HOME`.

$$
x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}
$$

\[
\begin{pmatrix}1 & 2 \\ 3 & 4\end{pmatrix}
\]

```math
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
```

```markdown
\(\sqrt{x}\)
$$ \frac{1}{2} $$
```

{{< columns >}}
{{< column >}}
Inline \(\sqrt{a}\).
{{< tips >}}
$$\int_0^1 x^2\,dx = \frac{1}{3}$$
{{< /tips >}}
{{< /column >}}
{{< column >}}
$$\underbrace{a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a+a}_{\text{a deliberately wide formula}}$$
{{< /column >}}
{{< /columns >}}

## flow

```mermaid
flowchart LR
  A[入力] --> B{判定}
  B --> C[完了]
```

## sequence

```mermaid
sequenceDiagram
  Alice->>Bob: Hello
  Bob-->>Alice: OK
```

## class

```mermaid
classDiagram
  Animal <|-- Duck
  Animal : +String name
```

## er

```mermaid
erDiagram
  CUSTOMER ||--o{ ORDER : places
```

## state

```mermaid
stateDiagram-v2
  [*] --> Ready
  Ready --> Done
  Done --> [*]
```

## gantt

```mermaid
gantt
  title Release
  dateFormat YYYY-MM-DD
  section Work
  Build :a1, 2026-09-01, 3d
```

## pie

```mermaid
pie title Usage
  "A" : 60
  "B" : 40
```

## mindmap

```mermaid
mindmap
  root((Docs))
    Guide
    Reference
```

## elk

```mermaid
---
config:
  layout: elk
---
flowchart LR
  A --> B --> C
```

## math-label

```mermaid
flowchart LR
  A["$$\sqrt{x} + \frac{1}{2}$$"] --> B["Result"]
```

## broken

```mermaid
flowchart LR
  A[unclosed
```

## after-broken

```mermaid
flowchart LR
  Works --> StillWorks
```

