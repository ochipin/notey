/* Notey search — Pagefind */
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
  var BASE = "{{ "pagefind/pagefind.js" | relURL }}";
  var LANG = doc.documentElement.lang || "";

  var pf = null, loading = null, results = [], shown = 0, PAGE = 6, timer = 0;
  var focusTimer = 0, searchVersion = 0;
  var pendingBatch = null;

  function load() {
    if (pf) return Promise.resolve(pf);
    if (loading) return loading;
    loading = import(BASE)
      .then(function (m) {
        return Promise.resolve(m.options({ language: LANG }))
          .then(function () { return m.init(); })
          .then(function () { pf = m; return pf; });
      })
      .catch(function () { loading = null; return null; });
    return loading;
  }

  function open() {
    if (!dlg.open) dlg.showModal();
    load();
    clearTimeout(focusTimer);
    focusTimer = setTimeout(function () {
      if (dlg.open) { input.focus(); input.select(); }
    }, 20);
  }
  function close() { if (dlg.open) dlg.close(); }

  doc.addEventListener("click", function (e) {
    if (e.target.closest("[data-search-open]")) { e.preventDefault(); open(); }
    if (e.target.closest("[data-search-close]")) close();
    if (e.target === dlg) close();
  });

  addEventListener("keydown", function (e) {
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

  function crumb(hit) {
    var parts = (hit.meta && hit.meta.crumb) || "";
    if (parts) return esc(parts);
    var p = (hit.url || "").replace(/^\/|\/$/g, "").split("/");
    p.pop();
    return esc(p.join(" / "));
  }

  function headings(hit) {
    var seen = new Set();
    return (hit.sub_results || []).filter(function (sub) {
      // Pagefind also returns a page-level result before the first heading.
      if (!sub.anchor || !sub.url || !sub.title || !/^h[1-6]$/i.test(sub.anchor.element)) return false;
      var hash = sub.url.indexOf("#");
      if (hash < 0 || hash === sub.url.length - 1 || seen.has(sub.url)) return false;
      seen.add(sub.url);
      return true;
    }).slice(0, 3);
  }

  function resultHTML(hit) {
    var sections = headings(hit);
    var html =
      '<a class="sdlg-hit" data-search-hit href="' + esc(hit.url) + '">' +
      '<span class="sdlg-hit-crumb">' + crumb(hit) + "</span>" +
      '<span class="sdlg-hit-title">' + esc((hit.meta && hit.meta.title) || hit.url) + "</span>" +
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
    if (!dlg.open || pendingBatch) return;
    var version = searchVersion;
    if (reset) { list.innerHTML = ""; shown = 0; }
    var slice = results.slice(shown, shown + PAGE);
    if (!slice.length) { more.hidden = true; return; }
    var batch = { start: shown };
    pendingBatch = batch;
    more.disabled = true;
    function current() { return dlg.open && version === searchVersion && pendingBatch === batch; }
    Promise.all(slice.map(function (r) {
      return Promise.resolve().then(function () { return r.data(); });
    })).then(function (rows) {
      if (!current()) return;
      var fragment = doc.createDocumentFragment();
      rows.forEach(function (d) {
        var li = doc.createElement("li");
        li.className = "sdlg-result";
        li.innerHTML = resultHTML(d);
        fragment.appendChild(li);
      });
      list.appendChild(fragment);
      shown = batch.start + slice.length;
      status.hidden = true;
      more.hidden = shown >= results.length;
    }).catch(function () {
      if (!current()) return;
      status.hidden = false;
      status.textContent = T.failed;
      // Keep the same offset so a retry cannot skip any failed results.
      more.hidden = false;
    }).finally(function () {
      if (pendingBatch !== batch) return;
      pendingBatch = null;
      more.disabled = false;
    });
  }

  function resetResults() {
    pendingBatch = null;
    results = [];
    shown = 0;
    list.innerHTML = "";
    summary.hidden = true;
    summary.textContent = "";
    more.hidden = true;
    more.disabled = false;
  }

  function run(q) {
    var version = searchVersion;
    if (!q) { list.innerHTML = ""; status.hidden = false; status.textContent = T.hint; more.hidden = true; return; }
    status.hidden = false;
    status.textContent = T.searching;
    load().then(function (api) {
      if (!dlg.open || version !== searchVersion) return;
      if (!api) { status.textContent = T.missing; return; }
      return api.debouncedSearch(q, {}, 120).then(function (res) {
        if (!res || !dlg.open || version !== searchVersion) return;
        results = res.results;
        summary.textContent = (results.length === 1 ? T.countOne : T.count)
          .replace("{count}", results.length.toLocaleString(LANG || undefined));
        summary.hidden = false;
        if (!results.length) { list.innerHTML = ""; status.textContent = T.empty; more.hidden = true; return; }
        status.hidden = true;
        render(true);
      });
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
