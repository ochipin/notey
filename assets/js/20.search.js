/* Notey search — Pagefind */
(function () {
  "use strict";
  var doc = document;
  var dlg = doc.getElementById("search-dialog");
  if (!dlg) return;

  var input = doc.getElementById("search-input");
  var list = doc.getElementById("search-results");
  var status = doc.getElementById("search-status");
  var more = doc.getElementById("search-more");

  var T = {
    hint: "{{ i18n "ui.search_hint" }}",
    empty: "{{ i18n "ui.search_empty" }}",
    searching: "{{ i18n "ui.search_running" }}",
    missing: "{{ i18n "ui.search_missing" }}",
    count: "{{ i18n "ui.search_count" }}"
  };
  var BASE = "{{ "pagefind/pagefind.js" | relURL }}";
  var LANG = doc.documentElement.lang || "";

  var pf = null, loading = null, results = [], shown = 0, PAGE = 6, timer = 0;
  var focusTimer = 0, searchVersion = 0;

  function load() {
    if (pf) return Promise.resolve(pf);
    if (loading) return loading;
    loading = import(BASE)
      .then(function (m) {
        pf = m;
        return pf.options({ language: LANG }).then(function () { return pf.init(); }).then(function () { return pf; });
      })
      .catch(function () { pf = null; return null; });
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

  function render(reset) {
    var version = searchVersion;
    if (reset) { list.innerHTML = ""; shown = 0; }
    var slice = results.slice(shown, shown + PAGE);
    Promise.all(slice.map(function (r) { return r.data(); })).then(function (rows) {
      if (!dlg.open || version !== searchVersion) return;
      rows.forEach(function (d) {
        var sub = (d.sub_results && d.sub_results[0]) || null;
        var url = (sub && sub.url) || d.url;
        var li = doc.createElement("li");
        li.innerHTML =
          '<a class="sdlg-hit" href="' + esc(url) + '">' +
          '<span class="sdlg-hit-crumb">' + crumb(d) + "</span>" +
          '<span class="sdlg-hit-title">' + esc((d.meta && d.meta.title) || d.url) + "</span>" +
          '<span class="sdlg-hit-excerpt">' + ((sub && sub.excerpt) || d.excerpt || "") + "</span>" +
          "</a>";
        list.appendChild(li);
      });
      shown += slice.length;
      more.hidden = shown >= results.length;
    });
  }

  function run(q) {
    var version = searchVersion;
    if (!q) { list.innerHTML = ""; status.hidden = false; status.textContent = T.hint; more.hidden = true; return; }
    status.hidden = false;
    status.textContent = T.searching;
    load().then(function (api) {
      if (!dlg.open || version !== searchVersion) return;
      if (!api) { status.textContent = T.missing; return; }
      api.debouncedSearch(q, {}, 120).then(function (res) {
        if (!res || !dlg.open || version !== searchVersion) return;
        results = res.results;
        if (!results.length) { list.innerHTML = ""; status.textContent = T.empty; more.hidden = true; return; }
        status.hidden = true;
        render(true);
      });
    });
  }

  input.addEventListener("input", function () {
    clearTimeout(timer);
    searchVersion += 1;
    var q = input.value.trim();
    timer = setTimeout(function () { run(q); }, 90);
  });
  more.addEventListener("click", function () { render(false); });

  dlg.addEventListener("keydown", function (e) {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === "Escape") {
      // Handle Escape before type="search" consumes it to clear the input.
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    var hits = Array.prototype.slice.call(list.querySelectorAll(".sdlg-hit"));
    if (!hits.length) return;
    var i = hits.findIndex(function (h) { return h.classList.contains("is-active"); });
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      var n = e.key === "ArrowDown" ? Math.min(i + 1, hits.length - 1) : Math.max(i - 1, 0);
      hits.forEach(function (h) { h.classList.remove("is-active"); });
      hits[n].classList.add("is-active");
      var box = hits[n].getBoundingClientRect(), pbox = list.parentNode.getBoundingClientRect();
      if (box.bottom > pbox.bottom) list.parentNode.scrollTop += box.bottom - pbox.bottom + 8;
      if (box.top < pbox.top) list.parentNode.scrollTop -= pbox.top - box.top + 8;
    }
    if (e.key === "Enter" && i >= 0) { e.preventDefault(); hits[i].click(); }
  });

  dlg.addEventListener("close", function () {
    clearTimeout(timer);
    clearTimeout(focusTimer);
    searchVersion += 1;
    results = [];
    shown = 0;
    input.value = "";
    list.innerHTML = "";
    status.hidden = false;
    status.textContent = T.hint;
    more.hidden = true;
  });
})();
