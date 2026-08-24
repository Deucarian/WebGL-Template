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

## Ownership boundary

The package owns the generated browser shell only. Viewer UI rendered inside
Unity remains owned by Viewer Navigation, Viewer Shell, UI, and Theming. Model
loading and application commands remain owned by their respective packages.
