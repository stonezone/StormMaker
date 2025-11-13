# North Pacific Storm Simulation Game / PacificWaves / StormMaker  
## Combined Project Specification for Implementation

**Last Updated:** 2025-11-12  
**Intended Use:** Hand this document to an AI coding assistant as the single source of truth for implementing the first playable version of the game.

---

## 1. High-Level Concept

This project is a browser-based, 2D simulation game about how **North Pacific storms generate surf on Oʻahu’s North Shore**.

The player places and configures storms over a stylized **North Pacific Ocean** map and watches **swell energy propagate** toward Hawaiʻi. Different storm positions, tracks, and intensities produce different swell directions, periods, and heights at North Shore “spots.”

The product blends three design threads:

1. **Game concept & layout** from the original _North Pacific Storm Simulation Game_ spec:  
   - Fixed satellite-style top-down view of the North Pacific with the US/Alaska on one side, Japan/Russia on the other, and Hawaiʻi near the lower-right.
   - Oʻahu’s North Shore as the primary focus area. fileciteturn0file0L1-L26  

2. **Educational & visual design** from the _PacificWaves_ docs:  
   - “Educational first, game second” mission.  
   - Clean, accessible, playful-but-serious UI and color system. fileciteturn0file1L57-L94  

3. **Storm/swell experimentation & scenario framing** from the StormMaker / PacificWaves design:  
   - Multiple storms, prebuilt scenarios, challenge/learning modes, and measurement tools. fileciteturn0file2L209-L262  

The **MVP** is a single-page HTML5 Canvas game using **vanilla JavaScript** for all simulation logic, optionally served by a tiny **Python (Flask) web server** during development.

---

## 2. Player Experience & Core Loop

### 2.1 Player Goals

- Experiment with different storm setups to see how they affect surf on Oʻahu’s North Shore.
- Intuitively understand:
  - Why storm **location, track, and orientation** matter.
  - Why some storms produce good surf and others don’t.
  - Why different spots “like” different swell directions.

### 2.2 Core Gameplay Loop

1. **Place or load storms**
   - Click “Add Storm” or choose a predefined scenario/historical storm.
   - Click on the ocean map to place the storm. fileciteturn0file0L75-L92  

2. **Configure storms**
   - Adjust parameters (intensity, wind speed, radius/fetch, movement direction and speed, duration).
   - In MVP, these are abstract but consistent (e.g., “Power 0–10”).  

3. **Predict**
   - Player mentally guesses which North Shore spots will light up, with what direction and relative size.

4. **Run the simulation**
   - Hit **Play** to advance time.
   - Animated swell rings or bands propagate across the Pacific from each storm. fileciteturn0file0L46-L64  

5. **Observe**
   - Observe swell arrival at Oʻahu.
   - See per-spot metrics and simple “Flat / Fun / Solid / XL” labels update over time. fileciteturn0file0L33-L44  

6. **Iterate**
   - Pause, drag storms, edit parameters, or load a different preset and run again.

MVP is primarily **sandbox/exploratory**; structured challenges and scoring can come later.

---

## 3. Game World & Map Layout

### 3.1 Map Extent & Framing

- Projection: Simple 2D top-down (no heavy geographic correctness required yet).
- Visible area (conceptual):
  - Latitude approx **10°N–65°N**  
  - Longitude approx **130°E–250°E** (wraps across dateline). fileciteturn0file2L25-L36  
- Edges:
  - Right/east: US West Coast + Alaska silhouettes.
  - Left/west: Japan and Russian Far East / Kamchatka silhouettes.
  - Bottom-right quadrant: Hawaiian Islands, with **Oʻahu enlarged** slightly for clarity. fileciteturn0file0L14-L26  

### 3.2 Visual Style

- Overall aesthetic: **Educational + playful**, inspired by National Geographic Kids + simple sim games. fileciteturn0file1L57-L94  
- Map:
  - Ocean: gradient blues (deeper in center, lighter near coasts).
  - Optional faint lat/lon grid for orientation.
  - Landmasses: simple flat shapes in muted earth tones with labels (“JAPAN”, “ALASKA”, “WEST COAST”, “HAWAIIAN ISLANDS”).fileciteturn0file1L128-L181  
