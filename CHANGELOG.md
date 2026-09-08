# Changelog

## Unreleased

### Fixed

- Keep intermediate loading progress below 100%; only explicit application and
  engine readiness can finish the shared frosted-glass loader.
- Clarify the initialization wait and startup timeout, and preserve visible
  errors across late readiness events and reveal animations.

## [0.1.0] - 2026-08-24

### Added

- Extracted the Report Viewer-proven responsive Unity WebGL browser shell.
- Added generic loading, ready, timeout, failure, retry, warning, fullscreen,
  reduced-motion, and browser theme behavior.
- Added a Unity WebGL lifecycle/progress/theme bridge.
- Added explicit Build Pipeline synchronization, selection, and validation.
