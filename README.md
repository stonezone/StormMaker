# StormMaker / North Pacific Swell Lab

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Browser-based simulation that teaches how North Pacific storms light up Oʻahu's North Shore. The MVP follows `docs/north_pacific_combined_project_spec.md` and focuses on a single-page canvas experience with editable storms, animated swell rings, and North Shore spot indicators.

## Project Setup

```bash
npm install
npm run dev     # start Vite dev server
npm run build   # production bundle
npm run preview # preview build output locally
```

The dev server exposes the app at http://localhost:5173 by default. Use the preview command before deployment or when sharing a static build.

**Fallback buildless option:** all source files live under `src/` and compile down to the generated `dist/` bundle. If you need a buildless prototype (e.g., for quick sharing), you can serve `index.html` directly and swap the `<script type="module" src="/src/main.js">` tag for `/dist/assets/index.js` after running `npm run build`.

## Repository Layout

- `docs/` – canonical combined specification handed to the coding assistant.
- `src/` – application source: HTML shell, CSS theme/layout, JS modules for state, rendering, and UI.
- `public/` – static assets like favicons or future map imagery (optional for now).

## Usage Highlights

- **Storms tab**: Add storms, drag them while paused, edit heading/speed/power/wind, and delete selected storms when paused.
- **Sites tab**: Live swell height + quality for Sunset, Pipeline, Waimea, Haleʻiwa.
- **Scenario tab**: Load preset historical setups (Historic Major, Central West, Aleutian Low). Loading replaces storms, clears rings, and syncs the simulation clock.
- **Controls**: Play/Pause (Space), Reset (R), Measure (M) toggles the overlay. Tooltips describe each control.
- **Measure tool**: Click + drag on the canvas to view distance and bearing between two points.
- **Help overlay**: Use the Help button for shortcuts and a quick link to the combined spec.
- **macOS launcher**: See below for a one-click AppleScript app that starts/stops the dev server automatically.
- **Simulation constants**: Base time acceleration (3,600× real time), directional swell sectors (120°), sampling tolerance (40 px around ring arc), and `MAX_RADIUS_KM = 6,000` keep physics and measure tool aligned.
- **Diagnostics tab tuning**: Adjust time acceleration, swell sector width, sampling tolerance, ring speed, decay, min energy cutoff, spot energy cap, and storm vector visibility live while the sim runs (persisted + resettable). Diagnostics also show smoothed FPS and active-ring counts.
- **Auto-pause on tab hide**: The sim pauses when the document is hidden and resumes only when you explicitly hit Play again, preventing runaway timelines in background tabs.
- **Accessible tabs**: Primary tabs now expose proper `tablist` semantics—use Left/Right/Home/End (or click) to focus & activate panels with aria-selected/tabindex kept in sync.

## macOS Launcher

An AppleScript launcher lives in `tools/StormMakerLauncher.applescript` with a compiled app bundle at `mac/StormMaker Launcher.app`.

### Build / Refresh the App

```bash
npm run launcher:build
```

This compiles the script into `mac/StormMaker Launcher.app`. Double-click the app (or run `npm run launcher:run` for a one-off invocation) to:

1. Start `npm run dev` on port 5173 (or the `PORT` env var you set) and save its PID to `tools/server.pid`.
2. Wait for the URL to respond, then open it in Safari (falls back to Chrome).
3. Monitor the launched tab/window; when it closes, the script gracefully stops the server (SIGTERM, then SIGKILL if needed) and removes the pidfile.

Repeated runs clean up any orphaned servers before launching, so you can treat the app as a one-click StormMaker starter/stopper.

## Development Roadmap

Implementation phases mirror the spec (skeleton, storms, swell rings, scenarios, polish). Each phase is now represented in code: UI shell (Phase 1), storm interactions (Phase 2), swell rings & spot sampling (Phase 3), scenario loader with presets (Phase 4), and UX polish/accessibility (Phase 5).

## Simulation Parameters

| Constant | Default | Purpose |
| --- | --- | --- |
| `BASE_TIME_ACCELERATION` | 3600 | Simulated hours per real hour (scaled by speed slider). Tunable live in the DIAG panel and persisted for the session. |
| `RING_SECTOR_WIDTH_DEG` | 120° | Angular width of each swell lobe when rendered/sampled. Tunable live (persisted) and resettable. |
| `RING_SAMPLE_TOLERANCE_PX` | 40 px | Pixel buffer between spot distance and ring radius for energy sampling. Tunable live (persisted). |
| `MAX_RADIUS_KM` | 6000 km | Map-wide normalization for swell radius + measure tool distances. |

Adjust these constants in `src/main.js` / `src/physics/swell.js` for different pacing or visualization needs.