- Hawaiian Islands:
  - All major islands visible.
  - Oʻahu drawn larger and emphasized (outline, glow, or highlight).
  - Several North Shore “spots” marked along Oʻahu’s north-facing coast.

### 3.3 Screen Layout

Desktop baseline:

- **Header bar (top, ~50px)**  
  - Logo/title (e.g., “North Shore Swell Lab” / “PacificWaves”).  
  - Tab navigation: STORMS / SITES / ENV / SCENARIO / DIAG. fileciteturn0file1L286-L331  

- **Main play area (left ~70%)**  
  - Single `<canvas>` for map, storms, swell visualization.

- **Side panel (right ~30%)**  
  - Tabbed content:
    - STORMS: storm creation, list & editing.
    - SITES: North Shore spots metrics.
    - ENV: environmental/global settings (future).
    - SCENARIO: load presets/historical storms.
    - DIAG: debug/perf (dev only). fileciteturn0file2L96-L131  

- **Control bar (bottom ~70–80px)**  
  - `[Play/Pause] [Step] [Reset]` buttons.
  - Speed slider (1x–10x) with turtle/rabbit icons.
  - Simulation time display: `T+ 0.0 h`.
  - Seed input (optional), Measure button, Help button.

Mobile/tablet: side panel becomes a collapsible drawer or bottom sheet; the requirements stay the same.

---

## 4. Visual & UI Design Guidelines (for Implementation)

### 4.1 Colors (CSS Variables)

Define these in `:root` as CSS variables. Values may be tuned but relationships should hold.

- `--color-ocean-base: #87CEEB;` (Sky blue, ocean background)  
- `--color-ocean-deep: #1E5F74;`  
- `--color-panel-bg: #E8F4F8;`  
- `--color-border: #B0BEC5;`  
- `--color-text-main: #2C3E50;`  
- `--color-text-muted: #6B7280;`  
- `--color-primary: #2196F3;` (actions, headers)  
- `--color-success: #4CAF50;` (Play, good states)  
- `--color-warning: #FF9800;` (Reset, caution)  
- `--color-danger: #F44336;` (Delete storm)  
- `--color-accent-teal: #00BCD4;` (Measure tools)  
- `--color-accent-coral: #FF6B6B;` (high energy highlights)  
- `--color-accent-yellow: #FFD93D;` (excitement, peaks) fileciteturn0file1L96-L151  

### 4.2 Typography

- Headers: Poppins or similar rounded sans-serif, bold.  
- Body text: Open Sans / Inter / Nunito, 14–16px, normal weight.  
- Data/technical: monospace (SF Mono / Consolas), 13–14px. fileciteturn0file1L151-L179  

Accessibility requirement: Meet WCAG 2.1 AA contrast; text sizes and colors must be chosen appropriately.

### 4.3 Components

- Buttons:
  - Rounded (10–12px radius), gradient fills for main actions.
  - Hover: slight scale up (e.g., `transform: translateY(-2px)`), stronger shadow. fileciteturn0file1L179-L217  
- Cards/panels:
  - Rounded edges, subtle drop shadow, light background.
- Tooltips:
  - Dark background, white text, small arrow, short delay on hover.

---

## 5. Game Objects & Data Model

Implementation language for game logic: **JavaScript (ES6+)**.

### 5.1 Core Types

#### 5.1.1 Storm

Represents a storm entity on the map.

Fields:

```ts
type StormId = string;

interface Storm {
  id: StormId;
  name: string;           // e.g. "Storm Alpha" or "Historic 2016 NPAC Low"
  type: "custom" | "historical" | "preset";

  // Position & motion (map coordinates, not necessarily real lat/lon in MVP)
  x: number;              // canvas/world units
  y: number;
  headingDeg: number;     // movement direction (0–360, where storm moves TO)
  speedUnits: number;     // map units per simulated hour

  // Intensity & size (abstracted initially)
  power: number;          // 0–10; used to drive swell output
  maxWindKts: number;     // optional; consistent with power
  radiusKm: number;       // fetch radius

  // Time & lifecycle
  createdAtHours: number; // simulation time when storm created
  durationHours: number;  // how long it remains fully active
  active: boolean;        // on/off flag
}
```

