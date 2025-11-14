# TODO – StormMaker Physics & Experience Improvements

Scope: Improve the swell physics logic (swell rings, sampling, directionality, time stepping) and the overall play/learning experience without breaking existing behavior or tests.

Legend for tags in each item:
- **[VALIDATED]** – Confirmed directly against code in this zip.
- **[UNVALIDATED]** – Conceptual / design-level; needs in-browser feel + domain calibration.

---

## 0. Guardrails & Baseline Checks

 - [x] **Add a short “physics invariants” section to docs**  
  - [VALIDATED] Describe, in `docs/domain_model.md` or a new `docs/physics_notes.md`:  
    - What 1 “energy unit” roughly means at a spot.  
    - The intended relationship between `storm.power`, `storm.windKts`, `ringPropagationSpeedKmH`, and wave height.  
    - The conceptual mapping from map-normalized coordinates to km (`MAX_RADIUS_KM = 6000`).  
  - [UNVALIDATED] Use this doc as the reference before changing any constants or shapes.

- [x] **Add a quick regression checklist for physics**  
  - [VALIDATED] In a short section of `README.md` or `docs/physics_notes.md`, list “sanity scenes” (e.g. Historic Major NPAC Low, a simple single-storm test) and what you expect qualitatively at each spot (e.g. Pipeline > Waimea for that setup).  
  - [UNVALIDATED] This becomes the manual test pass after any physics change.

---

## 1. Time Stepping & Storm Motion

### 1.1 Clamp extreme frame deltas (tab hidden / CPU hiccups)

- [x] **Clamp `deltaHours` in `renderFrame`**  
  - [VALIDATED] In `src/main.js`, `renderFrame(timestamp)` currently does:  
    ```js
    const deltaMs = timestamp - renderFrame.lastTimestamp;
    const deltaHours = (deltaMs / 3600000) * getSimConfig().baseTimeAcceleration;
    advance(deltaHours);
    ```  
  - Add a configurable clamp to avoid huge jumps when the tab is hidden or the machine stutters:  
    ```js
    const MAX_DELTA_HOURS = 6; // or expose via simConfig if you want
    const rawDeltaHours = (deltaMs / 3600000) * getSimConfig().baseTimeAcceleration;
    const deltaHours = Math.min(Math.max(rawDeltaHours, 0), MAX_DELTA_HOURS);
    advance(deltaHours);
    ```
  - [x] Add a Vitest spec in `src/tests/timeStep.test.js` that simulates a large `deltaMs` and asserts `advance` never sees more than `MAX_DELTA_HOURS`.  
  - [VALIDATED] This prevents storms and rings from teleporting and instantly deactivating after a long browser pause.

### 1.2 Replace storm motion “magic number” with units-based scaling

- [x] **Make storm speed units physically interpretable**  
  - [VALIDATED] In `updateRings(clockHours)` (in `src/main.js`), storm motion uses a hard-coded scale:
    ```js
    const scale = 0.01; // Adjust to make storms move at reasonable pace
    const newX = storm.x + Math.cos(headingRad) * storm.speedUnits * dtHours * scale;
    const newY = storm.y + Math.sin(headingRad) * storm.speedUnits * dtHours * scale;
    ```
  - Replace `0.01` with a function derived from `MAX_RADIUS_KM` and an assumed km/h per `speedUnits = 1`.  
    Example (tune numbers as needed, UNVALIDATED):  
    ```js
    const MAP_WIDTH_KM = MAX_RADIUS_KM; // or another documented constant
    const STORM_REF_SPEED_KMH = 40; // 1 speedUnit ≈ 40 km/h

    const kmPerMapUnit = MAP_WIDTH_KM; // if 1 map unit ≈ full-width in km
    const mapUnitsPerKm = 1 / kmPerMapUnit;

    const stormSpeedKmH = storm.speedUnits * STORM_REF_SPEED_KMH;
    const distanceKm = stormSpeedKmH * dtHours;
    const deltaUnits = distanceKm * mapUnitsPerKm;

    const newX = storm.x + Math.cos(headingRad) * deltaUnits;
    const newY = storm.y + Math.sin(headingRad) * deltaUnits;
    ```
  - [x] Documented in `docs/physics_notes.md` that 1 speed unit ≈ 40 km/h across the 6,000 km map span.  
  - [x] Added `computeStormDeltaUnits` plus Vitest coverage verifying displacement math.
  - [UNVALIDATED] Exact numbers will need in-app tuning to keep storms visually “reasonable”.

