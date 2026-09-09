import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const templateRoot = new URL(
  "../../WebGLTemplates~/DeucarianViewer/",
  import.meta.url);

test("template owns the generic two-stage ready shell", async () => {
  const index = await readFile(new URL("index.html", templateRoot), "utf8");
  const shell = await readFile(
    new URL("TemplateData/shell.js", templateRoot),
    "utf8");

  assert.match(index, /createUnityInstance/);
  assert.match(index, /PRODUCT_NAME/);
  assert.match(shell, /engineReady/);
  assert.match(shell, /applicationReady/);
  assert.match(shell, /deucarian-viewer-state/);
  assert.match(shell, /deucarian-command-event/);
  assert.match(index, /aria-label="Building Virtuality"/);
  assert.match(index, /viewBox="0 0 436 232"/);
  assert.doesNotMatch(index + shell, /Simultria Report Viewer/);
});

test("runtime bridge and shell share canonical globals", async () => {
  const shell = await readFile(
    new URL("TemplateData/shell.js", templateRoot),
    "utf8");
  const theme = await readFile(
    new URL("TemplateData/theme.js", templateRoot),
    "utf8");
  const plugin = await readFile(
    new URL("../../Runtime/Plugins/WebGL/DeucarianWebGLShell.jslib", import.meta.url),
    "utf8");

  assert.match(shell, /window\.DeucarianWebGLShell/);
  assert.match(theme, /window\.DeucarianWebGLTheme/);
  assert.match(plugin, /window\.DeucarianWebGLShell/);
  assert.match(plugin, /window\.DeucarianWebGLTheme/);
});

test("engine completion does not reveal the canvas before viewer_ready", async () => {
  const browser = await createShellBrowser();

  browser.shell.setApplicationProgress(0.5);
  assert.equal(browser.progressBar.style.width, "33%");
  assert.equal(browser.progress.getAttribute("aria-valuenow"), "33");

  browser.shell.markEngineReady();
  assert.equal(browser.overlay.dataset.state, "loading");
  assert.equal(browser.container.classList.contains("viewer-loaded"), false);
  assert.equal(browser.overlay.hidden, false);

  browser.window.dispatchEvent(new browser.CustomEvent(
    "deucarian-command-event",
    { detail: { event_name: "viewer_ready" } }));

  assert.equal(browser.overlay.dataset.state, "complete");
  assert.equal(browser.container.classList.contains("viewer-loaded"), true);
  assert.equal(browser.canvas.tabIndex, 0);
  browser.runTimers(400);
  assert.equal(browser.overlay.hidden, true);
});

test("startup failure stays visible with a retry message", async () => {
  const browser = await createShellBrowser();

  browser.window.dispatchEvent(new browser.CustomEvent(
    "deucarian-viewer-state",
    { detail: { state: "failed", message: "Model download failed." } }));

  assert.equal(browser.overlay.dataset.state, "error");
  assert.equal(browser.overlay.hidden, false);
  assert.equal(browser.failureMessage.textContent, "Model download failed.");
  assert.equal(browser.retryButton.focused, true);
});

test("intermediate ready text and progress phases never announce final readiness", async () => {
  const browser = await createShellBrowser();
  browser.shell.markEngineReady();

  for (const detail of [
    { phase: "model", displayText: "AssetBundle content is ready.", normalizedProgress: 1 },
    { phase: "DiscoveringContent", displayText: "AssetBundle content is ready.", normalizedProgress: 1 },
    { phase: "model", displayText: "Ready with AssetBundle object from 2 GameObject asset(s).", normalizedProgress: 1 },
    { phase: "ready", normalizedProgress: 1 },
    { phase: "Completed", normalizedProgress: 100 },
    { phase: "not_ready", displayText: "Viewer ready", normalizedProgress: Infinity }
  ]) {
    browser.shell.reportLoadingProgress(detail);
    assert.equal(browser.overlay.dataset.state, "loading");
    assert.equal(browser.status.textContent, "Preparing viewer");
    assert.equal(browser.progress.getAttribute("aria-valuenow"), "99");
    assert.equal(browser.overlay.hidden, false);
    assert.equal(browser.container.classList.contains("viewer-loaded"), false);
  }
});

