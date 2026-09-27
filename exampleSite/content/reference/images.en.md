---
draft: false
title: "Working with images"
weight: 20
description: "Automatic resizing, WebP, and lightboxes"
params:
  icon: "overview"
---

## Default behavior

Images in the page body are automatically scaled down to fit the column and include a WebP `srcset`. Click an image to view it at its original size in a lightbox. Images do not cause horizontal scrolling.

Before resizing or converting an image to WebP, Notey copies it to a short name derived from its contents. Generated images and their cache files therefore do not inherit long source filenames or deeply nested paths. Source filenames and Markdown references stay unchanged, and the lightbox still opens the original image.

```markdown
![Alternative text](screenshot.png "This becomes the caption")
```

## Setting the width

| Syntax | Display |
|:--|:--|
| `![](img.png)` | Column width (default) |
| `![](img.png#inline)` | Smaller (up to 22rem) |
| `![](img.png#wide)` | Wider than the column |

{{< tips >}}
Change the maximum resize width with `params.images.maxWidth` (default: 1440px). SVG and GIF images display as they are, without conversion.
{{< /tips >}}