### 1.3 Clarify relationship between base time acceleration and emission cadence

- [x] **Confirm emission cadence is time-based, not frame-based**  
  - [VALIDATED] In `src/physics/swell.js`, emissions are controlled via:
    ```js
    export const EMISSION_INTERVAL_HOURS = 3;
    export function shouldEmitRing(storm, currentTime, lastEmission = undefined) { ... }
    ```
  - [VALIDATED] In `updateRings`, `clockHours` from `simClock` is passed to `shouldEmitRing`; so emissions are already in simulation hours, not frame-driven.  
  - [x] Added a Vitest spec ensuring `shouldEmitRing` only depends on simulation hours, independent of wall-clock acceleration.  
  - [UNVALIDATED] Optionally add per-storm emission interval derived from `windKts` (e.g. windy storms emit more frequent but weaker rings) and expose a toggle in the Diag tab to keep the original simple behavior.

---

## 2. Swell Rings: Energy, Decay & Directionality

### 2.1 Make energy model dependent on wind and “storm size”

- [x] **Replace hard-coded `baseEnergy` formula**  
  - [VALIDATED] Current ring creation (`createRing` in `src/physics/swell.js`):
    ```js
    baseEnergy: storm.power * 2,
    decayRate: ringDecayRatePerKm,
    ```
  - Factor in `storm.windKts` and `storm.radiusKm` (already on storms) into base energy:  
    ```js
    const windFactor = clamp(storm.windKts / 40, 0.5, 3);      // UNVALIDATED shape
    const sizeFactor = clamp(storm.radiusKm / 400, 0.5, 2);    // UNVALIDATED shape
    baseEnergy: storm.power * windFactor * sizeFactor;
    ```
  - [x] Added `computeBaseEnergy` tests verifying monotonic increases across wind/radius adjustments.  
  - [UNVALIDATED] The exact factors require surfing/oceanography judgment; start conservative to keep existing scenarios roughly in the same qualitative bands.

### 2.2 Decay and `MAX_RADIUS_KM` calibration

- [x] **Check decay length scale against map scale**  
  - [VALIDATED] Energy decays as:
    ```js
    const decay = Math.exp(-ring.decayRate * ring.radiusKm);
    ```
    with default `ringDecayRatePerKm = 0.001` and `MAX_RADIUS_KM = 6000`.
  - [x] Documented decay checkpoints (~1/e at 1,000 km, ~5% at 3,000 km) in `docs/physics_notes.md` to tie map scale to energy.
  - [x] Added Vitest coverage asserting those decay ratios for 1,000 km and 3,000 km radii.
  - [UNVALIDATED] Adjust `ringDecayRatePerKm` default if the documented expectations and live feel don’t match.

### 2.3 Unify directional weighting logic

- [x] **Review & possibly unify `directionalFalloff` and `directionalWeight` shapes**  
  - [VALIDATED] Ring sector falloff (`directionalFalloff` in `swell.js`) uses a Gaussian-like curve driven by `ringSectorWidthDeg`.  
  - [VALIDATED] Spot preference window (`directionalWeight`) is a flat “inside window” with linear falloff over `FALLOFF_DEGREES = 45`.  
  - [x] Added explicit Vitest coverage for aligned + off-axis combined weights (0°, 45°, 90°, 135°).
    - A ring exactly aligned with a spot’s preferred center direction (weight ≈ 1).  
    - A ring 45°, 90°, 135° off-axis, showing monotonically decreasing combined weight.  
  - [UNVALIDATED] Consider reusing the Gaussian-style falloff for spot preferences too, to get a smoother combined directional response, while keeping existing thresholds as approximations.

- [x] **Tune `ringSectorWidthDeg` defaults with visual overlays**  
  - [VALIDATED] `ringSectorWidthDeg` is configurable in `simConfig` and the Diag panel.  
  - [x] Added a Diag toggle that renders each ring’s active sector as a translucent wedge directly on the canvas.  
  - [UNVALIDATED] Use this overlay to tune a default that roughly matches “realistic” swell spreading from a storm in the North Pacific.

---

## 3. Sampling at Spots & Height Classification

### 3.1 Improve radial sampling robustness

