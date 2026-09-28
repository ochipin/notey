/* Notey's MiniSearch adapter. Only loaded when the search dialog is opened. */
function normalize(value) {
  return String(value || "").normalize("NFKC").toLowerCase();
}

function tokenizer(language) {
  var segmenter = typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(language || undefined, { granularity: "word" }) : null;
  return function (value) {
    var text = normalize(value);
    if (segmenter) {
      return Array.from(segmenter.segment(text)).filter(function (part) {
        return part.isWordLike;
      }).map(function (part) { return part.segment; });
    }
    // Older WebViews can still search Japanese without a downloaded dictionary.
    return text.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu, " $& ")
      .split(/[^\p{L}\p{N}\p{M}_]+/u).filter(Boolean);
  };
}

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, function (char) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

var graphemes = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

function characters(text) {
  if (graphemes) return Array.from(graphemes.segment(text), function (part) { return part.segment; });
  var parts = [];
  for (var char of text) {
    if (parts.length && /[\p{M}\uFF9E\uFF9F]/u.test(char)) parts[parts.length - 1] += char;
    else parts.push(char);
  }
  return parts;
}

function excerpt(value, terms) {
  var text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  // Map normalized offsets back to the source so full-width text, surrogate
  // pairs and expanding characters are highlighted without corrupting the HTML.
  var normalized = "", starts = [], ends = [], offset = 0;
  for (var char of characters(text)) {
    var part = normalize(char);
    for (var j = 0; j < part.length; j++) {
      starts.push(offset);
      ends.push(offset + char.length);
    }
    normalized += part;
    offset += char.length;
  }
  // Whole-string lowercasing also accounts for contextual forms (e.g. sigma).
  var whole = normalize(text);
  if (whole.length === normalized.length) normalized = whole;
  var unique = Array.from(new Set(terms.map(normalize).filter(Boolean)));
  unique.sort(function (a, b) { return b.length - a.length; });
  var ranges = [];
  if (unique.length) {
    var pattern = new RegExp(unique.map(function (term) {
      return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("|"), "gu");
    var match;
    while ((match = pattern.exec(normalized))) {
      var start = starts[match.index], end = ends[match.index + match[0].length - 1];
      var last = ranges[ranges.length - 1];
      if (last && start <= last[1]) last[1] = Math.max(last[1], end);
      else ranges.push([start, end]);
    }
  }
  // Prefer context around the first match, instead of always quoting the intro.
  var from = ranges.length ? Math.max(0, ranges[0][0] - 55) : 0;
  var to = Math.min(text.length, from + 220);
  if (from > 0 && /[\uDC00-\uDFFF]/.test(text[from])) from--;
  if (to < text.length && /[\uDC00-\uDFFF]/.test(text[to])) to++;
  var html = from ? "…" : "", cursor = from;
  ranges.forEach(function (range) {
    var start = Math.max(from, range[0]), end = Math.min(to, range[1]);
    if (end <= start || start < cursor) return;
    html += escapeHTML(text.slice(cursor, start));
    html += "<mark>" + escapeHTML(text.slice(start, end)) + "</mark>";
    cursor = end;
  });
  return html + escapeHTML(text.slice(cursor, to)) + (to < text.length ? "…" : "");
}

export async function createSearch(MiniSearch, data, language) {
  if (!data || data.version !== 1 || !Array.isArray(data.pages)) {
    throw new Error("Unsupported search data");
  }
  var pages = data.pages;
  var tokenize = tokenizer(language);
  var options = {
    tokenize: tokenize,
    searchOptions: {
      combineWith: "AND",
      prefix: function (term) {
        // A single Japanese character is a useful prefix (数 → 数式).
        // Keep the two-character minimum for Latin prefixes to limit noise.
        return term.length >= 2 || /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(term);
      }
    }
  };
  var articles = new MiniSearch(Object.assign({}, options, {
    fields: ["title", "headings", "content"],
    searchOptions: Object.assign({}, options.searchOptions, { boost: { title: 4, headings: 2 } })
  }));
  var headings = new MiniSearch(Object.assign({}, options, {
    fields: ["title", "content"],
    storeFields: ["page", "section"],
    searchOptions: Object.assign({}, options.searchOptions, { boost: { title: 2 } })
  }));
  var articleDocs = [], headingDocs = [];
  pages.forEach(function (page, i) {
    var sections = page.sections || [];
    articleDocs.push({
      id: i, title: page.title,
      headings: sections.map(function (section) { return section.title; }).join(" "),
      content: [page.description || ""].concat(sections.map(function (section) { return section.content; })).join(" ")
    });
    sections.forEach(function (section, j) {
      if (!section.title || !section.url || !section.url.includes("#")) return;
      headingDocs.push({ id: i + ":" + j, page: i, section: j, title: section.title, content: section.content });
    });
  });
  // Yield between batches so opening/closing the modal stays responsive.
  await articles.addAllAsync(articleDocs, { chunkSize: 25 });
  await headings.addAllAsync(headingDocs, { chunkSize: 50 });

  return {
    search: function (query) {
      var found = articles.search(query);
      var byPage = new Map();
      // Do not repeat the article title in heading records: a title-only match
      // must not invent matches in every section of that article.
      if (found.length) headings.search(query).forEach(function (hit) {
        var matches = byPage.get(hit.page) || [];
        var url = pages[hit.page].sections[hit.section].url;
        if (matches.length < 3 && !matches.some(function (existing) {
          return pages[existing.page].sections[existing.section].url === url;
        })) matches.push(hit);
        byPage.set(hit.page, matches);
      });
      return { results: found.map(function (hit) {
        return { article: hit, headings: byPage.get(hit.id) || [] };
      }) };
    },
    result: function (hit) {
      var page = pages[hit.article.id];
      var terms = Object.keys(hit.article.match);
      var first = hit.headings[0];
      var content = first ? page.sections[first.section].content :
        [page.description || ""].concat(page.sections.map(function (section) {
          return section.title + " " + section.content;
        })).join(" ");
      return {
        url: page.url,
        meta: { title: page.title, crumb: page.crumb },
        excerpt: excerpt(content, terms),
        sections: hit.headings.map(function (match) {
          var section = page.sections[match.section];
          return { title: section.title, url: section.url, excerpt: excerpt(section.content, Object.keys(match.match)) };
        })
      };
    }
  };
}
