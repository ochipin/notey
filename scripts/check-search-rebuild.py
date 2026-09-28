#!/usr/bin/env python3
"""Check Hugo's live search index after content-only incremental rebuilds.

Python 3 and Hugo 0.166.0 or later are enough. Set NOTEY_HUGO to select Hugo.
Only a temporary site and loopback HTTP server are used; no packages or network
services are needed. Failed fixtures and their server logs are kept for review.
"""

import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
from html.parser import HTMLParser
from urllib.error import URLError
from urllib.request import urlopen


THEME = Path(__file__).resolve().parent.parent
HUGO = os.environ.get("NOTEY_HUGO", "hugo")
PREFIX = "/review/"


class SearchDialog(HTMLParser):
    def __init__(self):
        super().__init__()
        self.index_url = None

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if tag == "dialog" and attributes.get("id") == "search-dialog":
            self.index_url = attributes.get("data-search-index")


def write_page(work, name, title, body):
    target = work / "content" / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps({"title": title, "draft": False}) + "\n\n" + body + "\n",
        encoding="utf-8",
    )
    return target


def check(disable_fast_render):
    mode = "full-render" if disable_fast_render else "fast-render"
    work = Path(tempfile.mkdtemp(prefix=f"notey-search-{mode}-"))
    process = None
    success = False
    log = None
    try:
        config = {
            "baseURL": "https://notey.test" + PREFIX,
            "title": "Live search regression",
            "theme": THEME.name,
            "themesDir": str(THEME.parent),
            "defaultContentLanguage": "ja",
            "defaultContentLanguageInSubdir": True,
            "languages": {"ja": {"locale": "ja-JP"}, "en": {"locale": "en-US"}},
            "params": {"fonts": {"google": False}},
        }
        (work / "hugo.json").write_text(json.dumps(config), encoding="utf-8")
        for language in ("ja", "en"):
            write_page(work, f"_index.{language}.md", f"Home {language}", "Welcome.")
            write_page(
                work, f"article.{language}.md", f"Article {language}",
                f"## Original heading\n\nOriginal{language}Needle.",
            )
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            port = listener.getsockname()[1]
        origin = f"http://127.0.0.1:{port}"
        arguments = [
            HUGO, "server", "--source", str(work), "--bind", "127.0.0.1",
            "--port", str(port), "--disableLiveReload", "--noHTTPCache",
        ]
        if disable_fast_render:
            arguments.append("--disableFastRender")
        log = (work / "server.log").open("w", encoding="utf-8")
        process = subprocess.Popen(arguments, stdout=log, stderr=subprocess.STDOUT)

        def read(path):
            assert path.startswith(PREFIX), f"Index escaped base path: {path}"
            with urlopen(origin + path, timeout=2) as response:
                return response.read().decode("utf-8")

        def index(language):
            parser = SearchDialog()
            parser.feed(read(f"{PREFIX}{language}/article/"))
            assert parser.index_url, "Search dialog must reference its generated index"
            return parser.index_url, json.loads(read(parser.index_url))

        def wait_for(label, predicate):
            deadline = time.monotonic() + 20
            last_error = None
            while time.monotonic() < deadline:
                assert process.poll() is None, "Hugo server exited; see server.log"
                try:
                    actual = index("ja")
                    if predicate(actual):
                        return actual
                except (URLError, TimeoutError) as error:
                    last_error = error
                time.sleep(0.1)
            raise AssertionError(f"{label} did not update the live index: {last_error}")

        before = wait_for("Initial build", lambda _: True)
        english_before = index("en")
        assert "OriginaljaNeedle" in json.dumps(before[1])
        assert "OriginalenNeedle" not in json.dumps(before[1])
        assert "OriginalenNeedle" in json.dumps(english_before[1])

        # Do not touch a template, JS asset, or config: those would invalidate
        # ExecuteAsTemplate and could hide a stale Markdown-only dependency.
        article = work / "content/article.ja.md"
        with article.open("a", encoding="utf-8") as stream:
            stream.write("\n## Added heading {#live-heading}\n\nLiveEditNeedle.\n")
        changed = wait_for(
            "Content edit",
            lambda actual: actual[0] != before[0]
            and "LiveEditNeedle" in json.dumps(actual[1]),
        )
        article_data = next(page for page in changed[1]["pages"]
                            if page["url"] == PREFIX + "ja/article/")
        assert any(section["url"].endswith("#live-heading")
                   for section in article_data["sections"])
        assert index("en") == english_before, "Japanese edit changed English search data"

        added = write_page(work, "added.ja.md", "Runtime addition", "NewPageNeedle.")
        added_url = PREFIX + "ja/added/"
        wait_for("Added page", lambda actual: any(
            page["url"] == added_url for page in actual[1]["pages"]))
        added.unlink()
        wait_for("Deleted page", lambda actual: all(
            page["url"] != added_url for page in actual[1]["pages"]))
        assert index("en") == english_before, "Japanese page changes altered English data"
        success = True
        print(f"PASS {mode}: content edit, exact heading, page add/delete, language isolation")
    finally:
        if process is not None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        if log is not None:
            log.close()
        if success:
            shutil.rmtree(work)
        else:
            print(f"Failed fixture retained at {work}")
            if (work / "server.log").exists():
                print((work / "server.log").read_text(encoding="utf-8")[-5000:])


if __name__ == "__main__":
    check(disable_fast_render=False)
    check(disable_fast_render=True)
