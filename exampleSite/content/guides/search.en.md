---
draft: false
title: "Search (MiniSearch)"
weight: 20
description: "Search Hugo-generated content in the browser"
params:
  icon: "search"
---

## How it works

Notey bundles [MiniSearch](https://github.com/lucaong/minisearch) 7.2.0. Hugo generates content data for each language. Opening search for the first time loads the data and library, then builds an index in the browser. Later searches reuse that index.

Japanese text is split into words with `Intl.Segmenter`, with a character-based fallback for browsers that do not support it. Search supports prefixes and requires all query words to match. A single kanji, hiragana, or katakana character can match the start of a word: for example, `数` finds `数式`. Latin letters and digits require at least two characters for prefix matching. No external CDN or search server is used.

## Build steps

```bash
hugo --minify
```

This also generates the search files. Search works with `hugo server` too. No Node.js installation or post-build indexing command is required for search.

{{< info title="Files to publish" >}}
Publish the complete Hugo output, including `search/` and `vendor/`. Search initially downloads the current language's content data, so check the download size and initial indexing time for large sites.
{{< /info >}}

## Search results

Results show the total article count and each article's title, path, and excerpt. Up to three matching headings are shown for each article, including headings whose section text contains the query.

Choose an article title to open its beginning or a heading to jump to that section. Headings inside tabs and collapsed details are supported too.

## Choose what gets indexed

Search covers article titles, descriptions, and body content. To exclude a page, set this in its front matter:

```yaml
params:
  search: false
```

To exclude part of the body, add `data-search-ignore` to that element:

```html
<div data-search-ignore>This content is excluded from search</div>
```

Existing `data-pagefind-ignore` attributes are also recognized. Navigation, footers, and credits are not included in the content data.

## Migrating from Pagefind

Remove the Pagefind command from CI or npm scripts. Ranking and matching behavior differ because the search engine has changed.

If old `static/pagefind/`, deployed `pagefind/`, or `licenses/pagefind/` files remain, they can be cleaned up after confirming the old search is no longer used. Updating the theme does not automatically delete existing generated files.

## Keyboard shortcuts

| Key | Action |
|:--|:--|
| Ctrl / ⌘ + K | Open search |
| / | Open search |
| ↑ ↓ | Navigate results |
| Enter | Open the selected result |
| Esc | Close search |