test("engine readiness shows an explicit initialization wait, unaffected by late engine progress", async () => {
  const browser = await createShellBrowser();
  browser.shell.markEngineReady();
  assert.equal(browser.status.textContent, "Waiting for viewer initialization");
  assert.equal(browser.progressBar.style.width, "65%");
  browser.shell.setApplicationProgress(1);
  browser.shell.markEngineReady();
  assert.equal(browser.status.textContent, "Waiting for viewer initialization");
  browser.shell.reportLoadingProgress({ phase: "downloading", normalizedProgress: 0.5 });
  assert.equal(browser.status.textContent, "Downloading model");
  assert.equal(browser.progressBar.style.width, "79%");
});

for (const readyEvent of ["deucarian-viewer-state", "deucarian-command-event"]) {
  for (const engineFirst of [true, false]) {
    test(`${readyEvent} requires both explicit readiness signals, engine first: ${engineFirst}`, async () => {
      const browser = await createShellBrowser();
      const signalApplication = () => browser.window.dispatchEvent(new browser.CustomEvent(
        readyEvent, { detail: readyEvent === "deucarian-viewer-state"
          ? { state: "ready" } : { event_name: "viewer_ready" } }));

      if (engineFirst) browser.shell.markEngineReady();
      else signalApplication();
      assert.equal(browser.overlay.dataset.state, "loading");
      assert.equal(browser.overlay.hidden, false);
      assert.notEqual(browser.status.textContent, "Viewer ready");
      assert.notEqual(browser.progress.getAttribute("aria-valuenow"), "100");

      if (engineFirst) signalApplication();
      else browser.shell.markEngineReady();
      assert.equal(browser.status.textContent, "Viewer ready");
      assert.equal(browser.progressBar.style.width, "100%");
      assert.equal(browser.overlay.dataset.state, "complete");
      browser.runTimers(400);
      assert.equal(browser.overlay.hidden, true);
      browser.runTimers(150000);
      assert.equal(browser.overlay.dataset.state, "complete");
    });
  }
}

test("a loading lifecycle revokes early application readiness until it is explicitly ready again", async () => {
  const browser = await createShellBrowser();
  const state = value => browser.window.dispatchEvent(new browser.CustomEvent(
    "deucarian-viewer-state", { detail: { state: value } }));
  state("ready");
  state("loading");
  browser.shell.markEngineReady();
  assert.equal(browser.overlay.dataset.state, "loading");
  state("ready");
  assert.equal(browser.overlay.dataset.state, "complete");
});

test("a loading command event revokes early application readiness", async () => {
  const browser = await createShellBrowser();
  const event = name => browser.window.dispatchEvent(new browser.CustomEvent(
    "deucarian-command-event", { detail: { event_name: name } }));
  event("viewer_ready");
  event("viewer_loading");
  browser.shell.markEngineReady();
  assert.equal(browser.overlay.dataset.state, "loading");
  event("viewer_ready");
  assert.equal(browser.overlay.dataset.state, "complete");
});

test("failure is terminal despite later progress, readiness and timeout callbacks", async () => {
  const browser = await createShellBrowser();
  browser.shell.showFailure("Initialization failed.");
  browser.shell.markEngineReady();
  browser.shell.reportLoadingProgress({ phase: "ready", normalizedProgress: 1 });
  browser.window.dispatchEvent(new browser.CustomEvent(
    "deucarian-viewer-state", { detail: { state: "ready" } }));
  browser.window.dispatchEvent(new browser.CustomEvent(
    "deucarian-command-event", { detail: { event_name: "viewer_ready" } }));
  browser.shell.showFailure("A later error.");
  browser.runTimers(150000);
  browser.runTimers(400);
  assert.equal(browser.overlay.dataset.state, "error");
  assert.equal(browser.overlay.hidden, false);
  assert.equal(browser.status.textContent, "Viewer unavailable");
  assert.equal(browser.failureMessage.textContent, "Initialization failed.");
  assert.equal(browser.fullscreenButton.hidden, true);
  assert.equal(browser.canvas.tabIndex, -1);
});

