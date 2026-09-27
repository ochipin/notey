#!/usr/bin/env python3
"""Check short generated image names without changing source image references.

Requires Python 3 and Hugo 0.166.0 or later. Set NOTEY_HUGO to select Hugo.
Uses only local files and Python's standard library; no browser or packages.
"""

import hashlib
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import zlib


THEME = Path(__file__).resolve().parent.parent
HUGO = os.environ.get("NOTEY_HUGO", "hugo")
LONG_NAME = "image-" + "x" * 230 + ".png"  # 240 ASCII characters, including extension.
DEEP_PAGE = "/".join(["level-" + str(i) + "-" + "d" * 48 for i in range(3)] + ["article"])


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = {}
        self.zoom = None
        self.og = None
        self.canonical = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "button" and "data-lbx" in attrs:
            self.zoom = attrs["data-lbx"]
        if tag == "img" and attrs.get("alt", "").startswith("fixture-"):
            attrs["lightbox"] = self.zoom
            self.images[attrs["alt"]] = attrs
        if tag == "meta" and attrs.get("property") == "og:image":
            assert self.og is None, "Duplicate og:image"
            self.og = attrs["content"]
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs["href"]

    def handle_endtag(self, tag):
        if tag == "button":
            self.zoom = None


def png(width, height, color):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    # An unfiltered, solid RGB PNG is enough to detect cross-bundle collisions.
    pixels = (b"\x00" + bytes(color) * width) * height
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(pixels)) + chunk(b"IEND", b""))


def write(work, relative, data):
    path = work / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data, bytes):
        path.write_bytes(data)
    else:
        path.write_text(data, encoding="utf-8")
    return path


def article(work, relative, title, body="Some content."):
    write(work, "content/" + relative,
          json.dumps({"title": title, "draft": False}) + "\n\n" + body + "\n")


def published(work, url, prefix):
    parsed = urlsplit(url)
    assert not parsed.netloc or parsed.netloc == "notey.test", url
    path = unquote(parsed.path)
    assert path.startswith(prefix), (url, prefix)
    path = work / "public" / path.removeprefix(prefix)
    assert path.is_file(), f"Missing published image: {url} -> {path}"
    return path


def read_page(work, relative):
    parser = PageParser()
    parser.feed((work / "public" / relative / "index.html").read_text(encoding="utf-8"))
    return parser


def suffix(url):
    parsed = urlsplit(url)
    return parsed.query, parsed.fragment


def short_generated(work, url, prefix):
    path = published(work, url, prefix)
    relative = path.relative_to(work / "public")
    # Leave room for Hugo's processing suffix without fixing its hash algorithm.
    assert len(relative.as_posix()) <= 160, f"Generated path is too long: {relative}"
    assert len(path.name) <= 120, f"Generated filename is too long: {path.name}"
    assert LONG_NAME not in str(relative), relative
    return path


