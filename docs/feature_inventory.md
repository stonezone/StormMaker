# Feature Inventory

## Game Interface
- **Header + Tabs**: Storms, Sites, Env, Scenario, Diag tabs for switching side-panel content.
- **Canvas Map**: Renders background artwork, storms, swell rings, and Oʻahu inset; supports measure overlay.
- **Control Bar**: Play, Pause, Reset, Measure buttons plus time display and speed slider (0.5x–3.0x).

## Storm Management
- Add storm placement mode (click map to place).
- List of storms with selection + editable parameters (heading, speed, power, wind, X/Y position).
- Drag storms on canvas while paused.
- Delete storms via scenario reset (currently no dedicated delete button).

## Simulation Mechanics
- Storms emit swell rings every 3 simulated hours.
- Swell propagation animates rings with energy decay and visual intensity.
- North Shore spots sample energy and display qualitative surf states (Flat/Fun/Solid/XL).
- Scenario loader with three presets (Historic Major, Central West, Aleutian Low).

## Tools & Utilities
- Measure tool for distance/bearing on canvas.
- Diagnostics panel (frame time, ring count placeholders).
- macOS AppleScript launcher to start/stop dev server and open browser.
- Vitest unit tests (physics + scenario metadata).

## Documentation & Scripts
- README with setup instructions, launcher usage, and roadmap.
- npm scripts: dev/build/preview/test, launcher:build/run.