Storms **must be draggable** while the simulation is paused; editing parameters should be live-bound to this object.

#### 5.1.2 SwellRing

Simplified representation of emitted swell fronts.

```ts
interface SwellRing {
  id: string;
  stormId: StormId;
  emittedAtHours: number;  // simulation time
  radiusKm: number;        // current radius
  propagationSpeedKmPerHr: number;
  baseEnergy: number;      // initial energy from storm at emission
  decayRate: number;       // energy decay per 1000km, for example
}
```

Rings expand outward each tick; rings beyond some max radius or with negligible energy are removed.

#### 5.1.3 Spot (North Shore Observation Point)

```ts
interface Spot {
  id: string;
  name: string;            // e.g. "Spot A (North)", "Spot B (NW)", etc.
  x: number;
  y: number;

  preferredDirectionMinDeg: number; // e.g. 300
  preferredDirectionMaxDeg: number; // e.g. 330

  // Runtime metrics (recomputed each simulation tick)
  currentSwellHeight: number;  // abstract units or meters
  currentPeriodSec: number;    // optional for later physics
  currentDirectionDeg: number; // dominant direction
  currentQuality: "Flat" | "Fun" | "Solid" | "XL";
}
```

For MVP, directions and heights can be coarse and relative.

#### 5.1.4 Global Simulation State

```ts
interface SimulationState {
  timeHours: number;
  speedMultiplier: number;      // 1x, 2x, 4x, etc.
  paused: boolean;

  storms: Storm[];
  swellRings: SwellRing[];
  spots: Spot[];

  selectedStormId: StormId | null;
  activeScenarioId: string | null;
}
```

---

## 6. Simulation & Mechanics

### 6.1 Time Step

- Simulation time increments in **hours**.
- Use a fixed logical `dtHours` (e.g., 0.25 h per frame at 60 fps * speedMultiplier).
- Rendering uses `requestAnimationFrame`, but physics is stepped with fixed dt.

### 6.2 Storm Motion

On each `update()` tick, for each active storm:

```js
storm.x += cos(headingRad) * storm.speedUnits * dtHours;
storm.y += sin(headingRad) * storm.speedUnits * dtHours;
```

Storms may have simple bounds handling (stop at map edge or wrap later).

### 6.3 Swell Emission

At regular intervals (e.g., every simulated 3 hours) each active storm emits a new `SwellRing`:

- `propagationSpeedKmPerHr` derived from storm `power` or a fixed value for MVP.
- `baseEnergy` ~ function of `power`, `radiusKm`, `durationHours`.
- `decayRate` tuned so rings slowly fade.

Pseudo:

```js
if (timeSinceLastEmission >= EMISSION_INTERVAL_HOURS) {
  createSwellRing(storm);
}
```

More sophisticated physics (SMB, dispersion, etc.) can replace this later; preserve interfaces so upgrading internals doesn’t break rendering. fileciteturn0file1L229-L276  

### 6.4 Swell Propagation

Each `SwellRing` expands radially:

```js
ring.radiusKm += ring.propagationSpeedKmPerHr * dtHours;
```

Energy decays with distance or time:

```js
const distanceKm = ring.radiusKm;
const energy = ring.baseEnergy * Math.exp(-ring.decayRate * distanceKm / 1000);
```

### 6.5 Spot Sampling & Directional Weighting

For each spot and each ring:

1. Compute vector from storm center (at emission time or current time) to spot.
2. Compute angle `dirDeg` (0–360) of that vector.
3. Compute directional weight based on how close `dirDeg` is to spot’s preferred window.

Simple weight example:

```js
function directionalWeight(dir, minDir, maxDir) {
  // Normalize and compute distance to window; closer gets higher weight (0..1)
}
```

