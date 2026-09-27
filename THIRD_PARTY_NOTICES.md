# Third-Party Notices

Notey's own code is licensed under the [MIT License](LICENSE). The icon
artwork and the font derived from it are licensed under Apache License 2.0;
the theme's MIT license does not replace those terms. Bundled diagram and
mathematics assets retain the licenses described below.

The footer and search dialog open a shared "Licenses & credits" dialog.
Its contents are loaded on demand from a fingerprinted HTML fragment in the
published `credits/` directory, one per language. Include this directory when
deploying the generated site. Each article contains only the dialog shell.
The loaded content links to the published license texts, notices, and source records for
the components below, including individual dependency notices. Notey's own
MIT license is also published as `licenses/notey/LICENSE.txt`. The dialog
does not replace the original notices or resolve distribution requirements.

## Google Material Symbols Rounded

Attribution: Google, Material Symbols.

- Project: https://github.com/google/material-design-icons
- Official guide: https://developers.google.com/fonts/docs/material_symbols
- Upstream revision: `40a7a292a79d9394157e1ea24f83d52d5e17c556` (2026-09-11)
- Upstream license: [Apache License 2.0](https://github.com/google/material-design-icons/blob/40a7a292a79d9394157e1ea24f83d52d5e17c556/LICENSE)
- Included license: [LICENSES/Apache-2.0.txt](LICENSES/Apache-2.0.txt)
- Unmodified upstream SVGs: [icons/material-symbols/svg/](icons/material-symbols/svg/)
- Source URLs, SHA-256 checksums, variants, and name/codepoint mappings:
  [icons/material-symbols/manifest.json](icons/material-symbols/manifest.json)

Every one of the 48 bundled icon glyphs is built from an official Google SVG
at the pinned revision above. These assets replace the former mixed-source
font in full; no outlines from that font are reused. Historical shape
comparisons are not the provenance record for the replacement font.

## Bundled font and modifications

- File: `static/fonts/icomoon.woff`
- Font name: Notey Material Symbols
- Generator: FontTools 4.65.0, using [scripts/build-icons.py](scripts/build-icons.py)
- Contents: 48 icons in U+E900 through U+E933, excluding U+E916, U+E917,
  U+E91D, and U+E91E
- SHA-256: `f6e1d325cb900934a863f272ecdbce89acdd0503347fbe999fcb4f989a367fb8`
- CSS names and codepoints: `assets/css/80.icons.css`

Modified by the Notey contributors on 2026-09-16: selected SVG artwork was
converted into font outlines, scaled to 1024 units per em, and transformed
from SVG coordinates to the font's upward Y axis. The font uses an ascent of
960 and a descent of -64, normalized metrics, and TrueType-compatible curves.
The glyphs were assigned Notey's existing private-use codepoints and packed
into a WOFF file. Source SVG files are preserved without modification.

The `icomoon.woff` filename and CSS family name `icomoon` are retained for
compatibility. The replacement font is generated with FontTools, not IcoMoon.
Existing icon names and aliases are retained. Proxmox (U+E916), Tux/Linux
(U+E917), Docker (U+E91D), and Windows (U+E91E) remain excluded.

## Rebuilding and checking the font

From the theme directory, with Python 3 and a virtual environment activated:

```sh
python3 -m pip install -r scripts/requirements-icons.txt
python3 scripts/build-icons.py
python3 scripts/build-icons.py --check
```

The build uses the bundled SVGs. The check runs offline and verifies the
recorded source checksums and reproducibility of the bundled font. To write
a comparison build elsewhere, use `--output /tmp/notey-check.woff`.

## Distribution

Apache License 2.0 permits use in commercial applications subject to its
terms, including preservation of the license and applicable notices. When
distributing the theme, an application containing it, or generated sites
containing the font, retain the corresponding license, attribution, and
modification notices. This does not change the MIT license of Notey's own
code or grant trademark rights.

Hugo publishes `static/fonts/NOTICE.txt`, `static/fonts/icon-sources.json`,
and `static/fonts/LICENSES/` alongside the font as `fonts/NOTICE.txt`,
`fonts/icon-sources.json`, and `fonts/LICENSES/`, relative to the site's base
URL. The published JSON preserves the per-icon source record. The license
text there is identical to the copy in `LICENSES/`. Keep these files with
redistributed copies of the font.


## Mermaid 12.0.0 and bundled dependencies

- Unmodified official ESM distribution: [static/vendor/mermaid/12.0.0/](static/vendor/mermaid/12.0.0/)
- Mermaid license: [MIT](LICENSES/Mermaid-MIT.txt)
- Complete notices and source availability: [NOTICE.txt](static/vendor/mermaid/12.0.0/NOTICE.txt)
- Exact dependency versions, source URLs, and archive checksums: [PROVENANCE.json](static/vendor/mermaid/12.0.0/PROVENANCE.json)
- Original dependency licenses and notices: [LICENSES/](static/vendor/mermaid/12.0.0/LICENSES/)

The included libraries use MIT, ISC, BSD-3-Clause, Apache-2.0, EPL-1.0,
and EPL-2.0 licenses. DOMPurify's Apache-2.0 option is used. Mermaid itself
is MIT-licensed, but that does not relicense the embedded dependencies.
ELK/elkjs and Eclipse runtime components retain their Eclipse licenses;
the notice identifies their corresponding source repositories, release
archives, additional upstream patch, and Maven source JARs. The original
upstream notices are preserved. Notey does not modify the vendor code.

## KaTeX 0.18.4 stylesheet and fonts

- Unmodified official distribution assets: [static/vendor/katex/0.18.4/](static/vendor/katex/0.18.4/)
- CSS/code: [MIT License](LICENSES/KaTeX-MIT.txt), Khan Academy and contributors
- Fonts: [SIL Open Font License 1.1](LICENSES/OFL-1.1.txt)
- Font copyright and Reserved Font Names: [FONT-NOTICES.txt](static/vendor/katex/0.18.4/FONT-NOTICES.txt)
- Scope and distribution notice: [NOTICE.txt](static/vendor/katex/0.18.4/NOTICE.txt)
- Source and checksums: [PROVENANCE.json](static/vendor/katex/0.18.4/PROVENANCE.json)

The font notices are read from the original font files rather than inferred
from the npm package's MIT license field. The fonts are unchanged. This
stylesheet matches the KaTeX version embedded in Hugo 0.166.0. Mermaid's
own bundled KaTeX JavaScript version is recorded separately in its manifest.

Hugo publishes both versioned vendor directories, including their notices,
licenses, provenance, and file manifests. Retain those files when packaging
the theme, an application using it, or a generated site. The licenses of
Notey's own source code and of each bundled component remain distinct.

## Pagefind search

- Project: https://pagefind.app/
- Reference release used by the review site: [Pagefind 1.5.2](https://github.com/Pagefind/pagefind/releases/tag/v1.5.2)
- Copyright: 2022 Pagefind
- Pagefind license: [MIT](LICENSES/Pagefind-MIT.txt)
- Published license copy: [static/licenses/pagefind/LICENSE.txt](static/licenses/pagefind/LICENSE.txt)
- Distribution notice: [NOTICE.txt](static/licenses/pagefind/NOTICE.txt)
- Additional browser runtime licenses and source records:
  [dependencies/](static/licenses/pagefind/dependencies/)

Pagefind's JavaScript, WebAssembly, and search indexes are generated by the
site builder's Pagefind command; the theme does not include its CLI or npm
runner. The license copy above is taken unchanged from the official v1.5.2
release. The additional notices identify the browser components they cover;
Pagefind's MIT license does not replace those components' licenses.

Hugo publishes `static/licenses/pagefind/` as `licenses/pagefind/`, relative
to the site's base URL. This location is separate from the generated
`pagefind/` directory, so rebuilding the index does not overwrite the notices.
The shared "Licenses & credits" dialog links to the published Pagefind notice.
Keep the notices with the search assets when distributing the generated site
or an application containing it. If you use a different Pagefind release,
check its copyright and dependency notices and update these copies to match.
Applications that package the CLI or npm runner must also keep those tools'
own license files.

### Distribution review required for a WebAssembly dependency

Pagefind 1.5.2's WebAssembly crate directly depends on
`pagefind_microjson 0.1.4`. Its official crate declares `GPL-3.0-only`,
includes the [GPLv3 license](static/licenses/pagefind/dependencies/pagefind_microjson@0.1.4/LICENCE),
and has a [source copyright header](static/licenses/pagefind/dependencies/pagefind_microjson@0.1.4/COPYRIGHT-from-source.txt)
granting GPL version 3 or later. These are original source notices, not
just package metadata. No alternative grant was found in the reviewed
upstream source and fork history; the evidence is recorded in
[SOURCES.json](static/licenses/pagefind/dependencies/SOURCES.json).

Adding license notices alone does not resolve the applicable GPL
redistribution and corresponding-source requirements for the generated
search runtime. Review those requirements before distributing it in a
site or application. This inventory also excludes Rust standard-library
components and is not a complete compliance assessment. It does not
relicense Notey's own source code.

## Checking and updating the bundled assets

Run `python3 scripts/check-vendor-assets.py` from the theme directory. The
check is offline and verifies every recorded file, all Mermaid ESM imports,
all CSS font URLs, dependency license records, and the KaTeX font notices.

Updates are deliberate: obtain the exact official npm release, verify its
archive integrity, copy its ESM import closure or CSS/font assets without
modification, audit its released source maps and any prebundled components,
and refresh all notices and manifests. Do not replace only Mermaid's entry
file or assume that a new release has the same dependencies. Match KaTeX CSS
to Hugo's embedded renderer (`hugo env`), then verify diagrams, formulae,
light/dark mode, and operation with external network requests blocked.

When a component or its notice inventory changes, update its entry and
dependency links in `layouts/_partials/credits-content.html` as well. Keep
`static/licenses/notey/LICENSE.txt` identical to the theme's `LICENSE`.
