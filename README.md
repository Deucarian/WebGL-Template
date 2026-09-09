# Deucarian WebGL Template

`com.deucarian.webgl-template` owns the reusable browser page around a Unity
WebGL player. It is extracted from the Report Viewer donor and provides a
responsive canvas, accessible loading progress, ready/failure coordination,
retry, warnings, fullscreen, reduced-motion behavior, and browser theme
synchronization without owning any viewer domain.

Unity discovers custom templates only from a project's
`Assets/WebGLTemplates` directory. Consumer build providers therefore call:

```csharp
DeucarianWebGLTemplate.Synchronize();
DeucarianWebGLTemplate.ApplyTo(profile);
```

Passive project validation composes:

```csharp
DeucarianWebGLTemplate.Validate(profile);
```

The calls delegate file synchronization, Build Profile selection, and drift
validation to `com.deucarian.build-pipeline`. They run only from an explicit
consumer provider synchronization action.

## Browser contract

The runtime bridge and command transport publish product-neutral browser state:

- `deucarian-viewer-state` for loading, ready, failed, and disposed lifecycle;
- `deucarian-command-event` for application events emitted by Command Routing;
- `window.DeucarianWebGLShell` for progress/failure integration; and
- `window.DeucarianWebGLTheme` for validated theme snapshots.

The shell reveals the canvas only after Unity's engine and the application are
both ready. It never receives tokens, model URLs, or backend DTOs.

Progress reports are intermediate work only and cannot produce 100% or
"Viewer ready", even when their text says that AssetBundle content is ready.
Only an explicit `ready` lifecycle state or `viewer_ready` event, together with
engine completion, finishes startup. Engine completion alone shows "Waiting for
viewer initialization". A later loading state before reveal revokes an earlier
application-ready signal.

The 150-second stalled-startup timer distinguishes engine startup from unfinished
application initialization. Failure or disposal remains visible until reload;
late progress, readiness, or a pending reveal animation cannot hide the error.

Early failures cached as `DeucarianWebGLLastState` are replayed when the shell
attaches. Failure messages accept only known diagnostic codes (including
`viewer_parent_origin_invalid`, `viewer_composition_failed`,
`viewer_environment_resolution_failed`, `viewer_connection_failed` and
`viewer_initialization_failed`); unknown strings use fixed generic copy.
Engine rejections and warnings never display raw exception or request text.

`Loading` with the fixed message `Loading model`, or progress phase `model`,
advances beyond engine loading without granting readiness. Progress phase
`resolving_environment` shows connection work. The optional generic
`build_profile_fallback` phase accepts only a built-in Production, Development,
Testing or Acceptance identifier as its display value and shows a separate
notice during startup. The shell reports this routing decision; it never makes
the decision, changes an environment or selects a version itself.

Run the browser contract tests without launching Unity:

```text
node --test Browser~/tests/*.test.mjs
```

## Ownership boundary

The package owns the generated browser shell only. Viewer UI rendered inside
Unity remains owned by Viewer Navigation, Viewer Shell, UI, and Theming. Model
loading and application commands remain owned by their respective packages.
