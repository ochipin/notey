---
draft: false
title: "Search"
weight: 20
description: "Full-text search that needs only a Hugo build"
params:
  icon: "search"
---

## How it works

Notey includes the search interface and [MiniSearch](https://github.com/lucaong/minisearch) 7.2.0, which runs the search. Hugo generates a search index for each language as JSON at build time, and the browser loads it the first time the search dialog opens. No external service is contacted.

Text without spaces between words, such as Japanese, is indexed in two-character pieces, so you can search from the middle of a word.

## Build steps

```bash
hugo --minify
```

{{< info title="No extra step" >}}
You do not need to run another command after the build. Search also works in the `hugo server` preview.
{{< /info >}}

## What gets indexed

Article titles, headings, and body text are indexed. Results show the total number of matching articles and up to three matching headings per article.

## Keyboard shortcuts

| Key | Action |
|:--|:--|
| Ctrl / ⌘ + K | Open search |
| / | Open search |
| ↑ ↓ | Navigate results |
| Enter | Open the selected result |
| Esc | Close search |
