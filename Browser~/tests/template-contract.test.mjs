import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
