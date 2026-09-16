/* Notey UI — drawer / theme / pickers / code / tabs / lightbox / toc / mermaid */
(function () {
  "use strict";
  var doc = document;
  var root = doc.documentElement;
  var T = {
    copy: "{{ i18n "ui.copy" }}",
    copied: "{{ i18n "ui.copied" }}"
  };

  /* ---- テーマ切替 ---- */
  var themeBtn = doc.getElementById("theme-btn");
  function setTheme(v) {
    root.dataset.theme = v;
    try { localStorage.setItem("notey-theme", v); } catch (e) {}
    doc.dispatchEvent(new CustomEvent("notey:theme", { detail: v }));
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      setTheme(root.dataset.theme === "dark" ? "light" : "dark");
    });
  }

  /* ---- モバイルドロワー ---- */
  var menuBtn = doc.getElementById("menu-btn");
  var sidebar = doc.getElementById("sidebar");
  var scrim = doc.getElementById("scrim");
  function closeNav() {
    doc.body.classList.remove("nav-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    if (scrim) scrim.hidden = true;
  }
  function openNav() {
    doc.body.classList.add("nav-open");
    menuBtn.setAttribute("aria-expanded", "true");
    if (scrim) scrim.hidden = false;
  }
  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", function () {
      doc.body.classList.contains("nav-open") ? closeNav() : openNav();
    });
    if (scrim) scrim.addEventListener("click", closeNav);
    sidebar.addEventListener("click", function (e) {
      if (e.target.closest("a[href]")) closeNav();
    });
    addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
    var mq = matchMedia("(min-width: 861px)");
    mq.addEventListener("change", closeNav);
  }

  /* 現在ページをサイドバー内に見えるようにする（スクロール位置調整） */
  var current = sidebar && sidebar.querySelector('[aria-current="page"]');
  if (current) {
    var top = current.offsetTop - sidebar.clientHeight / 2;
    if (top > 0) sidebar.scrollTop = top;
  }

  /* ---- ドロップダウン（バージョン / 言語） ---- */
  doc.querySelectorAll("[data-picker]").forEach(function (p) {
    var btn = p.querySelector(".picker-btn");
    var menu = p.querySelector(".picker-menu");
    if (!btn || !menu) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = menu.hidden;
      doc.querySelectorAll(".picker-menu").forEach(function (m) { m.hidden = true; });
      doc.querySelectorAll(".picker-btn").forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    });
  });
  doc.addEventListener("click", function () {
    doc.querySelectorAll(".picker-menu").forEach(function (m) { m.hidden = true; });
    doc.querySelectorAll(".picker-btn").forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
  });

  /* ---- コードコピー ---- */
  doc.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy], [data-copy-text]");
    if (!btn) return;
    var text = btn.dataset.copyText;
    if (!text) {
      var block = btn.closest(".code, .lp-install");
      var pre = block && block.querySelector("pre code, pre, code");
      if (!pre) return;
      text = pre.innerText;
    }
    navigator.clipboard.writeText(text.replace(/\n$/, "")).then(function () {
      var label = btn.querySelector(".code-copy-label");
      btn.classList.add("is-done");
      if (label) label.textContent = T.copied;
      setTimeout(function () {
        btn.classList.remove("is-done");
        if (label) label.textContent = T.copy;
      }, 1600);
    });
  });

  /* ---- タブ（連続する .tab-panel をまとめる） ---- */
  doc.querySelectorAll(".prose .tab-panel").forEach(function (panel) {
    if (panel.dataset.tabDone) return;
    var group = [], n = panel;
    while (n && n.classList && n.classList.contains("tab-panel")) {
      group.push(n); n.dataset.tabDone = "1"; n = n.nextElementSibling;
    }
    var wrap = doc.createElement("div");
    wrap.className = "tabs";
    var bar = doc.createElement("div");
    bar.className = "tabs-bar";
    bar.setAttribute("role", "tablist");
    wrap.appendChild(bar);
    panel.parentNode.insertBefore(wrap, panel);

    var active = 0;
    group.forEach(function (p, i) {
      if (p.dataset.tabActive === "true") active = i;
      wrap.appendChild(p);
      var b = doc.createElement("button");
      b.type = "button";
      b.className = "tab-btn";
      b.setAttribute("role", "tab");
      b.textContent = p.dataset.tabTitle || "Tab " + (i + 1);
      b.addEventListener("click", function () { show(i); });
      bar.appendChild(b);
    });
    function show(i) {
      group.forEach(function (p, j) { p.hidden = j !== i; });
      bar.querySelectorAll(".tab-btn").forEach(function (b, j) {
        b.setAttribute("aria-selected", String(j === i));
        b.tabIndex = j === i ? 0 : -1;
      });
    }
    bar.addEventListener("keydown", function (e) {
      var i = Array.prototype.indexOf.call(bar.children, doc.activeElement);
      if (i < 0) return;
      if (e.key === "ArrowRight") { bar.children[(i + 1) % group.length].focus(); bar.children[(i + 1) % group.length].click(); }
      if (e.key === "ArrowLeft") { var p = (i - 1 + group.length) % group.length; bar.children[p].focus(); bar.children[p].click(); }
    });
    show(active);
  });

  /* ---- ライトボックス ---- */
  var lbx = doc.getElementById("lightbox");
  if (lbx) {
    var lbxImg = doc.getElementById("lbx-img");
    var lbxCap = doc.getElementById("lbx-cap");
    doc.addEventListener("click", function (e) {
      var z = e.target.closest("[data-lbx]");
      if (z) {
        lbxImg.src = z.dataset.lbx;
        lbxImg.alt = (z.querySelector("img") || {}).alt || "";
        lbxCap.textContent = z.dataset.lbxCap || "";
        if (!lbx.open) lbx.showModal();
        return;
      }
      if (e.target.closest("[data-lbx-close]") || e.target === lbxImg || e.target === lbx || e.target.classList.contains("lbx-fig")) {
        if (lbx.open) lbx.close();
      }
    });
    lbx.addEventListener("close", function () { lbxImg.src = ""; });
  }

  /* ---- 目次スクロールスパイ ---- */
  var toc = doc.getElementById("toc");
  if (toc && "IntersectionObserver" in window) {
    var links = {};
    toc.querySelectorAll("nav a[href^='#']").forEach(function (a) {
      links[decodeURIComponent(a.getAttribute("href").slice(1))] = a;
    });
    var targets = Object.keys(links)
      .map(function (id) { return doc.getElementById(id); })
      .filter(Boolean);
    var visible = new Set();
    function paint() {
      var best = null;
      targets.forEach(function (t) { if (visible.has(t.id) && !best) best = t; });
      if (!best) {
        for (var i = targets.length - 1; i >= 0; i--) {
          if (targets[i].getBoundingClientRect().top < 140) { best = targets[i]; break; }
        }
      }
      Object.keys(links).forEach(function (id) {
        links[id].classList.toggle("is-active", !!best && id === best.id);
      });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.isIntersecting ? visible.add(en.target.id) : visible.delete(en.target.id);
      });
      paint();
    }, { rootMargin: "-80px 0px -70% 0px", threshold: 0 });
    targets.forEach(function (t) { io.observe(t); });
    addEventListener("scroll", paint, { passive: true });
    paint();
  }

  /* ---- 相対日時 ---- */
  doc.querySelectorAll("time.rel-time").forEach(function (el) {
    var d = new Date(el.dateTime);
    if (isNaN(d)) return;
    var days = Math.round((Date.now() - d.getTime()) / 86400000);
    var rtf = window.Intl && Intl.RelativeTimeFormat
      ? new Intl.RelativeTimeFormat(root.lang || "ja", { numeric: "auto" }) : null;
    if (!rtf) return;
    var txt = days < 30 ? rtf.format(-days, "day")
      : days < 365 ? rtf.format(-Math.round(days / 30), "month")
      : rtf.format(-Math.round(days / 365), "year");
    el.title = el.textContent + " (" + txt + ")";
    el.insertAdjacentHTML("afterend", '<span class="meta-rel"> · ' + txt + "</span>");
  });

  /* ---- Mermaid（図があるページだけ読み込む） ---- */
  if (doc.querySelector("pre.mermaid")) {
    var src = "{{ site.Params.mermaid.url | default "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs" }}";
    var mermaidMod = null;
    var sources = [];
    doc.querySelectorAll("pre.mermaid").forEach(function (p) { sources.push(p.textContent); });
    function render() {
      if (!mermaidMod) return;
      mermaidMod.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: root.dataset.theme === "dark" ? "dark" : "default",
        fontFamily: getComputedStyle(doc.body).fontFamily
      });
      doc.querySelectorAll("pre.mermaid").forEach(function (p, i) {
        p.removeAttribute("data-processed");
        p.textContent = sources[i];
      });
      mermaidMod.run({ querySelector: "pre.mermaid" });
    }
    import(src).then(function (m) { mermaidMod = m.default || m; render(); }).catch(function () {});
    doc.addEventListener("notey:theme", render);
  }
})();
