/* Notey credits — a shared dialog above the page or search results. */
(function () {
  "use strict";
  var doc = document;
  var dlg = doc.getElementById("credits-dialog");
  if (!dlg) return;

  var opener = null;
  var backdropPress = false;

  doc.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-credits-open]");
    if (!trigger || dlg.open) return;
    opener = trigger;
    // Start with the compact overview, even after reading long notice lists.
    dlg.querySelectorAll("details").forEach(function (detail) { detail.open = false; });
    dlg.showModal();
    dlg.querySelector(".cdlg-body").scrollTop = 0;
    doc.getElementById("credits-title").focus({ preventScroll: true });
  });

  dlg.addEventListener("pointerdown", function (e) {
    backdropPress = e.target === dlg;
  });
  dlg.addEventListener("click", function (e) {
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
