mergeInto(LibraryManager.library, {
  DeucarianWebGLShellReportState: function (jsonPointer) {
    if (typeof window === "undefined") return;
    var raw = UTF8ToString(jsonPointer);
    var detail;
    try {
      detail = JSON.parse(raw);
    } catch (_) {
      detail = { state: "failed", message: "The viewer returned an invalid lifecycle state." };
    }
    window.DeucarianWebGLLastState = detail;
    window.dispatchEvent(new CustomEvent("deucarian-viewer-state", { detail: detail }));
  },

  DeucarianWebGLShellReportProgress: function (jsonPointer) {
    if (typeof window === "undefined" || !window.DeucarianWebGLShell) return;
    var raw = UTF8ToString(jsonPointer);
    try {
      window.DeucarianWebGLShell.reportLoadingProgress(JSON.parse(raw));
    } catch (_) {
      window.DeucarianWebGLShell.showWarning(
        "Viewer loading progress could not be displayed.",
        "warning");
    }
  },

  DeucarianWebGLShellApplyTheme: function (jsonPointer) {
    if (typeof window === "undefined" || !window.DeucarianWebGLTheme) return;
    try {
      window.DeucarianWebGLTheme.apply(JSON.parse(UTF8ToString(jsonPointer)));
    } catch (_) {
      if (window.console) {
        window.console.warn("[DeucarianWebGL] Invalid runtime theme snapshot ignored.");
      }
    }
  }
});
