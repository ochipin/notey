/**
 * =========================================================
 * Utilities
 * =========================================================
 */
const Utils = {
  debounce(fn, wait = 200) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  },

  resolveUrl(path) {
    const base = document.querySelector("base")?.href ?? document.baseURI;
    return new URL(path, base).toString();
  },

  escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  },

  // 抜粋作成（前後n文字 + ヒットを <string> で囲む）
  makeExcerpt(text, q, radius = 40) {
    if (!text) return null;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(q.toLowerCase());
    if (idx === -1) return null;

    const start = Math.max(0, idx - radius);
    const end = Math.min(text.length, idx + q.length + radius);
    const before = text.slice(start, idx);
    const hit = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length, end);

    const prefix = start > 0 ? "..." : "";
    const suffix = end < text.length ? "..." : "";

    return `${prefix}${Utils.escapeHtml(before)}<string>${Utils.escapeHtml(hit)}</string>${Utils.escapeHtml(after)}${suffix}`;
  },

  // ANDクエリ（スペース区切り）を想定。空要素除去。
  splitWords(query) {
    return query.trim().split(/\s+/).filter(Boolean);
  },

  // datetime (ISO / YYYY-MM-DD) -> 相対表記
  formatRelativeTime(datetime) {
    const date = new Date(datetime);
    if (Number.isNaN(date.getTime())) return null;

    const now = new Date();
    const diffMs = now - date;
    if (diffMs < 0) return null;

    const sec  = Math.floor(diffMs / 1000);
    const min  = Math.floor(sec / 60);
    const hour = Math.floor(min / 60);
    const day  = Math.floor(hour / 24);
    const week = Math.floor(day / 7);
    const month = Math.floor(day / 30);
    const year  = Math.floor(day / 365);

    if (sec < 60)   return `${sec}秒前に更新`;
    if (min < 60)   return `${min}分前に更新`;
    if (hour < 24)  return `${hour}時間前に更新`;
    if (day < 10)   return `${day}日前に更新`;
    if (day < 30)   return `${week}週間前に更新`;
    if (month < 12) return `${month}ヶ月前に更新`;
    return `${year}年以上前に更新`;
  },

  // <time class="relative-time" datetime="..."> を相対表記に変換
  applyRelativeTimes(root = document) {
    root.querySelectorAll("time.relative-time[datetime]").forEach(el => {
      const value = Utils.formatRelativeTime(el.getAttribute("datetime"));
      if (!value) return;

      el.title ||= el.textContent.trim();

      document.querySelectorAll("#relative-history").forEach(el => {
        el.innerHTML = `${value}`;
      });
    });
  },

  // 404用：戻る or トップへ（文言自動切替）
  initBackButton(options = {}) {
    const {
      selector = "#back-button",
      homeUrl = "/",
      labels = {
        back: '<span class="icon icon-arrow-left"></span>Back',
        home: '<span class="icon icon-home"></span>Home'
      }
    } = options;

    const btn = document.querySelector(selector);
    if (!btn) return;

    const canGoBack = (() => {
      try {
        // 同一オリジンの referrer がある
        if (
          document.referrer &&
          new URL(document.referrer).origin === location.origin
        ) {
          return true;
        }

        // referrer が無くても、履歴があれば戻れる可能性が高い
        if (history.length > 1) {
          return true;
        }

        return false;
      } catch {
        return false;
      }
    })();

    // 文言切り替え
    btn.innerHTML = canGoBack ? labels.back : labels.home;

    // click 挙動
    btn.addEventListener("click", e => {
      e.preventDefault();
      if (canGoBack) {
        history.back();
      } else {
        location.href = Utils.resolveUrl(homeUrl);
      }
    });
  }
};

/**
 * =========================================================
 * Site UI Entry
 * =========================================================
 */