def check(mode, languages, prefix):
    work = Path(tempfile.mkdtemp(prefix="notey-image-paths-"))
    success = False
    try:
        config = {
            "baseURL": "https://notey.test" + prefix,
            "title": "Image regression",
            "theme": THEME.name,
            "themesDir": str(THEME.parent),
            "resourceDir": str(work / "resources"),
            "defaultContentLanguage": "ja",
            "defaultContentLanguageInSubdir": len(languages) > 1,
            "languages": {language: {"locale": "ja-JP" if language == "ja" else "en-US"}
                          for language in languages},
            "params": {"fonts": {"google": False}, "images": {"maxWidth": 1440}},
        }
        write(work, "hugo.json", json.dumps(config))
        write(work, "assets/og/base.png", png(1200, 630, (245, 245, 245)))
        font = THEME / "static/vendor/katex/0.18.4/fonts/KaTeX_Main-Regular.ttf"
        write(work, "assets/fonts/og.ttf", font.read_bytes())

        originals = {}
        for page, color in [(DEEP_PAGE, (230, 30, 30)), ("other/article", (30, 30, 230))]:
            originals[page] = png(1600, 800, color)
            write(work, f"content/{page}/{LONG_NAME}", originals[page])
            write(work, f"content/{page}/small.png", png(64, 32, color))
            for language in languages:
                body = (
                    f"![fixture-inline]({LONG_NAME}?download=1&v=2#inline)\n\n"
                    f"![fixture-wide]({LONG_NAME}?v=3#wide)\n\n"
                    f"![fixture-fragment]({LONG_NAME}?v=4#original-fragment)\n\n"
                    "![fixture-small](small.png?v=5#pixel)\n\n"
                    f"![fixture-global](shared/{LONG_NAME}?v=6#inline)\n"
                )
                article(work, f"{page}/index.{language}.md", f"Article {language}", body)
        asset_bytes = png(1600, 800, (30, 190, 60))
        write(work, f"assets/shared/{LONG_NAME}", asset_bytes)
        for language in languages:
            article(work, f"_index.{language}.md", f"Home {language}")
            # anchorize produces the same old OGP filename for these distinct URLs.
            article(work, f"a/b/index.{language}.md", f"Nested {language}")
            article(work, f"ab/index.{language}.md", f"Flat {language}")

        source_files = {path: path.read_bytes()
                        for path in (work / "content").rglob("*") if path.is_file()}
        snapshots = []
        for build in range(2):
            result = subprocess.run(
                [HUGO, "--source", str(work), "--cacheDir", str(work / "cache"),
                 "--cleanDestinationDir", "--panicOnWarning"], capture_output=True, text=True,
            )
            assert result.returncode == 0, result.stdout + result.stderr
            snapshot = {}
            og_urls = set()
            for language in languages:
                language_path = language + "/" if len(languages) > 1 else ""
                display_by_page = {}
                for page in [DEEP_PAGE, "other/article", "a/b", "ab", ""]:
                    rendered = read_page(work, language_path + page)
                    og = short_generated(work, rendered.og, prefix)
                    assert urlsplit(rendered.og).path.startswith(prefix + "og/"), rendered.og
                    assert rendered.og not in og_urls, (mode, "OGP URL collision", rendered.og)
                    og_urls.add(rendered.og)
                    snapshot[(language, page, "og")] = (rendered.og, hashlib.sha256(og.read_bytes()).hexdigest())
                    if page not in originals:
                        continue
                    assert set(rendered.images) == {
                        "fixture-inline", "fixture-wide", "fixture-fragment", "fixture-small", "fixture-global"
                    }, rendered.images
                    for name, image in rendered.images.items():
                        wanted_suffix = {
                            "fixture-inline": ("download=1&v=2", ""),
                            "fixture-wide": ("v=3", ""),
                            "fixture-fragment": ("v=4", "original-fragment"),
                            "fixture-small": ("v=5", "pixel"),
                            "fixture-global": ("v=6", ""),
                        }[name]
                        assert suffix(image["src"]) == wanted_suffix, image
                        assert suffix(image["lightbox"]) == wanted_suffix, image
                        original = published(work, image["lightbox"], prefix)
                        original_dir = "shared" if name == "fixture-global" else page
                        original_name = "small.png" if name == "fixture-small" else LONG_NAME
                        assert unquote(urlsplit(image["lightbox"]).path).endswith(
                            "/" + original_dir + "/" + original_name), image
                        if name == "fixture-small":
                            assert image["src"] == image["lightbox"], image
                            assert image["srcset"] == image["src"] + " 64w", image
                            assert original.name == "small.png", original
                            assert original.read_bytes() == (work / "content" / page / "small.png").read_bytes()
                            continue
                        assert original.name == LONG_NAME, (name, original)
                        expected = asset_bytes if name == "fixture-global" else originals[page]
                        assert original.read_bytes() == expected, (mode, page, name, "Original changed")
                        display = short_generated(work, image["src"], prefix)
                        assert image["src"] != image["lightbox"], image
                        assert (image["width"], image["height"]) == ("1440", "720"), image
                        variants = [variant.rsplit(" ", 1) for variant in image["srcset"].split(", ")]
                        assert [width for _, width in variants] == ["480w", "768w", "1024w", "1440w"], image
                        for url, _ in variants:
                            assert suffix(url) == wanted_suffix, (name, url)
                            short_generated(work, url, prefix)
                        snapshot[(language, page, name)] = (image["src"], image["srcset"],
                                                              hashlib.sha256(display.read_bytes()).hexdigest())
                        if name == "fixture-inline":
                            display_by_page[page] = (image["src"], display.read_bytes())
                first, second = display_by_page.values()
                assert first[0] != second[0] and first[1] != second[1], "Different bundle images collided"
            snapshots.append(snapshot)
            # Inspect Hugo's actual processed-image cache, not only published names.
            cached = list((work / "resources/_gen/images").rglob("*"))
            cached = [path for path in cached if path.is_file()]
            assert cached, "No processed image cache was generated"
            for path in cached:
                relative = path.relative_to(work / "resources/_gen/images")
                assert LONG_NAME not in str(relative), f"Original long name leaked into image cache: {relative}"
                assert len(relative.as_posix()) <= 180, f"Processed image cache path is too long: {relative}"
                assert all(len(part) <= 140 for part in relative.parts), relative
        assert snapshots[0] == snapshots[1], "Generated image names or bytes changed on repeat build"
        for path, expected in source_files.items():
            assert path.read_bytes() == expected, f"Source content changed: {path}"
        print(f"PASS {mode}: long names, deep bundles, responsive URLs, original links, OGP and repeat build")
        success = True
    finally:
        if success:
            shutil.rmtree(work)
        else:
            print(f"Failed fixture retained at {work}")


if __name__ == "__main__":
    print(subprocess.check_output([HUGO, "version"], text=True).strip())
    check("Japanese-only root", ["ja"], "/")
    check("Bilingual subpath", ["ja", "en"], "/review/")