for (const reducedMotion of [false, true]) {
  test(`failure during reveal stays visible and cannot focus the canvas, reduced motion: ${reducedMotion}`, async () => {
    const browser = await createShellBrowser({ reducedMotion });
    browser.shell.markEngineReady();
    browser.window.dispatchEvent(new browser.CustomEvent(
      "deucarian-viewer-state", { detail: { state: "ready" } }));
    browser.window.dispatchEvent(new browser.CustomEvent(
      "deucarian-command-event", { detail: {
        event_name: "viewer_failed", payload: { message: "Initialization failed." }
      } }));
    browser.runTimers(reducedMotion ? 0 : 400);
    assert.equal(browser.overlay.dataset.state, "error");
    assert.equal(browser.overlay.hidden, false);
    assert.equal(browser.canvas.focused, false);
    assert.equal(browser.retryButton.focused, true);
  });
}

test("startup timeout distinguishes engine startup from application initialization", async () => {
  const startup = await createShellBrowser();
  startup.runTimers(150000);
  assert.equal(startup.failureMessage.textContent, "The application did not finish starting. Try again.");
  assert.equal(startup.overlay.dataset.state, "error");

  const initialization = await createShellBrowser();
  initialization.shell.markEngineReady();
  initialization.shell.reportLoadingProgress({ phase: "model", displayText: "AssetBundle content is ready.", normalizedProgress: 1 });
  initialization.runTimers(150000);
  assert.equal(initialization.failureMessage.textContent, "The viewer did not finish initialization. Try again.");
  assert.equal(initialization.overlay.dataset.state, "error");
  assert.equal(initialization.overlay.hidden, false);
  assert.equal(initialization.progressBar.style.width, "99%");
});

test("disposed startup reports closure immediately rather than waiting for timeout", async () => {
  const browser = await createShellBrowser();
  browser.shell.markEngineReady();
  browser.window.dispatchEvent(new browser.CustomEvent(
    "deucarian-viewer-state", { detail: { state: "disposed" } }));
  browser.runTimers(150000);
  assert.equal(browser.overlay.dataset.state, "error");
  assert.equal(browser.failureMessage.textContent, "The viewer was closed. Reload to try again.");
});

test("model initialization has a truthful stage and never returns to engine loading", async () => {
  const browser = await createShellBrowser();
  browser.shell.markEngineReady();
  browser.window.dispatchEvent(new browser.CustomEvent("deucarian-viewer-state", {
    detail: { state: "loading", message: "Loading model" }
  }));
  assert.equal(browser.status.textContent, "Loading model");
  browser.shell.reportLoadingProgress({ phase: "model", displayText: "Resolving model source.", normalized: 0 });
  assert.notEqual(browser.status.textContent, "Loading application");
  browser.shell.reportLoadingProgress({ phase: "downloading", normalized: 0.5 });
  browser.shell.reportLoadingProgress({ phase: "model", displayText: "Unrecognized work", normalized: 0 });
  assert.equal(browser.status.textContent, "Downloading model");
  assert.equal(browser.overlay.hidden, false);
  assert.notEqual(browser.progressBar.style.width, "100%");
});

test("build-profile fallback has a fixed persistent notice separate from progress", async () => {
  const browser = await createShellBrowser();
  browser.shell.reportLoadingProgress({ phase: "build_profile_fallback", displayText: "Production" });
  assert.equal(browser.startupNotice.hidden, false);
  assert.equal(browser.startupNotice.textContent, "Version record not found. Using the Production build profile.");
  browser.shell.markEngineReady();
  browser.shell.reportLoadingProgress({ phase: "downloading", normalized: 0.5 });
  assert.equal(browser.status.textContent, "Downloading model");
  assert.match(browser.startupNotice.textContent, /Production build profile/);
  assert.equal(browser.overlay.hidden, false);
  const exact = await createShellBrowser();
  exact.shell.reportLoadingProgress({ phase: "resolving_environment", normalized: 0 });
  assert.equal(exact.startupNotice.hidden, true);
});

test("fallback accepts only built-in environment identifiers and never exposes supplied text", async () => {
  for (const text of ["Local", "Production token=SYNTHETIC_ONLY", "https://host.example/?token=SYNTHETIC_ONLY"]) {
    const browser = await createShellBrowser();
    browser.shell.reportLoadingProgress({ phase: "build_profile_fallback", displayText: text });
    assert.equal(browser.startupNotice.hidden, true);
    assert.doesNotMatch(browser.status.textContent + browser.startupNotice.textContent, /SYNTHETIC_ONLY/);
  }
});