class SiteUI {
  static init() {
    new TabPanelBuilder().init();

    new SidebarState().init();
    new Tabs().init();
    new CodeCopy().init();

    const toc = new TableOfContents();
    toc.assignHeadingIds(); // (^^ゞ)対策：見出し文字列に依存せず安定ID
    toc.build();
    toc.scrollSpy();

    new SearchDialog().init();
    new MenuButton().init();

    SiteUI.initSearchButton();
    SiteUI.initLanguageSelect();

    Utils.applyRelativeTimes();

    Utils.initBackButton({
      selector: "#back-button",
      homeUrl: "/",
      labels: {
        back: '<span class="icon icon-arrow-left"></span>Get back',
        home: '<span class="icon icon-home"></span>Get started'
      }
    });
  }

  static initSearchButton() {
    const btn = document.getElementById("search-button");
    const dialog = document.getElementById("search-dialog");

    if (!btn || !dialog) return;

    btn.addEventListener("click", () => {
      dialog.showModal();
      dialog.querySelector(".search-input")?.focus();
    });
  }

  static initLanguageSelect() {
    const select = document.getElementById("select-language");
    if (!select) return;

    select.addEventListener("change", () => {
      const url = select.value;
      if (url) {
        location.href = url;
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  SiteUI.init();
});


/**
 * =========================================================
 * Sidebar <details> state manager
 * =========================================================
 */
class SidebarState {
  STORAGE_KEY = "sidebar:details";

  init() {
    this.details = document.querySelectorAll(".l-sidebar details");
    if (!this.details.length) return;

    this.assignIds();
    this.state = this.load();
    this.restore();
    this.bind();
  }

  assignIds() {
    this.details.forEach((d, i) => {
      d.dataset.sidebarId ??= `details-${i}`;
    });
  }

  load() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) ?? {};
    } catch {
      return {};
    }
  }

  save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
  }

  restore() {
    const hasState = Object.keys(this.state).length > 0;

    this.details.forEach(d => {
      const id = d.dataset.sidebarId;
      d.open = hasState
        ? !!this.state[id]
        : !!d.querySelector('a[aria-current="page"]');
    });
  }

  bind() {
    this.details.forEach(d => {
      d.addEventListener("toggle", () => {
        this.state[d.dataset.sidebarId] = d.open;
        this.save();
      });
    });
  }
}


/**
 * =========================================================
 * Tab Panel Auto Builder
 * =========================================================
 */
class TabPanelBuilder {
  init() {
    const panels = [...document.querySelectorAll(".tab-panel")];
    if (panels.length < 2) return;

    let group = [];

    const flush = () => {
      if (group.length === 1) {
        group[0].removeAttribute("hidden");
        group = [];
        return;
      }
      if (group.length > 1) {
        this.buildTabs(group);
        group = [];
      }
    };

    panels.forEach(panel => {
      const prev = panel.previousElementSibling;
      if (prev && prev.classList.contains("tab-panel")) {
        group.push(panel);
      } else {
        flush();
        group = [panel];
      }
    });
    flush();
  }

  buildTabs(group) {
    if (group.length < 2) return;

    const firstPanel = group[0];

    const tabs = document.createElement("div");
    tabs.className = "tabs";

    const wrapper = document.createElement("div");
    wrapper.className = "wrapper";

    const tablist = document.createElement("ul");
    tablist.className = "tablist";
    tablist.setAttribute("role", "tablist");

    wrapper.appendChild(tablist);
    tabs.appendChild(wrapper);
    firstPanel.before(tabs);

    let hasActive = group.some(p => !p.hasAttribute("hidden"));
    if (!hasActive) group[0].removeAttribute("hidden");

    group.forEach((panel, index) => {
      const title = panel.dataset.tabTitle || `Tab ${index + 1}`;

      const tabId = `tab-${Math.random().toString(36).slice(2, 8)}`;
      const panelId = `${tabId}-panel`;

      // --- tab (button) ---
      const li = document.createElement("li");
      const btn = document.createElement("button");

      btn.id = tabId;
      btn.type = "button";
      btn.textContent = title;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-controls", panelId);

      const active = !panel.hasAttribute("hidden");
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.tabIndex = active ? 0 : -1;

      li.appendChild(btn);
      tablist.appendChild(li);

      // --- panel ---
      panel.id = panelId;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tabId);
      panel.tabIndex = 0;

      tabs.appendChild(panel);
    });
  }
}


