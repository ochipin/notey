#!/usr/bin/env python3
"""Build small Hugo sites and check flattened pages and previous/next links.

Run with Python 3 and Hugo 0.166.0 or later. Set NOTEY_HUGO to select Hugo.
No browser, Node.js packages, or network access is needed.
"""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from html.parser import HTMLParser


THEME = Path(__file__).resolve().parent.parent
HUGO = os.environ.get("NOTEY_HUGO", "hugo")
PREFIX = "/review/"


class PagerParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.pagers = 0
        self.links = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        if tag == "nav" and "pager" in classes:
            self.pagers += 1
        if tag == "a" and "pager-card" in classes:
            rel = attrs.get("rel")
            assert rel in ("prev", "next"), attrs
            assert rel not in self.links, f"Duplicate {rel} link"
            self.links[rel] = attrs["href"]


def content(work, file, title, weight=1):
    target = work / "content" / file
    target.parent.mkdir(parents=True, exist_ok=True)
    # JSON front matter avoids requiring a YAML package in this test.
    target.write_text(
        json.dumps({"title": title, "weight": weight, "draft": False})
        + "\n\n## A heading\n\nSome article content.\n",
        encoding="utf-8",
    )


def check(mode, languages, subdir, empty_only=False):
    work = Path(tempfile.mkdtemp(prefix="notey-pager-"))
    success = False
    try:
        config = {
            "baseURL": "https://notey.test" + PREFIX,
            "title": "Pager regression",
            "theme": THEME.name,
            "themesDir": str(THEME.parent),
            "defaultContentLanguage": "ja",
            "defaultContentLanguageInSubdir": subdir,
            "languages": {
                lang: {"locale": "ja-JP" if lang == "ja" else "en-US"}
                for lang in languages
            },
            "params": {"fonts": {"google": False}},
        }
        (work / "hugo.json").write_text(json.dumps(config), encoding="utf-8")
        # Inspect the helper's actual return values independently of the pager.
        # Accessing IsPage/RelPermalink here also rejects nested slices or nils.
        audit = work / "layouts/home.html"
        audit.parent.mkdir(parents=True)
        audit.write_text(
            '{{- $report := dict -}}'
            '{{- range site.Sections -}}'
            '{{- $pages := slice -}}'
            '{{- range partial "flatten-pages.html" . -}}'
            '{{- $pages = $pages | append (dict "url" .RelPermalink "isPage" .IsPage) -}}'
            '{{- end -}}'
            '{{- $report = merge $report (dict .RelPermalink $pages) -}}'
            '{{- end -}}'
            '{{- $report | jsonify | safeHTML -}}',
            encoding="utf-8",
        )

        expected = {}
        sections = {}
        for language in languages:
            content(work, f"_index.{language}.md", f"Home {language}")
            suffix = f".{language}.md"
            branches = [
                "empty", "empty-tree", "empty-tree/child",
                "empty-tree/child/grandchild",
            ]
            if not empty_only:
                branches += [
                    "one", "other", "docs", "docs/empty-before", "docs/empty-middle",
                    "docs/nested", "docs/nested/empty-before",
                    "docs/nested/deep", "docs/nested/deep/empty",
                    "docs/empty-after",
                    "mixed", "mixed/empty", "mixed/filled",
                ]
            sections[language] = branches
            for branch in branches:
                weight = 1 if branch.endswith("empty-before") else 80
                if branch == "docs/nested":
                    weight = 30
                elif branch == "docs/empty-middle":
                    weight = 20
                elif branch == "docs/nested/deep":
                    weight = 20
                elif branch == "mixed/empty":
                    weight = 2
                elif branch == "mixed/filled":
                    weight = 3
                content(work, f"{branch}/_index{suffix}", branch, weight)

            # Deliberately different translation order catches shared cache data.
            order = ["docs/z-first", "docs/nested/z-child", "docs/nested/deep/leaf",
                     "docs/nested/a-child", "docs/a-last"]
            if language == "en":
                order = ["docs/z-first", "docs/nested/a-child", "docs/nested/deep/leaf",
                         "docs/nested/z-child", "docs/a-last"]
            expected[language] = {"empty": [], "empty-tree": []}
            if not empty_only:
                expected[language].update({"one": ["one/only"], "other": ["other/only"], "docs": order,
                                           "mixed": ["mixed/first", "mixed/filled/last"]})
                # mixed is the minimal failing order: Page, empty section,
                # nonempty section. The final child slice became one list item.
                pages = {
                    "one/only": 1, "other/only": 1,
                    "docs/z-first": 10, "docs/a-last": 50,
                    "docs/nested/z-child": 10 if language == "ja" else 30,
                    "docs/nested/a-child": 30 if language == "ja" else 10,
                    "docs/nested/deep/leaf": 10,
                    "mixed/first": 1, "mixed/filled/last": 1,
                }
                for page, weight in pages.items():
                    content(work, page + suffix, language + " " + page, weight)

        result = subprocess.run(
            [HUGO, "--source", str(work), "--cacheDir", str(work / "cache"),
             "--cleanDestinationDir", "--panicOnWarning"],
            capture_output=True, text=True,
        )
        assert result.returncode == 0, result.stdout + result.stderr
        checks = 0
        for language in languages:
            language_path = language + "/" if subdir or language != "ja" else ""
            public = work / "public" / language_path
            base = PREFIX + language_path
            report = json.loads((public / "index.html").read_text(encoding="utf-8"))
            want_report = {
                base + section + "/": [
                    {"url": base + page + "/", "isPage": True} for page in pages
                ]
                for section, pages in expected[language].items()
            }
            assert report == want_report, (mode, language, report, want_report)
            for branch in sections[language]:
                parser = PagerParser()
                parser.feed((public / branch / "index.html").read_text(encoding="utf-8"))
                assert parser.pagers == 0 and not parser.links, (mode, language, branch, parser.links)
                checks += 1
            for pages in expected[language].values():
                for index, page in enumerate(pages):
                    parser = PagerParser()
                    parser.feed((public / page / "index.html").read_text(encoding="utf-8"))
                    want = {}
                    if index > 0:
                        want["prev"] = base + pages[index - 1] + "/"
                    if index + 1 < len(pages):
                        want["next"] = base + pages[index + 1] + "/"
                    assert parser.links == want, (mode, language, page, parser.links, want)
                    assert parser.pagers == int(bool(want)), (mode, language, page, parser.pagers)
                    checks += 1
        print(f"PASS {mode}: flattened Page values and {checks} section/article pagers")
        success = True
    finally:
        if success:
            shutil.rmtree(work)
        else:
            print(f"Failed fixture retained at {work}")


if __name__ == "__main__":
    print(subprocess.check_output([HUGO, "version"], text=True).strip())
    check("no articles", ["ja"], False, empty_only=True)
    check("Japanese only", ["ja"], False)
    check("bilingual prefixed", ["ja", "en"], True)
    check("bilingual default at root", ["ja", "en"], False)