test("a cached pre-listener failure is replayed without revealing after late readiness", async () => {
  const browser = await createShellBrowser({ lastState: { state: "failed", message: "viewer_parent_origin_invalid" } });
  assert.equal(browser.overlay.dataset.state, "error");
  assert.match(browser.failureMessage.textContent, /trusted parent origin/);
  browser.shell.markEngineReady();
  browser.window.dispatchEvent(new browser.CustomEvent("deucarian-viewer-state", { detail: { state: "ready" } }));
  browser.runTimers(400);
  assert.equal(browser.overlay.hidden, false);
});

test("failure boundaries discard remote error text and retain only known diagnostics", async () => {
  const unsafe = [
    "Authorization: Bearer SYNTHETIC_ONLY", "access_token=SYNTHETIC_ONLY",
    '{"accessToken":"SYNTHETIC_ONLY"}', "password=multiple words SYNTHETIC_ONLY",
    "https://user:SYNTHETIC_ONLY@host.example/path?token=SYNTHETIC_ONLY", "\nsecret: SYNTHETIC_ONLY",
    "x".repeat(10000) + "SYNTHETIC_ONLY"
  ];
  for (const text of unsafe) {
    const browser = await createShellBrowser();
    browser.shell.showFailure(text);
    assert.equal(browser.failureMessage.textContent, "The viewer could not start. Reload to try again.");
    assert.doesNotMatch(browser.failureMessage.textContent, /SYNTHETIC_ONLY/);
  }
  const classified = await createShellBrowser();
  classified.window.dispatchEvent(new classified.CustomEvent("deucarian-viewer-state", {
    detail: { state: "failed", code: "viewer_environment_resolution_failed", message: unsafe[0] }
  }));
  assert.match(classified.failureMessage.textContent, /version directory/);
  assert.doesNotMatch(classified.failureMessage.textContent, /SYNTHETIC_ONLY/);
});