/**
 * =========================================================
 * Accessible Tabs（button対応）
 * =========================================================
 */
class Tabs {
  init() {
    this.tablists = document.querySelectorAll('[role="tablist"]');
    if (!this.tablists.length) return;

    this.tablists.forEach(tablist => this.initOne(tablist));
  }

  initOne(tablist) {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const panels = tabs.map(t =>
      document.getElementById(t.getAttribute("aria-controls"))
    );

    const activate = (tab, focus = true) => {
      tabs.forEach((t, i) => {
        const selected = t === tab;
        t.setAttribute("aria-selected", selected);
        t.tabIndex = selected ? 0 : -1;
        panels[i].hidden = !selected;
      });
      if (focus) tab.focus();
    };

    // click
    tabs.forEach(tab => {
      tab.addEventListener("click", () => activate(tab));
    });

    // keyboard
    tablist.addEventListener("keydown", e => {
      const current = document.activeElement;
      if (!tabs.includes(current)) return;

      let i = tabs.indexOf(current);

      switch (e.key) {
        case "ArrowRight": i = (i + 1) % tabs.length; break;
        case "ArrowLeft":  i = (i - 1 + tabs.length) % tabs.length; break;
        case "Home":       i = 0; break;
        case "End":        i = tabs.length - 1; break;
        case "Enter":
        case " ":
          activate(current);
          return;
        default:
          return;
      }

      e.preventDefault();
      activate(tabs[i]);
    });
  }
}

/**
 * =========================================================
 * Code Copy Button
 * =========================================================
 */
class CodeCopy {
  init() {
    this.injectButtons();
    document.addEventListener("click", e => this.handleClick(e));
  }

  injectButtons() {
    document.querySelectorAll("pre.chroma").forEach(pre => {
      const code = pre.querySelector("code[data-lang]");
      if (!code || pre.querySelector(".icon-copy")) return;

      const btn = document.createElement("div");
      btn.className = "button icon-copy";
      btn.title = "Copy to clipboard";

      const feedback = document.createElement("div");
      feedback.className = "feedback";
      feedback.textContent = "Copied!";

      btn.appendChild(feedback);
      pre.insertBefore(btn, code);
    });
  }

  async handleClick(e) {
    const btn = e.target.closest(".button.icon-copy");
    if (!btn) return;

    const code = btn.closest("pre")?.querySelector("code");
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code.innerText);
      this.showFeedback(btn.querySelector(".feedback"));
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }

  showFeedback(el) {
    if (!el) return;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
    el.addEventListener("animationend", () => {
      el.classList.remove("show");
    }, { once: true });
  }
}


/**
 * =========================================================
 * Table Of Contents + ScrollSpy
 * =========================================================
 */
class TableOfContents {
  constructor() {
    this.readme = document.getElementById("readme");
    this.toc = document.getElementById("toc");
    this.topAnchor = document.getElementById("_top");
  }

  // (^^ゞ) 対策：見出し文字列に依存せず番号で安定IDを振る（常に上書き）
  assignHeadingIds() {
    if (!this.readme) return;
    let h2 = 0, h3 = 0;
    this.readme.querySelectorAll("h2, h3").forEach(h => {
      if (h.tagName === "H2") {
        h.id = `page-link-id-${++h2}`;
        h3 = 0;
      } else {
        h.id = `page-link-id-${h2}-${++h3}`;
      }
    });
  }