- [x] **Make `ringSampleTolerancePx` scale with canvas size**  
  - [VALIDATED] In `sampleSpotEnergy`, detection uses:
    ```js
    const radiusCss = (ring.radiusKm / MAX_RADIUS_KM) * Math.min(canvasSize.width, canvasSize.height);
    if (Math.abs(distanceCss - radiusCss) <= ringSampleTolerancePx) { ... }
    ```
  - [x] Sampling tolerance now scales with `min(width, height)` so DPI changes don’t affect energy pickup.
    ```js
    const { ringSampleTolerancePx } = getSimConfig();
    const tolPx = (ringSampleTolerancePx / 1000) * Math.min(canvasSize.width, canvasSize.height);
    if (Math.abs(distanceCss - radiusCss) <= tolPx) { ... }
    ```
    (Or rename/config to `ringSampleToleranceFraction` and fully commit to fraction semantics.)  
  - [x] Updated the DPR invariance test to cover the new tolerance semantics.  
  - [UNVALIDATED] Choose scaling that keeps existing feel roughly intact at common device sizes.

### 3.2 Add guards for extremely small or large rings

- [x] **Skip sampling when the ring is too small or too large relative to map**  
  - [VALIDATED] `advanceRing` deactivates rings when `radiusKm > MAX_RADIUS_KM` or energy < `ringMinActiveEnergy`.  
  - [x] Added a minimum radius guard (50 km) so newborn rings don’t spike spot energy.  
    ```js
    if (ring.radiusKm < 50) return; // ignore near-source noise (UNVALIDATED)
    ```
    or treat very small rings differently in UI (e.g. muted color).  
  - [UNVALIDATED] Tune the minimum radius threshold after observing how “newborn” rings look at usual zoom.

### 3.3 Improve height/label mapping & units display

- [x] **Label units in the Spots panel**  
  - [VALIDATED] `renderSpotPanel()` currently shows:
    ```js
    ${(spot.currentHeight ?? 0).toFixed(1)} • ${spot.currentQuality ?? spot.quality ?? "--"}
    ```
  - [x] Documented in `docs/physics_notes.md` that 1.0 energy ≈ 1 ft Hawaiian scale and updated the Sites panel to render “ft” labels.
  - [UNVALIDATED] Consider exposing a simple linear scale factor in the Diag panel (“Height display scale”) to quickly tune this mapping without code changes.

- [x] **Revisit `classifyHeight` thresholds**  
  - [VALIDATED] In `swell.js`:
    ```js
    if (height < 0.3) return "Flat";
    if (height < 1.5) return "Fun";
    if (height < 3.5) return "Solid";
    return "XL";
    ```
  - [x] Bumped thresholds to 1/4/8 ft equivalents with refreshed Vitest coverage.
  - [UNVALIDATED] You might eventually add a “localization” of these labels if you adapt to other coastlines.

---

## 4. Rings, Caching & Performance

### 4.1 Remove redundant cache resetting per frame

- [x] **Avoid clearing ring energy cache on every frame**  
  - [VALIDATED] `renderFrame` currently does:
    ```js
    resetRingEnergyCache(simState.rings);
    resetRingEnergyCacheStats();
    const deltaHours = ...
    advance(deltaHours);
    ...
    updateRings(clockSnapshot.hours);
    updateSpots();
    ```
  - [VALIDATED] `advanceRing` recomputes energy and sets `ring._cachedEnergy` each frame:
    ```js
    const energy = computeRingEnergy(ring);
    ring._cachedEnergy = energy;
    ```
  - [x] Removed the per-frame `resetRingEnergyCache` call; only stats reset per frame now.  
    - Keep `resetRingEnergyCacheStats()` at frame start if you want per-frame transparency.  
    - Or only reset stats when opening the Diag tab.  
  - [x] Added a cache hit/miss regression test in `swell.test.js`.  
  - [VALIDATED] This saves one full pass over all rings per frame and keeps energy values correct.

### 4.2 Ring count safety limit

- [x] **Cap ring count to prevent runaway performance issues**  
  - [VALIDATED] Rings are pushed in `updateRings` on each emission and filtered by `.filter((ring) => ring.active)` but there is no explicit cap.  
  - [x] Added `MAX_ACTIVE_RINGS = 1000` with trimming + sorting by energy when exceeded.  
    ```js
    const MAX_ACTIVE_RINGS = 1000;
    ...
    if (simState.rings.length > MAX_ACTIVE_RINGS) {
      // Drop oldest inactive or lowest-energy rings first
      simState.rings.sort((a, b) => computeRingEnergy(b) - computeRingEnergy(a));
      simState.rings = simState.rings.slice(0, MAX_ACTIVE_RINGS);
    }
    ```
    (Use `getRingEnergyCached` if you don’t want extra recompute.)  
  - [x] Ring count already visible; now logging a one-time console warning when the cap engages.  
  - [UNVALIDATED] Tune the limit by testing worst-case interactive scenarios (fast time, many storms).

