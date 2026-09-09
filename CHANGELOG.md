# Changelog

## [0.1.1] - 2026-09-08

### Fixed

- Keep intermediate loading progress below 100%; only explicit application and
  engine readiness can finish the shared frosted-glass loader.
- Clarify the initialization wait and startup timeout, and preserve visible
  errors across late readiness events and reveal animations.
- Replay early lifecycle failures, preserve model-loading stages and display
  a safe build-profile fallback notice independently of progress.
- Render only fixed failure/warning copy; never show raw engine exceptions,
  connection details, request URLs or payload text.

## [0.1.0] - 2026-08-24

### Added

- Extracted the Report Viewer-proven responsive Unity WebGL browser shell.
- Added generic loading, ready, timeout, failure, retry, warning, fullscreen,
  reduced-motion, and browser theme behavior.
- Added a Unity WebGL lifecycle/progress/theme bridge.
- Added explicit Build Pipeline synchronization, selection, and validation.
