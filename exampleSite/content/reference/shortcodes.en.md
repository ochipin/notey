---
draft: false
title: "Shortcodes"
weight: 10
description: "Notes, tabs, cards, and collapsible sections"
params:
  icon: "code"
---

## Notes

{{< info >}}
Add supplementary information here.
{{< /info >}}

{{< tips >}}
Share helpful tips here.
{{< /tips >}}

{{< warning >}}
Highlight anything that needs extra care.
{{< /warning >}}

{{< danger >}}
Warn about actions that cannot be undone.
{{< /danger >}}

GitHub-style alerts written as Markdown blockquotes (`> [!NOTE]` `> [!TIP]` `> [!IMPORTANT]` `> [!WARNING]` `> [!CAUTION]`) render in the same boxes. Text after `[!NOTE]` on the same line becomes the title.

> [!WARNING]
> A blockquote alert renders as a warning box.

> [!TIP] Custom title
> The text after `[!TIP]` is used as the title.

## Tabs

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

## Collapsible sections

```details {title="Show the full configuration"}
This is the content of a collapsible section. You can use Markdown here.
```

## Diagrams (Mermaid)

The theme includes Mermaid 12.0.0. It loads locally only on pages with diagrams, so diagrams also display offline.

```mermaid
flowchart LR
  A[content/*.md] --> B(hugo)
  B --> C[public/]
  B --> D[Search index]
```
