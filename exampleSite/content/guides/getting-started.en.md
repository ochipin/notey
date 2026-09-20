---
draft: false
title: "Getting started"
weight: 10
description: "Add Notey to your Hugo site"
params:
  icon: "terminal"
---

## Requirements

- Hugo v0.166.0 or later (the extended edition is not required)
- Git (used to display the last updated date)
- Node.js (used to run Pagefind)

## Installation

To use Hugo Modules:

```bash {title="terminal"}
hugo new site mydocs && cd mydocs
git init
hugo mod init github.com/you/mydocs
```

Add the following to `hugo.yaml`:

```yaml {title="hugo.yaml"}
module:
  imports:
    - path: github.com/ochipin/notey
```

If you place the theme directly in the `themes` directory, set `theme: notey`.

{{< tips >}}
Set `enableGitInfo: true` to automatically display each page's last updated date from its Git commit history.
{{< /tips >}}

## Start the site

1. Fetch the modules:
   ```bash
   hugo mod tidy
   ```
2. Start the development server:
   ```bash
   hugo server --bind 0.0.0.0
   ```
3. Open http://localhost:1313.

{{< warning >}}
Keep `markup.goldmark.parser.autoHeadingID` set to `true` (the default). Heading IDs are required for the table of contents and anchor links.
{{< /warning >}}
