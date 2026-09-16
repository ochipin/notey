# Third-Party Notices

Notey's own code is licensed under the [MIT License](LICENSE). Third-party
icons retain their upstream terms; the theme's MIT license does not relicense
them.

## Bundled icon font

- File: `static/fonts/icomoon.woff`
- Generator recorded in the font: IcoMoon
- Contents: 48 icons in U+E900 through U+E933, excluding U+E916, U+E917,
  U+E91D, and U+E91E
- SHA-256: `0263466a6a5f3ecc50677e97d1e6028599faaf501ae5cb44e8bc6ec59d2e17d0`
- CSS names and codepoints: `assets/css/80.icons.css`

The theme author reports that this font combines Material icons with other
icon sets. The original IcoMoon project, source SVGs, and upstream versions
are unavailable. This record combines the author's recollections with
comparisons of bundled glyphs against upstream SVGs on 2026-09-16. Close
outline matches are evidence of likely sources, not proof of the original
download history. Each entry distinguishes its evidence and remaining gaps.

IcoMoon is the font generator; its name alone does not establish an icon
license. See the [IcoMoon licensing FAQ](https://icomoon.io/faq).

### Google Material Icons / Material Symbols

Attribution: Google, Material Icons / Material Symbols.

- Project: https://github.com/google/material-design-icons
- License: Apache License 2.0
- Upstream license: https://github.com/google/material-design-icons/blob/master/LICENSE
- Included text: [LICENSES/Apache-2.0.txt](LICENSES/Apache-2.0.txt)

The following glyphs closely match Material Symbols Rounded SVGs:

| Theme name | Codepoint | Upstream icon | Outline overlap |
| --- | --- | --- | --- |
| `tag` | U+E901 | [loyalty](https://github.com/google/material-design-icons/blob/master/symbols/web/loyalty/materialsymbolsrounded/loyalty_24px.svg) | 99.78% |
| `tips` | U+E905 | [rocket_launch](https://github.com/google/material-design-icons/blob/master/symbols/web/rocket_launch/materialsymbolsrounded/rocket_launch_24px.svg) | 99.12% |
| `star` | U+E929 | [star_shine](https://github.com/google/material-design-icons/blob/master/symbols/web/star_shine/materialsymbolsrounded/star_shine_24px.svg) | 98.94% |
| `save` | U+E92B | [save_as](https://github.com/google/material-design-icons/blob/master/symbols/web/save_as/materialsymbolsrounded/save_as_24px.svg) | 98.66% |

The other interface icons have not been individually mapped to Google sources.

### Transformations and remaining provenance

The source artwork was selected, combined, assigned private-use codepoints,
and exported as a custom WOFF using IcoMoon. The exact original transformation
history is unavailable.

On 2026-09-16, FontTools 4.65.0 was used to subset the font, removing Proxmox
(U+E916), Tux/Linux (U+E917), Docker (U+E91D), and Windows (U+E91E). The
remaining 48 icons keep their original codepoints, outlines, and metrics.
Simple Icons and IcoMoon Free notices and license texts were removed because
all glyphs matched to those collections have been removed. IcoMoon remains
the generator of the custom font; this does not identify the remaining
glyphs as IcoMoon Free artwork.

Overlap figures above are intersection-over-union of normalized filled
outlines rasterized at 300 by 300 pixels, preserving aspect ratio. Curves were
sampled into 20 segments per curve. They measure shape similarity, not legal
provenance; small differences can arise from font conversion and rounding.

`git` (U+E91F, a branching diagram) and the remaining interface glyphs have
no confirmed per-icon source yet. The name `git` is a CSS alias,
not proof that the glyph is the Git logo. This notice records
known information and likely sources; it does not certify the license of
every glyph or label the whole mixed font as Apache-2.0, CC BY, or MIT.
Trademark rights are separate from the icon artwork licenses.

For future font exports, keep the IcoMoon project/selection file and original
SVGs with their source URLs, versions, and license notices, then update this
record and the published [font notice](static/fonts/NOTICE.txt).

## Published notices

`static/fonts/NOTICE.txt` and `static/fonts/LICENSES/` accompany the font in
Hugo output as `fonts/NOTICE.txt` and `fonts/LICENSES/`, relative to the site's
base URL. The license texts there are identical to the copies in `LICENSES/`.
Keep both sets when distributing the theme or its generated site.
