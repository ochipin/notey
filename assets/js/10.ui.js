/* Notey UI — drawer / theme / pickers / code / tabs / lightbox / toc */
(function () {
  "use strict";
  var doc = document;
  var root = doc.documentElement;
  var T = {
    copy: "{{ i18n "ui.copy" }}",
    copied: "{{ i18n "ui.copied" }}"
  };

  /* ---- テーマ切替 ---- */
  function setTheme(v) {
    root.dataset.theme = v;
    try { localStorage.setItem("notey-theme", v); } catch (e) {}
    doc.dispatchEvent(new CustomEvent("notey:theme", { detail: v }));
  }
  doc.querySelectorAll("#theme-btn, [data-theme-toggle]").forEach(function (themeBtn) {
    themeBtn.addEventListener("click", function () {
      setTheme(root.dataset.theme === "dark" ? "light" : "dark");
    });
  });

  /* ---- ヘッダーのカテゴリーナビゲーション ---- */
  var headerNav = doc.querySelector(".hdr-nav-scroll");
  function revealHeaderCurrent() {
    if (!headerNav || !headerNav.clientWidth) return;
    var currentLink = headerNav.querySelector('a[aria-current]:not([aria-current="false"]), a.is-current');
    if (!currentLink) return;
    var navRect = headerNav.getBoundingClientRect();
    var linkRect = currentLink.getBoundingClientRect();
    var left = navRect.left + headerNav.clientLeft;
    var right = left + headerNav.clientWidth;
    // Adjust only this container; scrollIntoView could also move the page.
    if (linkRect.left < left) headerNav.scrollLeft += linkRect.left - left;
    else if (linkRect.right > right) headerNav.scrollLeft += linkRect.right - right;
  }
  if (headerNav) {
    headerNav.addEventListener("wheel", function (e) {
      // Keep zoom, Shift-wheel and horizontal trackpad gestures native.
      if (e.defaultPrevented || !e.cancelable || e.ctrlKey || e.shiftKey || e.deltaX || !e.deltaY) return;
      if (!headerNav.clientWidth || headerNav.scrollWidth <= headerNav.clientWidth + 1) return;
      var delta = e.deltaY;
      if (e.deltaMode === 1) {
        var style = getComputedStyle(headerNav);
        delta *= parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2 || 16;
      } else if (e.deltaMode === 2) {
        delta *= headerNav.clientWidth;
      }
      var previous = headerNav.scrollLeft;
      headerNav.scrollLeft += delta;
      // Let the page scroll once the corresponding horizontal edge is reached.
      if (headerNav.scrollLeft !== previous) e.preventDefault();
    }, { passive: false });
    requestAnimationFrame(revealHeaderCurrent);
    addEventListener("load", revealHeaderCurrent, { once: true });
    if (doc.fonts) doc.fonts.ready.then(revealHeaderCurrent);
  }

  /* ---- モバイルドロワー ---- */
  var menuBtn = doc.getElementById("menu-btn");
  var sidebar = doc.getElementById("sidebar");
  var scrim = doc.getElementById("scrim");
  var navFocusFrame = 0;
  function navFocusable() {
    return Array.from(sidebar.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'))
      .filter(function (el) { return !el.disabled && el.getClientRects().length && getComputedStyle(el).visibility === "visible"; });
  }
  function focusNavControl(target) {
    target.focus({ preventScroll: true });
    if (!sidebar.contains(target)) return;
    var sidebarRect = sidebar.getBoundingClientRect();
    var targetRect = target.getBoundingClientRect();
    var top = sidebarRect.top + sidebar.clientTop;
    var bottom = top + sidebar.clientHeight;
    if (targetRect.top < top) sidebar.scrollTop += targetRect.top - top;
    else if (targetRect.bottom > bottom) sidebar.scrollTop += targetRect.bottom - bottom;
  }
  function focusOpenedNav() {
    navFocusFrame = 0;
    if (!doc.body.classList.contains("nav-open") || mq.matches || doc.querySelector("dialog[open]")) return;
    // A frame can run before the visibility transition has started.
    if (getComputedStyle(sidebar).visibility !== "visible") {
      navFocusFrame = requestAnimationFrame(focusOpenedNav);
      return;
    }
    if (sidebar.contains(doc.activeElement)) return;
    var first = navFocusable()[0];
    if (first) focusNavControl(first);
    // Descendants can finish their inherited visibility transition a frame later.
    if (!sidebar.contains(doc.activeElement)) navFocusFrame = requestAnimationFrame(focusOpenedNav);
  }
  function closeNav(restoreFocus) {
    cancelAnimationFrame(navFocusFrame);
    navFocusFrame = 0;
    var wasOpen = doc.body.classList.contains("nav-open");
    doc.body.classList.remove("nav-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    if (scrim) scrim.hidden = true;
    if (sidebar) closePickers(sidebar);
    if (wasOpen && restoreFocus) {
      var target = menuBtn && menuBtn.getClientRects().length ? menuBtn : doc.querySelector(".brand");
      if (target) target.focus({ preventScroll: true });
    }
  }
  function openNav() {
    if (mq.matches) return;
    doc.body.classList.add("nav-open");
    menuBtn.setAttribute("aria-expanded", "true");
    if (scrim) scrim.hidden = false;
    cancelAnimationFrame(navFocusFrame);
    navFocusFrame = requestAnimationFrame(focusOpenedNav);
  }
  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", function () {
      doc.body.classList.contains("nav-open") ? closeNav(true) : openNav();
    });
    if (scrim) scrim.addEventListener("click", function () { closeNav(true); });
    sidebar.addEventListener("click", function (e) {
      if (e.target.closest("a[href]")) closeNav();
    });
    addEventListener("keydown", function (e) {
      if (e.defaultPrevented || !doc.body.classList.contains("nav-open") || doc.querySelector("dialog[open]")) return;
      if (e.key === "Escape") { e.preventDefault(); closeNav(true); }
      if (e.key === "Tab") {
        var focusable = [menuBtn].concat(navFocusable());
        var i = focusable.indexOf(doc.activeElement);
        var next = i < 0 ? (e.shiftKey ? focusable.length - 1 : 0)
          : (i + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
        e.preventDefault();
        focusNavControl(focusable[next]);
      }
    });
    var mq = matchMedia("(min-width: 861px)");
    mq.addEventListener("change", function () {
      closeNav(true);
      closePickers();
      if (doc.activeElement && !doc.activeElement.getClientRects().length) {
        var target = mq.matches ? doc.querySelector(".brand") : menuBtn;
        if (target) target.focus({ preventScroll: true });
      }
      if (mq.matches) requestAnimationFrame(revealHeaderCurrent);
    });
  }

  /* 現在ページをサイドバー内に見えるようにする（スクロール位置調整） */
  var current = sidebar && sidebar.querySelector('[aria-current="page"]');
  if (current) {
    var top = current.offsetTop - sidebar.clientHeight / 2;
    if (top > 0) sidebar.scrollTop = top;
  }

  /* ---- ドロップダウン（バージョン / 言語） ---- */
  function closePickers(scope) {
    (scope || doc).querySelectorAll(".picker-menu").forEach(function (m) { m.hidden = true; });
    (scope || doc).querySelectorAll(".picker-btn").forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
  }
  doc.querySelectorAll("[data-picker]").forEach(function (p) {
    var btn = p.querySelector(".picker-btn");
    var menu = p.querySelector(".picker-menu");
    if (!btn || !menu) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = menu.hidden;
      closePickers();
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    });
  });
  doc.addEventListener("click", function () { closePickers(); });
  doc.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || doc.querySelector("dialog[open]")) return;
    var open = doc.querySelector('.picker-btn[aria-expanded="true"]');
    if (!open) return;
    e.preventDefault();
    e.stopPropagation();
    closePickers();
    open.focus();
  });

  /* ---- コードコピー ---- */
  doc.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy], [data-copy-text]");
    if (!btn) return;
    var text = btn.dataset.copyText;
    if (text === undefined) {
      var block = btn.closest(".code, .lp-install");
      var pre = block && block.querySelector("pre code, pre, code");
      if (!pre) return;
      text = pre.innerText.replace(/\n$/, "");
    }
    navigator.clipboard.writeText(text).then(function () {
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
  var revealTab = new WeakMap();
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
      revealTab.set(p, function () { show(i); });
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

  /* ---- 見出し・コード行へのリンク（非表示のタブや折りたたみも開く） ---- */
  var fragmentFrame = 0;
  var codeLineTargets = [];
  function highlightCodeLine(target) {
    codeLineTargets.forEach(function (el) { el.classList.remove("is-line-target"); });
    codeLineTargets = [];
    if (!target || !target.closest(".chroma")) return;
    var number = target.closest(".ln, .lnt");
    var line = target.closest(".line");
    if (!line && number) {
      // Table-mode anchors live in the number column, separate from the code.
      // Match row positions, not displayed numbers (line numbering may start at 98).
      var table = number.closest("table.lntable");
      var cells = table && table.rows[0] && table.rows[0].cells;
      if (cells && cells.length === 2) {
        var index = Array.from(cells[0].querySelectorAll(".lnt")).indexOf(number);
        line = cells[1].querySelectorAll(".line")[index];
      }
    }
    if (!line) return;
    codeLineTargets = number ? [line, number] : [line];
    codeLineTargets.forEach(function (el) { el.classList.add("is-line-target"); });
  }
  function revealFragment(hash) {
    var id = hash.slice(1);
    try { id = decodeURIComponent(id); } catch (e) {}
    var target = id ? doc.getElementById(id) : null;
    highlightCodeLine(target);
    if (!target || !target.closest(".prose")) return;
    var ancestors = [], node = target;
    while (node && node !== doc.body) {
      ancestors.push(node);
      node = node.parentElement;
    }
    // Reveal outer containers first, so nested tab groups retain their own
    // selected state and all enclosing details elements become visible.
    ancestors.reverse().forEach(function (ancestor) {
      if (ancestor.tagName === "DETAILS") ancestor.open = true;
      var showTab = revealTab.get(ancestor);
      if (showTab) showTab();
    });
    // scrollIntoView honors the heading or code anchor's scroll-margin beneath the header.
    target.scrollIntoView({ block: "start", behavior: "auto" });
  }
  function queueFragment(hash) {
    cancelAnimationFrame(fragmentFrame);
    fragmentFrame = requestAnimationFrame(function () {
      if (location.hash === hash) revealFragment(hash);
    });
  }
  queueFragment(location.hash);
  addEventListener("load", function () { queueFragment(location.hash); }, { once: true });
  addEventListener("hashchange", function () { queueFragment(location.hash); });
  doc.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    var url;
    try { url = new URL(link.href, doc.baseURI); } catch (error) { return; }
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
    // Clicking the current hash emits no hashchange. Defer until the native
    // navigation and the search dialog's close handler have both completed.
    queueFragment(url.hash);
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

})();
