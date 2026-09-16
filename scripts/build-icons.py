#!/usr/bin/env python3
"""Build Notey's compatibility icon font from pinned, unmodified Google SVGs.

No network access is needed. Install requirements-icons.txt before running.
The build checks the source hashes and existing CSS names/codepoints, then
converts the SVG viewBoxes to a 1024-unit font with the original baseline.
"""

import argparse
from datetime import datetime
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

import fontTools
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.svgLib.path import SVGPath
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "icons/material-symbols"
MANIFEST = SOURCES / "manifest.json"
PUBLIC_MANIFEST = ROOT / "static/fonts/icon-sources.json"
REMOVED = {0xE916, 0xE917, 0xE91D, 0xE91E}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def checked_bytes(path, digest):
    data = path.read_bytes()
    require(sha256(data).hexdigest() == digest, f"Source checksum mismatch: {path}")
    return data


def build(manifest):
    spec = manifest["font"]
    upstream = manifest["upstream"]
    require(fontTools.__version__ == spec["generator_version"],
            "Install the pinned scripts/requirements-icons.txt before building.")
    for path in (ROOT / "LICENSES/Apache-2.0.txt", ROOT / "static/fonts/LICENSES/Apache-2.0.txt"):
        checked_bytes(path, upstream["license_sha256"])

    css = (ROOT / "assets/css/80.icons.css").read_text()
    aliases = {
        int(cp, 16): re.findall(r"\.icon-([\w-]+)", selectors)
        for selectors, cp in re.findall(
            r'([^\n{}]+):before\s*\{\s*content:\s*"\\([a-f0-9]+)";', css
        )
    }
    entries = sorted(manifest["icons"], key=lambda icon: int(icon["codepoint"], 16))
    mapped = {int(icon["codepoint"], 16): icon["names"] for icon in entries}
    require(len(entries) == len(mapped) == 48, "Expected 48 distinct icon codepoints.")
    require(mapped == aliases, "Manifest and CSS icon names/codepoints differ.")
    require(not REMOVED.intersection(mapped), "Removed brand codepoints must remain absent.")

    units, ascent, descent = spec["units_per_em"], spec["ascent"], spec["descent"]
    require(ascent - descent == units, "The baseline must span one em.")
    glyphs = {}
    missing = TTGlyphPen(None)
    missing.moveTo((128, 64))
    missing.lineTo((128, 832))
    missing.lineTo((896, 832))
    missing.lineTo((896, 64))
    missing.closePath()
    glyphs[".notdef"] = missing.glyph()
    glyphs["space"] = TTGlyphPen(None).glyph()
    cmap = {0x20: "space"}

    for icon in entries:
        svg = checked_bytes(SOURCES / icon["file"], icon["sha256"])
        tree = ET.fromstring(svg)
        x, y, width, height = map(float, tree.attrib["viewBox"].split())
        require(width == height and width > 0, f"Expected a square viewBox: {icon['file']}")
        scale = units / width
        pen = TTGlyphPen(None)
        quadratic = Cu2QuPen(pen, max_err=units / 1000)
        SVGPath.fromstring(svg, transform=(scale, 0, 0, -scale, -x * scale, ascent + y * scale)).draw(quadratic)
        name = f"uni{icon['codepoint']}"
        glyph = pen.glyph()
        require(glyph.numberOfContours > 0, f"Empty icon: {icon['file']}")
        glyph.recalcBounds(glyphs)
        require(0 <= glyph.xMin <= glyph.xMax <= units
                and descent <= glyph.yMin <= glyph.yMax <= ascent,
                f"Icon exceeds the font box: {icon['file']}")
        glyphs[name] = glyph
        cmap[int(icon["codepoint"], 16)] = name

    fb = FontBuilder(units, isTTF=True)
    fb.setupGlyphOrder(list(glyphs))
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    # TrueType requires the side bearing to match the drawn xMin; this keeps
    # the original SVG padding instead of shifting the icon to the left edge.
    fb.setupHorizontalMetrics({
        name: (units // 2, 0) if name == "space" else (units, glyph.xMin)
        for name, glyph in glyphs.items()
    })
    fb.setupHorizontalHeader(ascent=ascent, descent=descent, lineGap=0)
    fb.setupOS2(sTypoAscender=ascent, sTypoDescender=descent, sTypoLineGap=0,
                usWinAscent=ascent, usWinDescent=-descent, usWeightClass=400,
                usWidthClass=5, fsSelection=0x40)
    attribution = "Material Symbols by Google; licensed under Apache License, Version 2.0."
    modification = ("Converted by Notey contributors from official Material Symbols Rounded SVGs "
                    f"at revision {upstream['revision']}. Remapped to legacy Notey codepoints; "
                    "coordinates and metrics normalized; curves converted as needed; exported as WOFF.")
    fb.setupNameTable({
        "familyName": spec["family"],
        "styleName": "Regular",
        "uniqueFontIdentifier": f"NoteyMaterialSymbols-1.000-{upstream['revision']}",
        "fullName": spec["family"],
        "psName": "NoteyMaterialSymbols-Regular",
        "version": "Version 1.000",
        "copyright": attribution,
        "description": modification,
        "licenseDescription": attribution + " " + modification + " See accompanying LICENSES/Apache-2.0.txt and NOTICE.txt.",
        "licenseInfoURL": "https://www.apache.org/licenses/LICENSE-2.0",
    })
    fb.setupPost()
    fb.setupMaxp()
    stamp = int(datetime.fromisoformat(upstream["commit_date"].replace("Z", "+00:00")).timestamp()) + 2082844800
    fb.font["head"].created = fb.font["head"].modified = stamp
    fb.font.recalcTimestamp = False
    fb.font.flavor = "woff"
    output = BytesIO()
    fb.font.save(output)
    result = output.getvalue()
    restored = TTFont(BytesIO(result))
    require(restored.getBestCmap() == cmap, "Font cmap changed during serialization.")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Verify source hashes and the committed font without modifying files.")
    mode.add_argument("--output", type=Path, help="Build to another path without changing the published source manifest.")
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text())
    data = build(manifest)
    digest = sha256(data).hexdigest()
    expected = manifest["font"].get("sha256")
    if expected:
        require(digest == expected, "Built font differs from the recorded checksum.")
    destination = ROOT / manifest["font"]["path"]
    if args.check:
        require(bool(expected), "Manifest is missing the font checksum.")
        require(destination.read_bytes() == data, "Committed font is not the reproducible build.")
        require(PUBLIC_MANIFEST.read_bytes() == MANIFEST.read_bytes(), "Published icon sources differ from the source manifest.")
    else:
        target = args.output or destination
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        if not args.output:
            manifest["font"]["sha256"] = digest
            encoded = (json.dumps(manifest, indent=2, ensure_ascii=False) + "\n").encode()
            MANIFEST.write_bytes(encoded)
            PUBLIC_MANIFEST.write_bytes(encoded)
    print(json.dumps({"icons": len(manifest["icons"]), "bytes": len(data), "sha256": digest, "checked": args.check}))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        sys.exit(str(error))