4. If spot lies within a small tolerance of the ring radius (i.e., ring passes over spot this tick), increase its `currentSwellHeight` by `energy * weight`.

5. Aggregate contributions from all rings, then map height to qualitative label:

```js
if (height < 0.2) quality = "Flat";
else if (height < 0.5) quality = "Fun";
else if (height < 1.0) quality = "Solid";
else quality = "XL";
```

---

## 7. Interaction & UX Requirements

### 7.1 Storm Creation & Editing

- **Add Storm**
  - Click “Add Storm” or “Place Storm”.
  - Cursor changes to targeting reticle.
  - Click on the map to create storm at that location with default parameters.

- **Select Storm**
  - Click a storm icon to select.
  - Selected storm gets a visible outline/glow.
  - Side panel loads its editable fields.

- **Drag Storm**
  - When simulation is **paused**, dragging a selected storm moves it on the map.
  - Dragging updates `x,y` immediately.

- **Edit Parameters**
  - In the STORMS tab:
    - Sliders / numeric inputs for:
      - Intensity / power.
      - Radius / fetch size.
      - Movement direction & speed.
      - Duration (for advanced scenarios, can be MVP or later).
  - Changes take effect immediately on next simulation tick.

- **Multiple Storms**
  - MVP: allow at least 3–5 storms.
  - Provide list of active storms with mini-cards:
    - Name, key stats, edit/delete buttons.

### 7.2 Simulation Controls

Bottom control bar:

- **Play/Pause**
  - Large green button.
  - Spacebar toggles.
  - When playing, label shows “Pause”; when paused, “Play”.

- **Step**
  - Blue button.
  - Advances simulation by one fixed hour when paused.

- **Reset**
  - Orange button.
  - Resets simulation time to 0, clears all swell rings.
  - Option: keep storms but rewind, or full clear depending on chosen design.

- **Speed Slider**
  - 1x–10x speed.
  - Affects `speedMultiplier` in simulation state.

- **Time Display**
  - “T+ X.Y h” (monospace).
  - Always reflects `state.timeHours`.

- **Measure Tool**
  - Activates distance measurement mode:
    - Click two points on map to show distance and heading.

- **Help**
  - Opens overlay with controls, keyboard shortcuts, and short explanation of core concepts.

---

## 8. Presets, Scenarios & Historical Storms

### 8.1 MVP Presets

Implement at least **3 scenarios** as JavaScript objects or JSON:

1. **Historic Major NPAC Storm A**
   - A strong low NW of Hawaiʻi tracking east or southeast.
   - Produces WNW–NW swell.

2. **Central Pacific West Swell Generator**
   - Storm west/northwest of Hawaiʻi, moving east.
   - Emphasis on west/WNW swell.

3. **High-Latitude Aleutian Low**
   - Far north storm, generating more northerly swell.

Each preset defines:

```ts
interface Scenario {
  id: string;
  name: string;
  description: string;
  storms: Storm[];
  initialTimeHours: number; // typically 0
}
```

Scenario loading should:

- Clear current rings and storms.
- Populate state with scenario storms.
- Optionally center camera if needed (camera is fixed for now).

---

## 9. Technical Architecture

### 9.1 Target Environment

- Runs in a modern desktop browser (Chrome, Firefox, Safari, Edge).
- Dev environment:
  - macOS (e.g., MacBook M1),
  - Windows (e.g., Surface Book 2). fileciteturn0file0L145-L165  

### 9.2 Backend (Optional, Local Dev Only)

Two options:

1. **Pure static hosting** (no backend required):
   - Use a simple static file server (e.g., `python -m http.server`, `live-server`, or VS Code Live Server).

2. **Minimal Flask server (Python)**:
   - `server.py` serving `index.html` and static assets.
   - Potential REST endpoints later for saving/loading custom scenarios.

MVP can be implemented **entirely front-end**; Python server is just for convenient local serving.

### 9.3 Frontend Stack

- **HTML5** for layout and canvas element.
- **CSS3** for styling (no framework required; can use CSS variables).
- **JavaScript ES6+** with modules; no external JS framework required.

