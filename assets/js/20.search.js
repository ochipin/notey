/* Notey search — MiniSearch (MIT, static/vendor/minisearch). Hugo builds the
   index JSON (layouts/_partials/search-index.html); the browser downloads it on
   the first search and indexes it locally, so no post-build step is needed. */
(function () {
  "use strict";
  var doc = document;
  var dlg = doc.getElementById("search-dialog");
  if (!dlg) return;

  var input = doc.getElementById("search-input");
  var list = doc.getElementById("search-results");
  var status = doc.getElementById("search-status");
  var summary = doc.getElementById("search-summary");
  var more = doc.getElementById("search-more");

  var T = {
    hint: "{{ i18n "ui.search_hint" }}",
    empty: "{{ i18n "ui.search_empty" }}",
    searching: "{{ i18n "ui.search_running" }}",
    missing: "{{ i18n "ui.search_missing" }}",
    failed: "{{ i18n "ui.search_failed" }}",
    count: "{{ i18n "ui.search_count" (dict "Count" 2) }}",
    countOne: "{{ i18n "ui.search_count" (dict "Count" 1) }}"
  };
  var INDEX = dlg.getAttribute("data-search-index");
  var LIB = dlg.getAttribute("data-search-lib");
  var LANG = doc.documentElement.lang || "";

  var engine = null, loading = null, results = [], shown = 0, PAGE = 6, timer = 0;
  var focusTimer = 0, searchVersion = 0;

  // Japanese and other CJK text has no spaces between words. Runs of CJK
  // characters are indexed as overlapping two-character terms; other text is
  // split into words. A one-character CJK query matches as a prefix.
  var CJK = /[\u3005\u3006\u30fc\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\uac00-\ud7af]/;
  function norm(s) { return String(s == null ? "" : s).normalize("NFKC").toLowerCase(); }
  function terms(s) {
    var out = [];
    (norm(s).match(/[\p{L}\p{N}_]+/gu) || []).forEach(function (word) {
      var run = "", latin = "";
      function flushRun() {
        if (run.length === 1) out.push(run);
        for (var i = 0; i + 1 < run.length; i++) out.push(run.substr(i, 2));
        run = "";
      }
      function flushLatin() { if (latin) out.push(latin); latin = ""; }
      Array.from(word).forEach(function (ch) {
        if (CJK.test(ch)) { flushLatin(); run += ch; } else { flushRun(); latin += ch; }
      });
      flushRun();
      flushLatin();
    });
    return out;
  }
  function same(t) { return t; }

  function load() {
    if (engine) return Promise.resolve(engine);
    if (loading) return loading;
    loading = Promise.all([
      import(LIB),
      fetch(INDEX, { credentials: "same-origin" }).then(function (r) {
        if (!r.ok) throw new Error("index " + r.status);
        return r.json();
      })
    ]).then(function (v) {
      var MiniSearch = v[0].default, data = v[1];
      data.docs.forEach(function (d, i) { d.i = i; });
      var ms = new MiniSearch({
        idField: "i",
        fields: ["h", "x"],
        tokenize: terms,
        processTerm: same,
        searchOptions: {
          tokenize: terms,
          processTerm: same,
          boost: { h: 3 },
          combineWith: "AND",
          prefix: function (term) { return !CJK.test(term) || term.length === 1; }
        }
      });
      return ms.addAllAsync(data.docs, { chunkSize: 500 }).then(function () {
        engine = { ms: ms, pages: data.pages, docs: data.docs };
        return engine;
      });
    }).catch(function () { loading = null; return null; });
    return loading;
  }

  // Groups matching documents by page: the page score is its best section's
  // score plus a little for each further match, and headings are sub-results.
  function query(api, q) {
    var byPage = new Map();
    api.ms.search(q).forEach(function (hit) {
      var d = api.docs[hit.id];
      var g = byPage.get(d.p);
      if (!g) { g = { p: d.p, score: 0, best: null, subs: [] }; byPage.set(d.p, g); }
      if (!g.best || hit.score > g.best.score) g.best = { doc: d, score: hit.score };
      g.score = Math.max(g.score, hit.score) + hit.score * 0.1;
      if (d.a) g.subs.push({ doc: d, score: hit.score });
    });
    return Array.from(byPage.values()).sort(function (a, b) { return b.score - a.score; });
  }

  // A short excerpt around the first match, with matches marked.
  function excerpt(text, q) {
    text = String(text || "");
    var words = norm(q).split(/\s+/).filter(Boolean).sort(function (a, b) { return b.length - a.length; });
    if (!words.length) return esc(text.slice(0, 120));
    var pattern = new RegExp(words.map(function (w) {
      return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("|"), "gi");
    var first = text.search(pattern);
    var start = Math.max(0, first - 30);
    var cut = text.slice(start, start + 120);
    var html = "", last = 0;
    cut.replace(pattern, function (m, at) {
      html += esc(cut.slice(last, at)) + "<mark>" + esc(m) + "</mark>";
      last = at + m.length;
      return m;
    });
    html += esc(cut.slice(last));
    return (start > 0 ? "…" : "") + html + (start + 120 < text.length ? "…" : "");
  }

  function toHit(api, g, q) {
    var page = api.pages[g.p];
    var seen = new Set();
    var subs = g.subs.sort(function (a, b) { return b.score - a.score; }).filter(function (s) {
      if (seen.has(s.doc.a)) return false;
      seen.add(s.doc.a);
      return true;
    }).slice(0, 3).map(function (s) {
      return { url: page.u + "#" + encodeURIComponent(s.doc.a), title: s.doc.h, excerpt: excerpt(s.doc.x, q) };
    });
    var best = g.best.doc;
    return { url: page.u, title: page.t, crumb: page.c, excerpt: excerpt(best.x || best.h, q), subs: subs };
  }

  function open() {
    if (!dlg.open) dlg.showModal();
    load();
    clearTimeout(focusTimer);
    focusTimer = setTimeout(function () {
      if (dlg.open && !doc.querySelector("dialog[open]:not(#search-dialog)")) { input.focus(); input.select(); }
    }, 20);
  }
  function close() { if (dlg.open) dlg.close(); }

  doc.addEventListener("click", function (e) {
    if (e.target.closest("[data-search-open]")) { e.preventDefault(); open(); }
    if (e.target.closest("[data-search-close]")) close();
    if (e.target === dlg) close();
  });

  addEventListener("keydown", function (e) {
    // Leave keyboard interaction with another modal on top of search intact.
    if (e.defaultPrevented || doc.querySelector("dialog[open]:not(#search-dialog)")) return;
    var k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === "k") { e.preventDefault(); open(); return; }
    var typing = /^(input|textarea|select)$/i.test((doc.activeElement || {}).tagName || "");
    if (k === "/" && !typing && !dlg.open) { e.preventDefault(); open(); }
  });

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function resultHTML(hit) {
    var sections = hit.subs;
    var html =
      '<a class="sdlg-hit" data-search-hit href="' + esc(hit.url) + '">' +
      '<span class="sdlg-hit-crumb">' + esc(hit.crumb) + "</span>" +
      '<span class="sdlg-hit-title">' + esc(hit.title || hit.url) + "</span>" +
      '<span class="sdlg-hit-excerpt">' + (hit.excerpt || "") + "</span></a>";
    if (sections.length) {
      html += '<ul class="sdlg-subresults">';
      sections.forEach(function (sub) {
        html += '<li><a class="sdlg-subhit" data-search-hit href="' + esc(sub.url) + '">' +
          '<span class="sdlg-subhit-title">' + esc(sub.title) + "</span>" +
          '<span class="sdlg-hit-excerpt">' + (sub.excerpt || "") + "</span></a></li>";
      });
      html += "</ul>";
    }
    return html;
  }

  function render(reset) {
    if (!dlg.open) return;
    if (reset) { list.innerHTML = ""; shown = 0; }
    var slice = results.slice(shown, shown + PAGE);
    var fragment = doc.createDocumentFragment();
    slice.forEach(function (hit) {
      var li = doc.createElement("li");
      li.className = "sdlg-result";
      li.innerHTML = resultHTML(hit);
      fragment.appendChild(li);
    });
    list.appendChild(fragment);
    shown += slice.length;
    status.hidden = true;
    more.hidden = shown >= results.length;
  }

  function resetResults() {
    results = [];
    shown = 0;
    list.innerHTML = "";
    summary.hidden = true;
    summary.textContent = "";
    more.hidden = true;
  }

  function run(q) {
    var version = searchVersion;
    if (!q) { list.innerHTML = ""; status.hidden = false; status.textContent = T.hint; more.hidden = true; return; }
    status.hidden = false;
    status.textContent = T.searching;
    load().then(function (api) {
      if (!dlg.open || version !== searchVersion) return;
      if (!api) { status.textContent = T.missing; return; }
      results = query(api, q).map(function (g) { return toHit(api, g, q); });
      summary.textContent = (results.length === 1 ? T.countOne : T.count)
        .replace("{count}", results.length.toLocaleString(LANG || undefined));
      summary.hidden = false;
      if (!results.length) { list.innerHTML = ""; status.textContent = T.empty; more.hidden = true; return; }
      status.hidden = true;
      render(true);
    }).catch(function () {
      if (!dlg.open || version !== searchVersion) return;
      status.hidden = false;
      status.textContent = T.failed;
    });
  }

  input.addEventListener("input", function () {
    clearTimeout(timer);
    searchVersion += 1;
    resetResults();
    var q = input.value.trim();
    status.hidden = false;
    status.textContent = q ? T.searching : T.hint;
    timer = setTimeout(function () { run(q); }, 90);
  });
  more.addEventListener("click", function () { render(false); });

  list.addEventListener("click", function (e) {
    // Also dismiss the modal when a heading points into the current page.
    if (e.target.closest("[data-search-hit]") && e.button === 0 &&
        !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) close();
  });

  dlg.addEventListener("focusin", function (e) {
    var focused = e.target.closest("[data-search-hit]");
    list.querySelectorAll("[data-search-hit]").forEach(function (hit) {
      hit.classList.toggle("is-active", hit === focused);
    });
  });

  dlg.addEventListener("keydown", function (e) {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === "Escape") {
      // Handle Escape before type="search" consumes it to clear the input.
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    var hits = Array.prototype.slice.call(list.querySelectorAll("[data-search-hit]"));
    if (!hits.length) return;
    var i = hits.findIndex(function (h) { return h.classList.contains("is-active"); });
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (e.target !== input && !e.target.closest("[data-search-hit]")) return;
      e.preventDefault();
      var n = e.key === "ArrowDown" ? Math.min(i + 1, hits.length - 1) : Math.max(i - 1, 0);
      hits.forEach(function (h) { h.classList.remove("is-active"); });
      hits[n].classList.add("is-active");
      if (e.target !== input) hits[n].focus({ preventScroll: true });
      var box = hits[n].getBoundingClientRect(), pbox = list.parentNode.getBoundingClientRect();
      if (box.bottom > pbox.bottom) list.parentNode.scrollTop += box.bottom - pbox.bottom + 8;
      if (box.top < pbox.top) list.parentNode.scrollTop -= pbox.top - box.top + 8;
    }
    // Focused links and buttons retain their native Enter behavior.
    if (e.key === "Enter" && e.target === input && i >= 0) { e.preventDefault(); hits[i].click(); }
  });

  dlg.addEventListener("close", function () {
    clearTimeout(timer);
    clearTimeout(focusTimer);
    searchVersion += 1;
    resetResults();
    input.value = "";
    status.hidden = false;
    status.textContent = T.hint;
  });
})();
