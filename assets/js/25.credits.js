/* Notey credits — a shared dialog above the page or search results. */
(function () {
  "use strict";
  var doc = document;
  var dlg = doc.getElementById("credits-dialog");
  if (!dlg) return;

  var opener = null;
  var backdropPress = false;
  var content = dlg.querySelector(".cdlg-content");
  var status = dlg.querySelector(".cdlg-status");
  var message = dlg.querySelector(".cdlg-message");
  var retry = dlg.querySelector("[data-credits-retry]");
  var title = doc.getElementById("credits-title");
  var request = null;
  var loaded = false;
  var T = {
    loading: {{ i18n "credits.loading" | jsonify | safeJS }},
    error: {{ i18n "credits.load_error" | jsonify | safeJS }}
  };

  function loadCredits() {
    if (loaded || request) return;
    // Move focus before hiding the retry button; late responses never steal it.
    if (doc.activeElement === retry && dlg.open) title.focus({ preventScroll: true });
    status.hidden = false;
    retry.hidden = true;
    message.textContent = T.loading;
    content.setAttribute("aria-busy", "true");
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15000);
    request = fetch(dlg.dataset.creditsSrc, { signal: controller.signal, credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw new Error("Credits unavailable");
        return response.text();
      })
      .then(function (html) {
        var template = doc.createElement("template");
        template.innerHTML = html;
        var fragment = template.content.querySelector("[data-credits-content]");
        // A host may return its 404 page with HTTP 200. Keep retry available.
        if (!fragment || !fragment.querySelector(".credits-list .credits-item")) throw new Error("Invalid credits content");
        content.replaceChildren(fragment);
        content.hidden = false;
        status.hidden = true;
        loaded = true;
      })
      .catch(function () {
        message.textContent = T.error;
        retry.hidden = false;
        status.hidden = false;
      })
      .finally(function () {
        clearTimeout(timeout);
        content.setAttribute("aria-busy", "false");
        request = null;
      });
  }

  doc.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-credits-open]");
    if (!trigger || dlg.open) return;
    opener = trigger;
    // Start with the compact overview, even after reading long notice lists.
    dlg.querySelectorAll("details").forEach(function (detail) { detail.open = false; });
    dlg.showModal();
    dlg.querySelector(".cdlg-body").scrollTop = 0;
    title.focus({ preventScroll: true });
    loadCredits();
  });

  dlg.addEventListener("pointerdown", function (e) {
    backdropPress = e.target === dlg;
  });
  dlg.addEventListener("click", function (e) {
    if (e.target.closest("[data-credits-retry]")) loadCredits();
    if (e.target.closest("[data-credits-close]") || (e.target === dlg && backdropPress)) dlg.close();
    backdropPress = false;
  });

  dlg.addEventListener("keydown", function (e) {
    if (e.key !== "Tab" || e.defaultPrevented) return;
    var stops = Array.from(dlg.querySelectorAll('a[href], button, summary, [tabindex]:not([tabindex="-1"])'))
      .filter(function (el) {
        if (el.disabled || !el.getClientRects().length || getComputedStyle(el).visibility !== "visible") return false;
        // Closed details can leave layout rectangles on their hidden links.
        var parent = el.parentElement;
        while (parent && parent !== dlg) {
          if (parent.tagName === "DETAILS" && !parent.open) {
            var summary = Array.from(parent.children).find(function (child) { return child.tagName === "SUMMARY"; });
            if (!summary || !summary.contains(el)) return false;
          }
          parent = parent.parentElement;
        }
        return true;
      });
    var index = stops.indexOf(doc.activeElement);
    if (index < 0 || (e.shiftKey ? index === 0 : index === stops.length - 1)) {
      e.preventDefault();
      (stops[e.shiftKey ? stops.length - 1 : 0] || doc.getElementById("credits-title")).focus();
    }
  });
  // Native Escape dismisses only the top dialog. Search stays open underneath.
  dlg.addEventListener("close", function () {
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });
})();
