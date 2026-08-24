(function () {
  "use strict";

  var factory = {
    create: function (options) {
      var canvas = options.canvas;
      var container = document.querySelector("#unity-container");
      var overlay = document.querySelector("#unity-loading-overlay");
      var status = document.querySelector("#unity-loading-status");
      var progress = document.querySelector("#unity-progress");
      var progressBar = document.querySelector("#unity-progress-bar");
      var progressPercentage = document.querySelector("#unity-progress-percentage");
      var warningStack = document.querySelector("#unity-warning");
      var failureMessage = document.querySelector("#unity-failure-message");
      var retryButton = document.querySelector("#unity-retry-button");
      var fullscreenButton = document.querySelector("#unity-fullscreen-button");
      var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      var stalledTimeoutMilliseconds = 150000;
      var warningSequence = 0;
      var highestProgress = 0;
      var highestStageRank = 0;
      var stalledTimer = 0;
      var engineReady = false;
      var applicationReady = false;
      var revealed = false;
      var failed = false;

      var stages = Object.freeze({
        application: { start: 0, end: 0.65, rank: 0, label: "Loading application" },
        connecting: { start: 0.65, end: 0.70, rank: 1, label: "Connecting" },
        downloading: { start: 0.70, end: 0.88, rank: 2, label: "Downloading model" },
        opening: { start: 0.88, end: 0.94, rank: 3, label: "Opening model" },
        preparing: { start: 0.94, end: 0.99, rank: 4, label: "Preparing viewer" },
        ready: { start: 1, end: 1, rank: 5, label: "Viewer ready" }
      });

      function clamp(value) {
        var number = Number(value);
        if (!Number.isFinite(number)) return 0;
        return Math.max(0, Math.min(1, number > 1 && number <= 100 ? number / 100 : number));
      }

      function clearStalledTimer() {
        if (!stalledTimer) return;
        window.clearTimeout(stalledTimer);
        stalledTimer = 0;
      }

      function armStalledTimer() {
        clearStalledTimer();
        if (failed || revealed) return;
        stalledTimer = window.setTimeout(function () {
          showFailure("The viewer stopped responding while it was loading. Try again.");
        }, stalledTimeoutMilliseconds);
      }

      function render(value, stage) {
        if (failed || revealed) return;
        var normalized = clamp(value);
        if (normalized > highestProgress) {
          highestProgress = normalized;
          armStalledTimer();
        }
        if (stage && stage.rank >= highestStageRank) {
          highestStageRank = stage.rank;
          status.textContent = stage.label;
        }
        var percentage = Math.round(highestProgress * 100);
        progressBar.style.width = percentage + "%";
        progress.setAttribute("aria-valuenow", percentage.toString());
        progressPercentage.textContent = percentage + "%";
      }

      function canonical(value) {
        return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      }

      function resolveStage(phase, displayText) {
        var key = canonical(phase);
        var copy = canonical(displayText);
        if (key.includes("ready") || copy.includes("ready")) return stages.ready;
        if (key.includes("final") || key.includes("prepar") || key.includes("discover") || key.includes("instantiat")) return stages.preparing;
        if (key.includes("bundle") || key.includes("open") || key.includes("content")) return stages.opening;
        if (key.includes("download")) return stages.downloading;
        if (key.includes("connect") || key.includes("context") || key.includes("project") || key.includes("resolv")) return stages.connecting;
        if (copy.includes("prepar") || copy.includes("final")) return stages.preparing;
        if (copy.includes("open")) return stages.opening;
        if (copy.includes("download")) return stages.downloading;
        if (copy.includes("connect")) return stages.connecting;
        return stages.application;
      }

      function reportLoadingProgress(detail) {
        if (typeof detail === "string") {
          try { detail = JSON.parse(detail); } catch (_) { detail = { phase: detail }; }
        }
        detail = detail || {};
        var phase = detail.phase || detail.Phase || detail.stage || detail.Stage || "";
        var displayText = detail.displayText || detail.DisplayText || detail.display_text || detail.message || detail.Message || "";
        var normalized = detail.normalizedProgress ?? detail.NormalizedProgress ?? detail.normalized_progress ?? detail.normalized ?? detail.progress ?? detail.Progress ?? 0;
        var phaseKey = canonical(phase);
        if (phaseKey.includes("failed") || phaseKey.includes("error")) {
          showFailure(displayText);
          return;
        }
        var stage = resolveStage(phase, displayText);
        render(stage.start + clamp(normalized) * (stage.end - stage.start), stage);
      }

      function setApplicationProgress(value) {
        render(clamp(value) * stages.application.end, stages.application);
      }

      function showFailure(message) {
        failed = true;
        clearStalledTimer();
        failureMessage.textContent = message && String(message).trim()
          ? String(message).trim()
          : "Check your connection and try again.";
        overlay.hidden = false;
        overlay.dataset.state = "error";
        overlay.setAttribute("aria-busy", "false");
        fullscreenButton.hidden = true;
        retryButton.focus({ preventScroll: true });
      }

      function showWarning(message, type) {
        var kind = type === "error" ? "error" : type === "warning" ? "warning" : "info";
        if (kind === "error" && !revealed) {
          showFailure(message);
          return;
        }
        var banner = document.createElement("div");
        banner.id = "unity-banner-" + (++warningSequence);
        banner.className = "shell-surface warning-card warning-card--" + kind;
        banner.setAttribute("role", kind === "error" ? "alert" : "status");
        var marker = document.createElement("span");
        marker.className = "warning-marker";
        marker.setAttribute("aria-hidden", "true");
        marker.textContent = kind === "info" ? "i" : "!";
        var copy = document.createElement("p");
        copy.textContent = message;
        banner.append(marker, copy);
        warningStack.appendChild(banner);
        if (kind !== "error") {
          window.setTimeout(function () {
            banner.classList.add("warning-card--leaving");
            window.setTimeout(function () { banner.remove(); }, 220);
          }, 5000);
        }
      }

      function revealIfReady() {
        if (revealed || failed || !engineReady || !applicationReady) return;
        render(1, stages.ready);
        revealed = true;
        clearStalledTimer();
        fullscreenButton.hidden = false;
        canvas.tabIndex = 0;
        container.classList.add("viewer-loaded");
        overlay.dataset.state = "complete";
        overlay.setAttribute("aria-busy", "false");
        window.setTimeout(function () {
          overlay.hidden = true;
          if (window.self === window.top) canvas.focus({ preventScroll: true });
        }, reducedMotion.matches ? 0 : 400);
      }

      function markEngineReady() {
        engineReady = true;
        setApplicationProgress(1);
        revealIfReady();
      }

      function acceptState(event) {
        var detail = event && event.detail || {};
        var state = canonical(detail.state);
        if (state === "ready") {
          applicationReady = true;
          revealIfReady();
        } else if (state === "failed" || state === "error") {
          showFailure(detail.message || detail.error);
        }
      }

      function acceptCommandEvent(event) {
        var detail = event && event.detail || {};
        if (detail.event_name === "viewer_ready") {
          applicationReady = true;
          revealIfReady();
        } else if (detail.event_name === "viewer_failed") {
          showFailure(detail.payload && detail.payload.message);
        }
      }

      canvas.addEventListener("contextmenu", function (event) { event.preventDefault(); });
      retryButton.addEventListener("click", function () { window.location.reload(); });
      window.addEventListener("deucarian-viewer-state", acceptState);
      window.addEventListener("deucarian-command-event", acceptCommandEvent);
      armStalledTimer();

      return Object.freeze({
        setApplicationProgress: setApplicationProgress,
        reportLoadingProgress: reportLoadingProgress,
        showFailure: showFailure,
        showWarning: showWarning,
        markEngineReady: markEngineReady
      });
    }
  };

  window.DeucarianWebGLShell = factory;
})();
