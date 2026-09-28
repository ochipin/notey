---
draft: false
title: Notey
params:
  hero:
    eyebrow: Hugo theme v2
    title: Collect, organize, and <em>find your documentation</em>
    lead: A documentation theme for Hugo with MiniSearch full-text search, multilingual support, version switching, and dark mode built in.
    image: /favicon.png
    imageAlt: A squirrel reading a book
---

{{< hero >}}
{{< actions >}}
{{< button href="/guides/getting-started/" primary=true arrow=true >}}Get started{{< /button >}}
{{< button href="https://github.com/ochipin/notey" >}}GitHub{{< /button >}}
{{< /actions >}}

{{< command >}}hugo mod get github.com/ochipin/notey{{< /command >}}
{{< /hero >}}

{{< specs >}}
{{< spec value="v0.166+" >}}Hugo (extended not required){{< /spec >}}
{{< spec value="0" >}}npm dependencies (no build step){{< /spec >}}
{{< spec value="ja / en" >}}Bundled language files{{< /spec >}}
{{< spec value="22" >}}Shortcodes{{< /spec >}}
{{< /specs >}}

{{< section title="What your documentation needs" >}}
{{< card-grid variant="feature" >}}

{{< card title="MiniSearch full-text search" icon="search" href="/guides/search/" >}}
Open the search dialog with Ctrl / ⌘ + K. It supports Japanese word segmentation, and Hugo generates the search data automatically.
{{< /card >}}

{{< card title="Large images, handled for you" icon="overview" href="/reference/images/" >}}
Images automatically fit the content column and get a WebP srcset. Click to view the original in a lightbox, without adding horizontal scrolling to the page.
{{< /card >}}

{{< card title="A navigation drawer on mobile" icon="menu" >}}
The header, sidebar, and table of contents have been redesigned. On narrow screens, navigation moves into a drawer that closes automatically when you select a link.
{{< /card >}}

{{< card title="Languages and versions" icon="translate" >}}
Organize translations in /ja/ and /en/ subdirectories, and switch documentation versions from the header.
{{< /card >}}

{{< card title="Light and dark modes" icon="brightness" >}}
The theme follows your system preference on the first visit, then remembers your choice. Code highlighting and Mermaid diagrams switch colors too.
{{< /card >}}

{{< card title="Keep writing the way you know" icon="code" >}}
Keep using familiar v1 shortcodes such as note, tips, warning, card, tab, and details.
{{< /card >}}

{{< /card-grid >}}
{{< /section >}}

{{< section >}}
{{< columns layout="wide-right" align="center" >}}
{{< column >}}

## Readable pages with just Markdown

Shortcodes and numbered lists turn your Markdown into neatly formatted pages.

{{< checklist >}}
- Numbered lists automatically appear as steps
- Code blocks include a language label and a copy button
- A table of contents is generated from h2 and h3 headings and shown on the right
{{< /checklist >}}

[Learn more →](/reference/shortcodes/)

{{< /column >}}
{{< column >}}

````markdown
## Installation

1. Get the module
   ```bash
   hugo mod tidy
   ```
2. Start the server

{{</* tips */>}}
Set enableGitInfo: true to show the last update time from Git.
{{</* /tips */>}}

![Screenshot](screenshot.png "Click to enlarge")
````

{{< /column >}}
{{< /columns >}}
{{< /section >}}

{{< section variant="cta" title="Publish a documentation site in five minutes" >}}

Use Hugo Modules or place the theme directly in the themes/ directory.

{{< actions >}}
{{< button href="/guides/getting-started/" primary=true >}}Read the setup guide{{< /button >}}
{{< button href="/reference/shortcodes/" >}}Browse shortcodes{{< /button >}}
{{< /actions >}}
{{< /section >}}