  build() {
    if (!this.readme || !this.toc) return;

    const headings = this.readme.querySelectorAll("h2, h3");
    const root = document.createElement("ul");
    root.style.setProperty("--depth", "0");

    root.innerHTML = `<li><a href="#_top">概要</a></li>`;

    let currentH2 = null;

    headings.forEach(h => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="#${h.id}">${Utils.escapeHtml(h.textContent)}</a>`;

      if (h.tagName === "H2") {
        root.appendChild(li);
        currentH2 = li;
      } else if (currentH2) {
        let ul = currentH2.querySelector("ul");
        if (!ul) {
          ul = document.createElement("ul");
          ul.style.setProperty("--depth", "1");
          currentH2.appendChild(ul);
        }
        ul.appendChild(li);
      }
    });

    this.toc.appendChild(root);
  }

  scrollSpy() {
    if (!this.readme || !this.toc) return;

    const links = [...this.toc.querySelectorAll('a[href^="#"]')];
    const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
    let current = null;

    const setCurrent = id => {
      const next = map.get(id);
      if (!next || next === current) return;
      current?.removeAttribute("aria-current");
      next.setAttribute("aria-current", "true");
      current = next;
    };

    // --- Starlight風：有効な見出し判定 ---
    const isValidHeading = el => {
      if (!el) return false;
      if (el.id === "_top") return true;
      if (el instanceof HTMLHeadingElement) {
        return el.tagName === "H2" || el.tagName === "H3";
      }
      return false;
    };

    // --- intersect した要素から「直前の有効見出し」を探す ---
    const findHeading = el => {
      let cur = el;

      while (cur) {
        if (isValidHeading(cur)) return cur;

        // 兄弟をさかのぼりつつ、子の末尾も見る
        let prev = cur.previousElementSibling;
        while (prev) {
          let node = prev;
          while (node?.lastElementChild) {
            node = node.lastElementChild;
          }
          if (isValidHeading(node)) return node;
          prev = prev.previousElementSibling;
        }
        cur = cur.parentElement;
      }
      return null;
    };

    // --- Observer ---
    const observer = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;

        const h = findHeading(e.target);
        if (h?.id) {
          setCurrent(h.id);
          return;
        }
      }

      // ★ フォールバック：トップ付近
      if (window.scrollY < 50) {
        setCurrent("_top");
      }
    }, {
      rootMargin: "-30% 0px -65% 0px",
      threshold: 0
    });

    // --- 監視対象 ---
    // 見出し＋見出し以外のブロックも含める（Starlightと同じ発想）
    const targets = this.readme.querySelectorAll(
      "[id], h2, h3, p, ul, ol, pre, blockquote"
    );

    targets.forEach(el => observer.observe(el));

    // 初期状態
    setCurrent("_top");
  }
}


/**
 * =========================================================
 * Search Dialog (SPEC MATCH)
 * =========================================================
 * - NN件 = 記事数
 * - 1記事内に複数章ヒットを表示
 * - 章リンク（#page-link-id-*）を生成
 * - 上位N記事だけHTMLをfetchして章情報を作る（動的）
 * - 5件ずつ表示、「次を読み込む」で追加
 * - backdrop click / CANCEL で閉じる
 * - debounce
 * - AND検索（スペース区切り）＋ Fuse fuzzy
 */
class SearchDialog {
  constructor() {
    this.dialog = document.getElementById("search-dialog");
    this.input = this.dialog?.querySelector(".search-input");
    this.cancelBtn = this.dialog?.querySelector(".search-cancel");
    this.list = this.dialog?.querySelector(".search-list");
    this.message = this.dialog?.querySelector(".search-message");
    this.nextBtn = this.dialog?.querySelector(".next-button");

    this.pageCache = new Map(); // url -> parsed sections
    this.lastQuery = "";
    this.pageSize = 5;
    this.offset = 0;
  }

  resolveSearchJsonUrl() {
    return document.documentElement.dataset.searchJson;;
  }

  async init() {
    if (!this.dialog || !this.input || !this.list || !this.message) return;

    // open/close
    document.getElementById("search-button")
      ?.addEventListener("click", () => {
        this.resetView();
        this.dialog.showModal();
        this.input.focus();
      });

    // backdrop click -> close
    this.dialog.addEventListener("click", (e) => {
      if (e.target === this.dialog) this.dialog.close();
    });

    // CANCEL -> close
    this.cancelBtn?.addEventListener("click", () => this.dialog.close());

    // ESC は dialog が勝手に閉じるのでOK（必要なら cancel イベントで制御）

    // load search index
    const url = this.resolveSearchJsonUrl();
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) {
      console.error("[Search] cannot load:", url, res.status);
      return;
    }
    this.pages = await res.json();

    // Fuse: タイトル+本文（あいまい）
    this.fuse = new Fuse(this.pages, {
      includeScore: true,
      shouldSort: true,
      threshold: 0.35,
      ignoreLocation: true,
      keys: ["title", "content"]
    });

    // input (debounce)
    this.input.addEventListener("input", Utils.debounce(() => this.onInput(), 200));

    // next
    this.nextBtn?.addEventListener("click", () => this.loadMore());
    this.hideNext();
  }

  resetView() {
    this.lastQuery = "";
    this.offset = 0;
    this.list.innerHTML = "";
    this.message.textContent = "";
    this.hideNext();
  }

  hideNext() {
    if (this.nextBtn) this.nextBtn.style.display = "none";
  }
  showNext() {
    if (this.nextBtn) this.nextBtn.style.display = "";
  }

  onInput() {
    const q = this.input.value.trim();
    this.offset = 0;
    this.list.innerHTML = "";
    this.hideNext();

    if (!q) {
      this.message.textContent = "";
      return;
    }
    this.lastQuery = q;
    this.searchAndRender(q, true);
  }

  loadMore() {
    if (!this.lastQuery) return;
    this.searchAndRender(this.lastQuery, false);
  }

  // AND検索（スペース区切り）を、Fuseの結果に対してフィルタ
  andFilter(items, words) {
    if (!words.length) return items;
    return items.filter(it => {
      const hay = `${it.item.title}\n${it.item.content}`.toLowerCase();
      return words.every(w => hay.includes(w.toLowerCase()));
    });
  }

  async searchAndRender(query, reset) {
    const words = Utils.splitWords(query);

    // Fuseで候補抽出（多めに取ってANDで絞る）
    const raw = this.fuse.search(query, { limit: 100 });
    const filtered = this.andFilter(raw, words);

    // NN件 = 記事数
    const totalArticles = filtered.length;

    if (totalArticles === 0) {
      this.message.textContent = `"${query}"の検索に一致する情報はありませんでした`;
      this.hideNext();
      return;
    }

    // 表示分（5件ずつ）
    const slice = filtered.slice(this.offset, this.offset + this.pageSize);
    this.offset += slice.length;

    this.message.textContent = `"${query}"の${totalArticles}件の検索結果`;

    // 各記事を描画（章ごとの結果はHTMLをfetchして作る）
    for (const r of slice) {
      await this.renderArticleResult(r.item, words);
    }

    // 次ボタン
    if (this.offset < totalArticles) this.showNext();
    else this.hideNext();
  }

  async renderArticleResult(page, words) {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="search-result" data-topic="${page.topic}">
        <p class="page-title">
          <span class="icon icon-docs"></span>
          <a href="${page.url}">${Utils.escapeHtml(page.title)}</a>
        </p>
        <div class="page-results"></div>
      </div>
    `;
    li.querySelector(".page-title a")
      ?.addEventListener("click", () => this.dialog.close());
    this.list.appendChild(li);

    const container = li.querySelector(".page-results");

    // 章ごとのヒットを組み立てる
    const sections = await this.getSectionsByFetching(page.url);

    // words のどれかが含まれる章だけ表示（ANDなら「少なくとも1語」ヒット章を列挙し、記事自体はANDで絞ってある）
    const hits = [];
    for (const sec of sections) {
      // sec.plain: 章本文（見出し配下テキスト）
      // 抜粋は各語で作って複数作れるが、ここでは最初に見つかった語で1つ作る（仕様上十分）
      let excerpt = null;
      let hitWord = null;
      for (const w of words) {
        excerpt = Utils.makeExcerpt(sec.plain, w, 50);
        if (excerpt) { hitWord = w; break; }
      }
      if (excerpt) {
        hits.push({
          subtitle: sec.title,
          anchor: sec.anchor,
          url: page.url,
          excerpt
        });
      }
    }

    // 章ヒットが1つも取れない場合：ページ全文から抜粋を1つ作って「概要」扱いで出す
    if (hits.length === 0) {
      let excerpt = null;
      for (const w of words) {
        excerpt = Utils.makeExcerpt(page.content, w, 50);
        if (excerpt) break;
      }
      if (excerpt) {
        hits.push({
          subtitle: "概要",
          anchor: "_top",
          url: page.url,
          excerpt
        });
      }
    }

    // 表示（最大3章くらいに絞る等は好み。仕様に合わせて全部出す）
    for (const h of hits) {
      const div = document.createElement("div");
      div.className = "page-result";
      div.innerHTML = `
        <p class="subtitle"><a href="${h.url}#${h.anchor}">${Utils.escapeHtml(h.subtitle)}</a></p>
        <p class="excerpt">${h.excerpt}</p>
      `;
      div.querySelector("a")
        ?.addEventListener("click", () => this.dialog.close());
      container.appendChild(div);
    }
  }

  /**
   * 対象ページHTMLを取得して「章ごとのテキスト」と「安定anchor」を作る
   * - (^^ゞ) などに依存しない：番号ベース anchor
   * - #readme 内を対象
   * - 見出し(h2/h3)ごとに、その見出し〜次の見出しまでのテキストを抽出
   */
  async getSectionsByFetching(url) {
    if (this.pageCache.has(url)) return this.pageCache.get(url);

    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) {
      this.pageCache.set(url, []);
      return [];
    }
    const html = await res.text();

    const doc = new DOMParser().parseFromString(html, "text/html");
    const readme = doc.getElementById("readme");
    if (!readme) {
      this.pageCache.set(url, []);
      return [];
    }

    // 見出しに安定IDを振る（このdoc内で）
    let h2 = 0, h3 = 0;
    const headings = [...readme.querySelectorAll("h2, h3")];
    for (const h of headings) {
      if (h.tagName === "H2") {
        h.id = `page-link-id-${++h2}`;
        h3 = 0;
      } else {
        h.id = `page-link-id-${h2}-${++h3}`;
      }
    }

    // セクション抽出
    const sections = [];
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      const next = headings[i + 1];

      // h〜nextの間のノードを走査してテキスト化
      const texts = [];
      let node = h.nextSibling;

      while (node && node !== next) {
        if (node.nodeType === 1) {
          const el = node;
          // 見出し自体は除外されてるので、そのままテキスト取得
          texts.push(el.textContent || "");
        } else if (node.nodeType === 3) {
          texts.push(node.nodeValue || "");
        }
        node = node.nextSibling;
      }

      sections.push({
        title: h.textContent?.trim() || "",
        anchor: h.id,
        plain: texts.join("\n").replace(/\s+/g, " ").trim()
      });
    }

    this.pageCache.set(url, sections);
    return sections;
  }
}

/**
 * =========================================================
 * Menu Button / Sidebar Toggle
 * =========================================================
 */
class MenuButton {
  init() {
    this.body = document.body;
    this.button = document.getElementById("menu-button");
    if (!this.button) return;

    this.icon = this.button.querySelector(".icon-menu, .icon-close");
    if (!this.icon) return;

    this.bind();
  }

  open() {
    this.body.classList.add("sidebar-open");
    this.icon.classList.remove("icon-menu");
    this.icon.classList.add("icon-close");
  }

  close() {
    this.body.classList.remove("sidebar-open");
    this.icon.classList.remove("icon-close");
    this.icon.classList.add("icon-menu");
  }

  toggle() {
    this.body.classList.contains("sidebar-open")
      ? this.close()
      : this.open();
  }

  bind() {
    // menu-button click
    this.button.addEventListener("click", () => this.toggle());

    // resize -> 強制クローズ
    window.addEventListener("resize", Utils.debounce(() => {
      this.close();
    }, 150));
  }
}
