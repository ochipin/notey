// A controllable Pagefind module: promises make race regressions deterministic.
const state = window.__searchTest;
const language = document.documentElement.lang.startsWith('ja') ? 'ja' : 'en';
const prefix = '/review/' + language + '/article/';
async function pause(key) {
  state.pending.push(key);
  await new Promise(resolve => { state.release[key] = resolve; });
  state.completed.push(key);
}
export async function options() {}
export async function init() {}
export async function debouncedSearch(query) {
  state.calls.push(query);
  const settings = state.queries[query] || {};
  if (settings.holdSearch) await pause(query + ':search');
  return {
    results: Array.from({ length: settings.count ?? 13 }, (_, index) => ({
      data: async () => {
        state.rows.push(query + ':' + index);
        if (settings.holdRowsFrom !== undefined && index >= settings.holdRowsFrom) {
          await pause(query + ':row:' + index);
        }
        const url = prefix + '?query=' + encodeURIComponent(query) + '&article=' + index;
        const headings = [
          { title: 'Page-level result', url, excerpt: 'Page result, not a heading' },
          { title: 'Install <literal>', url: url + '#install', excerpt: '<mark>' + query + '</mark> install' },
          { title: 'Install duplicate', url: url + '#install', excerpt: 'Duplicate anchor' },
          { title: 'Empty anchor', url: url + '#', excerpt: 'Not a heading' },
          { title: 'Upgrade', url: url + '#upgrade', excerpt: '<mark>' + query + '</mark> upgrade' },
          { title: 'Troubleshooting', url: url + '#troubleshooting', excerpt: '<mark>' + query + '</mark> troubleshoot' },
          { title: 'Extra', url: url + '#extra', excerpt: 'Fourth heading must not be shown' }
        ];
        return {
          url, meta: { title: query + ' article ' + index, crumb: 'Docs / Search' },
          excerpt: 'Article excerpt <mark>' + query + '</mark> ' + index,
          sub_results: settings.noHeadings ? [] : headings.map((heading, i) => i ? { ...heading, anchor: { element: 'h2' } } : heading)
        };
      }
    }))
  };
}
