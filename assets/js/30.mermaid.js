/* Mermaid is hosted with the theme; only pages containing diagrams load it. */
(function () {
  "use strict";
  var doc = document;
  var root = doc.documentElement;
  var diagrams = Array.from(doc.querySelectorAll("pre.mermaid"), function (el) {
    return { el: el, source: el.textContent, message: null };
  });
  if (!diagrams.length) return;

  var src = {{ partial "site-url.html" (site.Params.mermaid.url | default "/vendor/mermaid/12.0.0/mermaid.esm.min.mjs") | jsonify | safeJS }};
  var T = {
    invalid: {{ i18n "ui.diagram_error" | jsonify | safeJS }},
    unavailable: {{ i18n "ui.diagram_load_error" | jsonify | safeJS }}
  };
  var mermaid;
  var revision = 0;
  var running = false;
  var nextID = 0;

  function showError(diagram, message) {
    diagram.el.textContent = diagram.source;
    diagram.el.dataset.renderState = "error";
    if (!diagram.message) {
      diagram.message = doc.createElement("p");
      diagram.message.className = "mermaid-error";
      diagram.message.setAttribute("role", "status");
      diagram.el.after(diagram.message);
    }
    diagram.message.textContent = message;
  }

  async function render() {
    revision++;
    if (!mermaid || running) return;
    running = true;
    try {
      // Rendering and initialize share Mermaid's global state. Finish the
      // current operation before applying the most recent theme selection.
      while (true) {
        var current = revision;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          suppressErrorRendering: true,
          theme: root.dataset.theme === "dark" ? "dark" : "default",
          layout: "dagre",
          look: "classic",
          fontFamily: getComputedStyle(doc.body).fontFamily
        });
        for (var diagram of diagrams) {
          diagram.el.dataset.renderState = "loading";
          try {
            var result = await mermaid.render("notey-mermaid-" + nextID++, diagram.source);
            if (current !== revision) break;
            diagram.el.innerHTML = result.svg;
            diagram.el.dataset.renderState = "ready";
            if (result.bindFunctions) result.bindFunctions(diagram.el);
            if (diagram.message) {
              diagram.message.remove();
              diagram.message = null;
            }
          } catch (error) {
            if (current !== revision) break;
            showError(diagram, T.invalid);
            console.warn("Notey: could not render a Mermaid diagram.", error);
          }
        }
        if (current === revision) break;
      }
    } catch (error) {
      diagrams.forEach(function (diagram) { showError(diagram, T.unavailable); });
      console.warn("Notey: could not initialize Mermaid.", error);
    } finally {
      running = false;
    }
  }

  doc.addEventListener("notey:theme", render);
  Promise.all([import(src), doc.fonts ? doc.fonts.ready : Promise.resolve()])
    .then(function (loaded) {
      mermaid = loaded[0].default || loaded[0];
      return render();
    })
    .catch(function (error) {
      diagrams.forEach(function (diagram) { showError(diagram, T.unavailable); });
      console.warn("Notey: could not load Mermaid.", error);
    });
})();
