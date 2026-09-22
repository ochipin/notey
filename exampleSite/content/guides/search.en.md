---
draft: false
title: "Search (Pagefind)"
weight: 20
description: "Generate a search index after building your site"
params:
  icon: "search"
---

## How it works

Notey provides the search interface, while [Pagefind](https://pagefind.app/) generates the index. Pagefind also segments Japanese text for searching.

## Build steps

```bash
hugo --minify
npx -y pagefind@1.5.2 --site public
```

{{< info title="Add search to CI" >}}
In GitHub Actions, add a step that runs `npx -y pagefind@1.5.2 --site public` after `hugo`.
{{< /info >}}

## Choose what gets indexed

Only content within the area marked with `data-pagefind-body` is indexed. Add `data-pagefind-ignore` to any elements you want to exclude.

```html
<div data-pagefind-ignore>This content is excluded from search</div>
```

## Keyboard shortcuts

| Key | Action |
|:--|:--|
| Ctrl / ⌘ + K | Open search |
| / | Open search |
| ↑ ↓ | Navigate results |
| Enter | Open the selected result |
| Esc | Close search |