Main render surface: **single `<canvas>`**.

### 9.4 Directory Structure (Combined Requirements)

Suggested structure that merges all three docs:

```text
project-root/
  README.md
  server.py                 # optional Flask dev server
  requirements.txt          # if Flask is used
  static/
    index.html
    css/
      styles.css            # layout + basic styles
      theme.css             # colors, typography, components
    js/
      main.js               # entry point, bootstraps everything
      game.js               # simulation loop & high-level glue
      storm.js              # Storm type + manager
      swell.js              # SwellRing type + propagation logic
      spots.js              # North Shore spots & sampling
      render.js             # canvas drawing
      ui.js                 # DOM controls, events
      scenarios.js          # built-in scenarios/presets
      utils.js              # math/helpers
    assets/
      map_base.png          # styled NPAC map
      oahu_overlay.png      # optional higher-res overlay
      icons/
        storm_icon.png
        play.png
        pause.png
        measure.png
    presets/
      scenarios.json        # optional alternative to scenarios.js
```

If not using Flask, move `index.html` out of `static/` root and adapt accordingly.

---

## 10. Implementation Phases (for the Coding Assistant)

### Phase 1 – Skeleton & Rendering

**Goals:**

- Stand up `index.html`, `styles.css`, `main.js`.
- Implement:
  - Canvas creation and resizing.
  - Basic map rendering (ocean, land silhouettes, Hawaiian Islands).
  - Rendering of a few placeholder spots on Oʻahu’s North Shore.

**Deliverables:**

- Project builds/opens locally.
- Empty storms & simulation; just base map + UI shell (header, canvas, side panel, control bar).

### Phase 2 – Storms & Interaction

**Goals:**

- Implement `Storm` type, storm manager, and STORMS tab.
- Support:
  - “Add Storm” button.
  - Map click to place storm.
  - Select & drag storm when paused.
  - Edit storm parameters via side panel.

**Deliverables:**

- Storms depicted as icons with labels.
- Storm list in side panel.

### Phase 3 – Swell Rings & Spot Metrics

**Goals:**

- Implement `SwellRing` generation and propagation.
- Implement basic spot sampling and metrics on Oʻahu.
- Display:
  - Animated rings from storms.
  - Per-spot height + quality indicator.

**Deliverables:**

- Clear visual correlation between storm location and spot metrics.

### Phase 4 – Scenarios & Presets

**Goals:**

- Implement `Scenario` objects and SCENARIO tab.
- Load at least 3 predefined scenarios.
- Add Reset, Step, Seed (optional) and Measure tool.

### Phase 5 – Visual Polish & UX

**Goals:**

- Apply color palette, typography, gradients, hover effects as per design guidelines.
- Add tooltips and simple help overlay.
- Address performance (cap ring count, etc.) for smooth 30–60 fps.

---

## 11. Constraints & Notes for the AI Coding Assistant

1. **Technologies**
   - Use **vanilla JS** modules, **no heavy frameworks** (React, Vue, etc.) for MVP.
   - Use a single `<canvas>` for map and animations.

2. **Performance**
   - Target 30–60 fps with a few storms and dozens of rings.
   - Keep memory usage modest; remove dead rings.

3. **Extensibility**
   - Keep physics modular (e.g., `swell.js`) so more realistic models can be plugged in later.

4. **User Experience**
   - Favor clarity and responsiveness; ensure storms are easy to place/edit.
   - Ensure UI remains usable on smaller screens (basic responsive layout).

5. **Testing**
   - For critical math (direction, distance, ring/spot interaction), keep helper functions small and testable.

---

This combined document is the **single specification** to follow when implementing the first version of the North Pacific Storm Simulation Game, incorporating:

- The original game-world and mechanics definition (North Pacific map + Oʻahu focus). fileciteturn0file0L1-L44  
- The educational/visual and architectural vision from PacificWaves. fileciteturn0file1L1-L57  
- The scenario-based, interactive experimentation framing from StormMaker/PacificWaves. fileciteturn0file2L209-L262  
