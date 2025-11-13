# Project Intent

- **Problem Statement:** StormMaker provides a browser-based, educational lab for visualizing how North Pacific storms generate surf on Oʻahu’s North Shore, letting users experiment with storm parameters and immediately see swell impacts.

## Core Features
1. Interactive storm creation/editing with drag-to-move behavior while paused.
2. Animated swell propagation (rings) with per-spot energy sampling and qualitative surf labels.
3. Scenario loader with curated storm presets plus play/pause/reset/time controls.
4. Canvas measure tool for distance/bearing plus diagnostics readout and keyboard shortcuts.
5. macOS AppleScript launcher for one-click dev server start/stop.

## Tech Stack
- **Framework:** Vanilla JavaScript + Vite bundler (ES modules, HTML5 canvas).
- **Testing:** Vitest.
- **Tooling:** npm scripts, custom AppleScript launcher; no backend runtime required (static hosting).
