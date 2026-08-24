(function () {
  "use strict";

  var colorKeys = [
    "background", "surface", "surfaceRaised", "panel", "border",
    "textPrimary", "textSecondary", "textMuted", "textDisabled",
    "primary", "secondary", "accent", "success", "warning", "error", "info",
    "interactionNormal", "interactionHover", "interactionPressed", "interactionSelected",
    "interactionDisabled", "interactionFocused", "loading", "ready",
    "navigationActive", "navigationInactive"
  ];
  var variableNames = {};
  colorKeys.forEach(function (key) {
    variableNames[key] = "--theme-" + key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  });
  var runtimeStyle = document.createElement("style");
  runtimeStyle.id = "deucarian-webgl-runtime-theme";
  document.head.appendChild(runtimeStyle);
  var current = null;

  function treatment(value) {
    return String(value || "").replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[_.\s]+/g, "-").toLowerCase();
  }

  function isCssColor(value) {
    return typeof value === "string" && !!value.trim() &&
      (!window.CSS || typeof window.CSS.supports !== "function" || window.CSS.supports("color", value));
  }

  function isComplete(snapshot) {
    if (!snapshot || snapshot.isValid !== true || !Array.isArray(snapshot.missingRoles) || snapshot.missingRoles.length !== 0) return false;
    for (var i = 0; i < colorKeys.length; i += 1) {
      if (!isCssColor(snapshot[colorKeys[i]])) return false;
    }
    return Number.isFinite(snapshot.radius) && Number.isFinite(snapshot.borderWidth) &&
      Number.isFinite(snapshot.backdropBlur) && Number.isFinite(snapshot.noiseOpacity);
  }

  function apply(candidate) {
    var snapshot = candidate;
    if (typeof candidate === "string") {
      try { snapshot = JSON.parse(candidate); } catch (_) { return false; }
    }
    if (!isComplete(snapshot)) return false;
    var declarations = colorKeys.map(function (key) {
      return variableNames[key] + ":" + snapshot[key];
    });
    declarations.push("--theme-radius:" + snapshot.radius + "px");
    declarations.push("--theme-border-width:" + snapshot.borderWidth + "px");
    declarations.push("--theme-backdrop-blur:" + snapshot.backdropBlur + "px");
    declarations.push("--theme-noise-opacity:" + snapshot.noiseOpacity);
    runtimeStyle.textContent = ":root{" + declarations.join(";") + ";}";
    current = snapshot;
    document.documentElement.dataset.tone = snapshot.isDark ? "dark" : "light";
    document.documentElement.dataset.surfaceTreatment = treatment(snapshot.surfaceTreatment);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", snapshot.background);
    return true;
  }

  window.DeucarianWebGLTheme = Object.freeze({
    apply: apply,
    getCurrent: function () { return current; }
  });
  apply(window.deucarianWebGLInitialTheme);
})();
