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

async function createShellBrowser() {
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
    matchMedia: () => ({ matches: false }),
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

  remove() {
    this.removed = true;
  }

  focus() {
    this.focused = true;
  }

  addEventListener() {
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
