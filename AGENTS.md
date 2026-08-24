# Deucarian WebGL Template Agent Notes

Package ID: `com.deucarian.webgl-template`

Follow the canonical Deucarian Package Registry architecture rules.

## Ownership

This package owns the reusable browser page generated around Deucarian Unity
WebGL players, its loading/failure/fullscreen shell, theme bridge, Unity WebGL
interop, and explicit synchronization into `Assets/WebGLTemplates`.

It must not own viewer domain commands, model loading, Activity behavior,
camera/navigation behavior, backend DTOs, deployment, or hosting.

## Policies

- Keep browser state generic and product-neutral.
- Never include access tokens, model URLs, or command payloads in shell state.
- Keep the project copy explicit and reproducible through Build Pipeline.
- Do not silently change Player Settings outside an explicit provider sync.
- Use exact browser events; no wildcard origins or legacy product globals.

## Validation

Run the Package Registry validator, Unity EditMode tests, browser contract tests,
and `git diff --check`.