---

## 5. Overall Experience & UX Around Physics

### 5.1 Make the physics more “explainable” in the UI

- [x] **Add a tiny “Physics” legend in the Diag tab**  
  - [VALIDATED] The Diag tab already exposes `ringPropagationSpeedKmH`, `ringDecayRatePerKm`, `ringSectorWidthDeg`, `ringSampleTolerancePx`, and smoothing.  
  - [x] Added inline tooltips + a short note describing how to interpret Diag sliders/cache stats.  
  - [UNVALIDATED] Add a one-click “Reset to teaching defaults” button (hooking into `resetSimConfig()`, which already exists).

### 5.2 Improve feedback around storm placement constraints

- [x] **Explain “no storms over land / far north” rules**  
  - [VALIDATED] `isOverLand(x, y)` in `stormStore.js` rejects storms near Hawaiʻi or at far north latitudes:
    ```js
    const nearHawaii = x > 0.65 && x < 0.85 && y > 0.65 && y < 0.9;
    const farNorth = y < 0.05;
    return nearHawaii || farNorth;
    ```
  - [x] Added inline warning text in the Storms panel driven by a new placement-warning subscription.  
  - [UNVALIDATED] Optionally expose a Diag toggle “Allow unrealistic storm placement” for teaching edge cases.

### 5.3 Highlight physics-driven outcomes to the player

- [x] **Spot list enhancements**  
  - [VALIDATED] `renderSpotPanel` already shows each spot’s preferred direction and current height/quality.  
  - [x] Highlight the highest spot and show the dominant contributing storm label calculated from the sampling debug info.  
  - [UNVALIDATED] Use this to help players trace intuition from storm setup → swell arrival.

---

## 6. Tests & Instrumentation

### 6.1 Expand physics tests around new behaviors

- [x] **Add Vitest coverage for new logic**  
  - [VALIDATED] `src/tests/swell.test.js` already covers: `directionalWeight`, `directionalFalloff`, `advanceRing`, `computeRingEnergy`, `sampleSpotEnergy`, `classifyHeight`, and `bearingFromNorth`.  
  - [x] Added tests for delta clamping, storm motion, emission cadence, base energy, cache reuse, and directional combos.  
    - Clamped `deltaHours` behavior (see §1.1).  
    - New `baseEnergy` dependence on `windKts` / `radiusKm` (see §2.1).  
    - Combined directional weights across ring sector + spot window (see §2.3).  
    - Sampling tolerance scaling with canvas size (see §3.1).  
  - [UNVALIDATED] Consider adding property-style tests (random angles) to ensure directional math never produces NaNs and stays within [0, 1].

### 6.2 Make Diag panel numbers actionable

- [x] **Tie cache hit/miss metrics to tuning advice**  
  - [VALIDATED] Diag tab shows frame timing, ring count, and cache hit/miss rates (wired via `getRingEnergyCacheStats()` in `main.js`).  
  - [x] Added guidance under the Diag panel plus automatic console warnings when FPS drops with low cache efficiency.  
    - High ring count + low cache hit rate → consider shrinking `ringSampleTolerance` or `MAX_ACTIVE_RINGS`.  
    - Very high cache hit rate + sluggish UI → look for other bottlenecks.  
  - [UNVALIDATED] Optionally output a compact log snapshot to the console when FPS drops below a threshold, including current config, ring count, and cache stats.

---

## 7. Implementation Order (Suggested)

1. **Stability & performance**: delta clamp, cache reset cleanup, ring cap.  
2. **Storm motion scaling & documentation**: remove `0.01` magic constant, document units.  
3. **Energy and decay calibration**: new `baseEnergy` mapping + tests.  
4. **Directional behavior & sampling**: unify falloff shapes, scale sampling tolerance.  
5. **UX and explainability**: Diag tooltips, placement feedback, spot panel improvements.  
6. **Fine-tuning & domain calibration**: thresholds, energy→height mapping, debug overlays.

---

End of TODO.