test("engine rejection and warning presentation cannot display raw payload text", async () => {
  const index = await readFile(new URL("index.html", templateRoot), "utf8");
  assert.doesNotMatch(index, /shell\.showFailure\(error/);
  const browser = await createShellBrowser();
  browser.shell.showWarning("Authorization: Bearer SYNTHETIC_ONLY", "warning");
  assert.equal(browser.warningStack.children.length, 1);
  assert.doesNotMatch(browser.warningStack.children[0].children[1].textContent, /SYNTHETIC_ONLY/);
});

for (const failureMode of ["download", "synchronous", "rejected"]) {
  test(`actual template handles ${failureMode} engine failure without exposing details`, async () => {
    const html = await readFile(new URL("index.html", templateRoot), "utf8");
    const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1]
      .replace(/^#(?:if|endif).*$/gm, "")
      .replace(/\{\{\{ JSON.stringify\([A-Z_]+\) \}\}\}/g, '"Test Viewer"')
      .replace(/\{\{\{[\s\S]*?\}\}\}/g, "test-file");
    const listeners = new Map();
    const failures = [];
    let engineReady = false;
    const shell = {
      showFailure: code => failures.push(code),
      showWarning() {}, setApplicationProgress() {},
      markEngineReady: () => { engineReady = true; }
    };
    const document = {
      querySelector: () => new FakeElement(),
      createElement: () => ({ addEventListener: (name, callback) => listeners.set(name, callback) }),
      body: { appendChild() {} }
    };
    vm.runInNewContext(script, {
      document, window: { DeucarianWebGLShell: { create: () => shell } },
      createUnityInstance() {
        const error = new Error("Authorization: Bearer SYNTHETIC_ONLY");
        if (failureMode === "synchronous") throw error;
        return Promise.reject(error);
      }
    });
    listeners.get(failureMode === "download" ? "error" : "load")();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(failures, [failureMode === "download" ? "engine_load_failed" : "engine_start_failed"]);
    assert.equal(engineReady, false);
  });
}

test("retry reloads the page and does not synthesize viewer readiness", async () => {
  const browser = await createShellBrowser();
  browser.shell.showFailure("viewer_connection_failed");
  browser.retryButton.dispatch("click");
  assert.equal(browser.window.location.reloadCount, 1);
  assert.equal(browser.overlay.dataset.state, "error");
  assert.equal(browser.container.classList.contains("viewer-loaded"), false);
});

test("fallback notices accept all deployable profiles and ignore terminal late notices", async () => {
  for (const environment of ["Production", "Development", "Testing", "Acceptance"]) {
    const browser = await createShellBrowser();
    browser.shell.reportLoadingProgress({ phase: "build_profile_fallback", displayText: environment.toUpperCase() });
    assert.match(browser.startupNotice.textContent, new RegExp(environment + " build profile"));
  }
  for (const terminal of ["failed", "ready"]) {
    const browser = await createShellBrowser();
    browser.shell.markEngineReady();
    browser.window.dispatchEvent(new browser.CustomEvent("deucarian-viewer-state", { detail: { state: terminal } }));
    browser.shell.reportLoadingProgress({ phase: "build_profile_fallback", displayText: "Production" });
    assert.equal(browser.startupNotice.hidden, true);
  }
});

async function createShellBrowser({ reducedMotion = false, lastState } = {}) {
  const source = await readFile(
    new URL("TemplateData/shell.js", templateRoot),
    "utf8");
  const elements = new Map();
  const timers = [];
  const listeners = new Map();
  const CustomEvent = class {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  const window = {
    self: null,
    top: null,
    location: { reloadCount: 0, reload() { this.reloadCount++; } },
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout(callback, delay) {
      timers.push({ callback, delay, cancelled: false });
      return timers.length;
    },
    clearTimeout(id) {
      const timer = timers[id - 1];
      if (timer) timer.cancelled = true;
    },
    addEventListener(type, callback) {
      const callbacks = listeners.get(type) ?? [];
      callbacks.push(callback);
      listeners.set(type, callbacks);
    },
    dispatchEvent(event) {
      for (const callback of listeners.get(event.type) ?? []) {
        callback(event);
      }
    }
  };
  window.self = window;
  window.top = window;
  window.DeucarianWebGLLastState = lastState;
  const document = {
    querySelector(selector) {
      return elements.get(selector) ?? null;
    },
    createElement() {
      return new FakeElement();
    }
  };
  const container = addElement(elements, "#unity-container");
  const overlay = addElement(elements, "#unity-loading-overlay");
  overlay.dataset.state = "loading";
  const status = addElement(elements, "#unity-loading-status");
  const startupNotice = addElement(elements, "#unity-startup-notice");
  startupNotice.hidden = true;
  const progress = addElement(elements, "#unity-progress");
  const progressBar = addElement(elements, "#unity-progress-bar");
  const progressPercentage = addElement(elements, "#unity-progress-percentage");
  const warningStack = addElement(elements, "#unity-warning");
  const failureMessage = addElement(elements, "#unity-failure-message");
  const retryButton = addElement(elements, "#unity-retry-button");
  const fullscreenButton = addElement(elements, "#unity-fullscreen-button");
  const canvas = new FakeElement();
  const context = vm.createContext({
    window,
    document,
    CustomEvent,
    Number,
    Object,
    String,
    JSON
  });
  vm.runInContext(source, context);
  const shell = window.DeucarianWebGLShell.create({ canvas });
  window.DeucarianWebGLShell = shell;

  return {
    shell,
    window,
    CustomEvent,
    container,
    overlay,
    status,
    startupNotice,
    progress,
    progressBar,
    progressPercentage,
    warningStack,
    failureMessage,
    retryButton,
    fullscreenButton,
    canvas,
    runTimers(delay) {
      for (const timer of timers) {
        if (!timer.cancelled && timer.delay === delay) {
          timer.cancelled = true;
          timer.callback();
        }
      }
    }
  };
}

function addElement(elements, selector) {
  const element = new FakeElement();
  elements.set(selector, element);
  return element;
}

class FakeElement {
  constructor() {
    this.attributes = new Map();
    this.children = [];
    this.classList = new FakeClassList();
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.tabIndex = -1;
    this.textContent = "";
    this.focused = false;
    this.listeners = new Map();
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  append(...children) {
    this.children.push(...children);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  remove() {
    this.removed = true;
  }

  focus() {
    this.focused = true;
  }

  addEventListener(name, callback) {
    this.listeners.set(name, callback);
  }

  dispatch(name) {
    this.listeners.get(name)?.();
  }
}

class FakeClassList {
  #names = new Set();

  add(name) {
    this.#names.add(name);
  }

  contains(name) {
    return this.#names.has(name);
  }
}
