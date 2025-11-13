# StormMaker Code Review
**Date:** November 12, 2025  
**Reviewer:** System Analysis  
**Scope:** Full codebase review for mistakes, logical errors, and improper implementation

---

## Critical Issues (Must Fix)

### 1. **Data Structure Mismatch: Spot Position Properties**
**Location:** `src/data/spots.js` + `src/physics/swell.js` + `src/main.js`  
**Severity:** HIGH - Runtime Error

**Problem:**
- Spots define position as nested object: `position: { x: 0.76, y: 0.82 }`
- `sampleSpotEnergy()` expects flat structure: `spot.position.x`, `spot.position.y`
- But the function parameter destructuring uses direct properties: `{ x, y, preferredMin, preferredMax }`

**Current broken flow:**
```javascript
// spots.js defines:
{ position: { x: 0.76, y: 0.82 } }

// main.js calls:
sampleSpotEnergy({ 
  x: spot.position.x,  // Passes nested value
  y: spot.position.y,
  preferredMin: spot.preferredMin,
  preferredMax: spot.preferredMax
}, ...)

// swell.js expects in function body:
const dx = (spot.position.x - ring.x) * canvasSize.width;  // FAILS - undefined
```

**Fix:**
Choose one consistent structure:
- **Option A:** Flatten spot structure to remove nested `position` object
- **Option B:** Update `sampleSpotEnergy` to accept full spot object and access `spot.position.x/y`

**Recommended:** Option A - flatten structure for performance and simplicity

---

### 2. **Clock Advance Calculation Error**
**Location:** `src/main.js` line ~317  
**Severity:** HIGH - Incorrect Physics

**Problem:**
```javascript
advance(deltaMs / 1000 / 60);
```

This divides by 60 assuming 60fps, but `deltaMs` is the actual frame time. At 30fps, this would advance half as fast as intended.

**Fix:**
```javascript
advance(deltaMs / 1000);  // Convert milliseconds to seconds directly
```

The `advance()` function already multiplies by `clockState.multiplier`, so no need for fps assumption.

---

### 3. **Scenario Load Doesn't Pause Simulation**
**Location:** `src/main.js` lines ~152-158  
**Severity:** HIGH - Spec Violation

**Problem:**
Per specification: "Load replaces storms, clears rings, and pauses"  
Current implementation calls `pause()` but spec requires simulation to stop.

**Current code:**
```javascript
if (scenario) {
  replaceStorms(scenario.storms);
  simState.rings = [];
  simState.lastUpdateHours = scenario.initialTimeHours;
  setClockHours(scenario.initialTimeHours);
  pause();  // ✓ Present but should be emphasized as requirement
}
```

**Fix:**
Code is actually correct - this is marked as "must verify" but implementation already pauses. However, add clear comment explaining this is spec requirement.

---

### 4. **Dead Code: renderScenarioPanel Function**
**Location:** `src/main.js` lines ~242-264  
**Severity:** MEDIUM - Code Quality

**Problem:**
- Function `renderScenarioPanel()` is defined but never called
- Duplicates logic from `handleScenarioSnapshot()`
- References undefined `scenarios` variable (not imported)

**Fix:**
Remove entire function. Scenario rendering is handled by `handleScenarioSnapshot()`.

---

### 5. **Storm Counter Not Reset**
**Location:** `src/state/stormStore.js`  
**Severity:** MEDIUM - User Experience

**Problem:**
```javascript
const state = {
  storms: [],
  selectedId: null,
  placing: false,
  counter: 1  // Never resets
};
```

After calling `resetStorms()` or loading scenarios multiple times, counter keeps incrementing: "Storm 47", "Storm 48"...

**Fix:**
Add counter reset in `resetStorms()`:
```javascript
export function resetStorms() {
  state.storms = [];
  state.selectedId = null;
  state.counter = 1;  // Reset counter
  emit();
}
```

---

## Major Issues (Should Fix)

### 6. **Missing Energy Threshold for Ring Pruning**
**Location:** `src/physics/swell.js`  
**Severity:** MEDIUM - Performance

**Problem:**
Rings are pruned only by `MAX_RADIUS_KM` but not by energy level. A ring could have near-zero energy but still be tracked and rendered.

**Current:**
```javascript
export function advanceRing(ring, dtHours) {
  ring.radiusKm += ring.propagationSpeed * dtHours;
  if (ring.radiusKm > MAX_RADIUS_KM) {
    ring.active = false;
  }
}
```

**Fix:**
Add energy check:
```javascript
export function advanceRing(ring, dtHours) {
  ring.radiusKm += ring.propagationSpeed * dtHours;
  const energy = computeRingEnergy(ring);
  if (ring.radiusKm > MAX_RADIUS_KM || energy < 0.01) {
    ring.active = false;
  }
}
```

---

### 7. **No Storm Dragging Prevention During Playback**
**Location:** `src/main.js` hookCanvasInteractions  
**Severity:** MEDIUM - Spec Violation

**Problem:**
Spec states "draggable while paused" but implementation allows dragging anytime.

**Current:**
```javascript
canvas.addEventListener("mousedown", (event) => {
  // No check for paused state
  const storm = snapshot.storms.find(...);
  if (storm) {
    selectStorm(storm.id);
    draggingId = storm.id;
  }
});
```

**Fix:**
Add playback check:
```javascript
if (storm && !getClockSnapshot().playing) {
  selectStorm(storm.id);
  draggingId = storm.id;
}
```

---

### 8. **Unbounded Spot Energy Accumulation**
**Location:** `src/physics/swell.js` sampleSpotEnergy  
**Severity:** MEDIUM - Physics Accuracy

**Problem:**
Multiple rings add energy without normalization or capping. With many storms, spots could show unrealistic values like "height: 47.3".

**Fix:**
Add energy capping and/or normalization:
```javascript
export function sampleSpotEnergy(spot, rings, canvasSize) {
  let total = 0;
  // ... accumulation logic ...
  return Math.min(total, 10);  // Cap at reasonable maximum
}
```

Or implement more realistic energy interaction (constructive/destructive interference).

---

### 9. **Background Image Memory Leak**
**Location:** `src/render/mapRenderer.js`  
**Severity:** MEDIUM - Memory Management

**Problem:**
```javascript
const backgroundImage = new Image();
backgroundImage.onload = () => { backgroundReady = true; };
backgroundImage.onerror = () => { backgroundFailed = true; };
backgroundImage.src = "/assets/game-background.jpeg";
```

If module is hot-reloaded or page uses dynamic imports, event handlers persist.

**Fix:**
Clear handlers or wrap in cleanup:
```javascript
let backgroundImage = null;
export function initBackgroundImage() {
  if (backgroundImage) return;
  backgroundImage = new Image();
  backgroundImage.onload = () => { backgroundReady = true; };
  backgroundImage.onerror = () => { backgroundFailed = true; };
  backgroundImage.src = "/assets/game-background.jpeg";
}
```

---

### 10. **Directional Weight Edge Case at 0°/360° Boundary**
**Location:** `src/physics/swell.js` directionalWeight  
**Severity:** MEDIUM - Physics Accuracy

**Problem:**
Wrap-around logic for directions crossing 0°/360° may have edge cases.

**Example scenario:**
- Spot prefers: 350° - 10° (wraps around north)
- Swell direction: 0°
- Current logic:
```javascript
if (min <= max) {
  // This branch expects non-wrapping range
} else {
  // Wrap-around case
  if (norm >= min || norm <= max) return 1;
}
```

**Testing needed:**
Verify edge cases:
- preferredMin=350, preferredMax=10, direction=0 → should return 1
- preferredMin=350, preferredMax=10, direction=180 → should return 0

**Fix:**
Add comprehensive unit tests for all quadrants and boundaries.

---

## Minor Issues (Consider Fixing)

### 11. **No Canvas Context Error Handling**
**Location:** `src/main.js` and `src/render/mapRenderer.js`  
**Severity:** LOW - Robustness

**Problem:**
```javascript
const ctx = canvas.getContext("2d");
```

If browser doesn't support canvas or context fails, app crashes silently.

**Fix:**
Add validation:
```javascript
const ctx = canvas.getContext("2d");
if (!ctx) {
  console.error("Canvas 2D context not available");
  document.body.innerHTML = "<p>Canvas not supported in this browser</p>";
  return;
}
```

---

### 12. **Measure Tool Coordinate System Mismatch**
**Location:** `src/main.js` buildMeasureOverlay  
**Severity:** LOW - Accuracy

**Problem:**
Measure tool uses viewport dimensions directly but canvas has device pixel ratio scaling:
```javascript
canvas.width = rect.width * viewport.dpr;
canvas.height = rect.height * viewport.dpr;
```

Distance calculations use `viewport.width/height` which are logical pixels, not physical canvas pixels. This could cause minor inaccuracies.

**Fix:**
Ensure distance scaling accounts for DPR or clarify that viewport dimensions are intentional for this use case.

---

### 13. **Missing Storm Parameter Validation**
**Location:** `src/state/stormStore.js` updateStorm  
**Severity:** LOW - Data Integrity

**Problem:**
Some validation exists but not comprehensive:
```javascript
if (typeof updates.headingDeg === "number") {
  storm.headingDeg = ((updates.headingDeg % 360) + 360) % 360;
}
```

But what if `updates.headingDeg = NaN` or `updates.power = -5`?

**Fix:**
Add validation:
```javascript
if (typeof updates.headingDeg === "number" && !isNaN(updates.headingDeg)) {
  storm.headingDeg = ((updates.headingDeg % 360) + 360) % 360;
}
if (typeof updates.power === "number" && !isNaN(updates.power)) {
  storm.power = clamp(updates.power, 0, 10);
}
```

---

### 14. **Ring Visualization Doesn't Show Energy**
**Location:** `src/render/mapRenderer.js` drawRings  
**Severity:** LOW - User Experience

**Problem:**
All rings render with same style regardless of energy:
```javascript
ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
ctx.lineWidth = 2;
```

Users can't distinguish high-energy vs low-energy rings.

**Fix:**
Vary opacity or color based on energy:
```javascript
rings.forEach((ring) => {
  const energy = computeRingEnergy(ring);
  const opacity = Math.max(0.1, Math.min(0.8, energy / 10));
  ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
  // ... rest of drawing
});
```

---

### 15. **Speed Slider Granularity**
**Location:** `src/main.js` and `index.html`  
**Severity:** LOW - User Experience

**Problem:**
```html
<input id="speed-control" type="range" min="0.5" max="3" step="0.5" value="1" />
```

Only 6 values: 0.5x, 1x, 1.5x, 2x, 2.5x, 3x. Users might want finer control.

**Fix:**
Change step to 0.1 or 0.25 for smoother control.

---

### 16. **Missing Spot Visual Feedback for Active Swell**
**Location:** `src/render/mapRenderer.js` drawSpots  
**Severity:** LOW - User Experience

**Problem:**
Spots always render identically. No visual indication when receiving swell energy.

**Fix:**
Add pulsing or glow effect for spots with energy > threshold:
```javascript
if (spot.currentHeight > 0.5) {
  // Add glow or larger radius
  ctx.shadowBlur = 10;
  ctx.shadowColor = palette.accentYellow;
}
```

---

### 17. **No Storm Placement Validation**
**Location:** `src/state/stormStore.js` addStormAt  
**Severity:** LOW - User Experience

**Problem:**
Storms can be placed on land (e.g., over Oʻahu). While not breaking, it's unrealistic.

**Fix:**
Add bounds checking or land mask:
```javascript
export function addStormAt({ x, y }) {
  // Validate not over land regions
  if (isOverLand(x, y)) {
    console.warn("Cannot place storm over land");
    return null;
  }
  // ... rest of function
}
```

Requires defining land regions or using a simple exclusion zone.

---

### 18. **Dependency Version Management**
**Location:** `package.json`  
**Severity:** LOW - Maintenance

**Problem:**
```json
"vite": "^7.2.2",
"vitest": "^2.1.9"
```

Caret ranges allow minor version updates which could introduce breaking changes.

**Fix:**
For production stability, consider exact versions or tilde ranges:
```json
"vite": "~7.2.2",
"vitest": "~2.1.9"
```

---

## Code Quality Observations

### 19. **Unused Variables and Imports**
- `spots.js`: Initial `quality` field is never read (only `currentQuality` matters)
- Several CSS variables defined but potentially unused

### 20. **Missing JSDoc Comments**
Physics functions in `swell.js` would benefit from parameter documentation:
```javascript
/**
 * Calculates directional weight for swell at a spot
 * @param {number} directionDeg - Swell direction in degrees (0-360)
 * @param {number} minDeg - Minimum preferred direction
 * @param {number} maxDeg - Maximum preferred direction
 * @returns {number} Weight factor 0-1
 */
export function directionalWeight(directionDeg, minDeg, maxDeg) {
```

### 21. **Magic Numbers**
Constants should be named:
```javascript
// In swell.js
const RING_SAMPLE_TOLERANCE_PX = 40;  // instead of hardcoded 40

// In main.js
const STORM_SELECTION_RADIUS = 0.04;  // instead of hardcoded 0.04
```

### 22. **Test Coverage Gaps**
Current tests are basic. Missing:
- Storm placement validation tests
- Scenario loading tests  
- Clock multiplier edge cases
- Ring energy decay over time
- Directional weight wrap-around edge cases

---

## Architecture Observations

### 23. **State Management Consistency**
Good: Each store (stormStore, simClock, scenarioStore) uses consistent subscribe/emit pattern.

Improvement opportunity: Consider extracting this pattern into a shared `createStore()` utility to reduce duplication.

### 24. **Separation of Concerns**
Good: Clear separation between:
- State management (`state/`)
- Physics (`physics/`)
- Rendering (`render/`)
- UI (`main.js`)

### 25. **Module Dependencies**
Main.js has many imports. Consider:
- Creating a `game.js` or `simulation.js` to orchestrate updates
- Moving canvas interaction handlers to separate module
- Extracting UI event handlers from main.js

---

## Performance Considerations

### 26. **Ring Array Operations**
Each frame iterates all rings multiple times:
1. Update rings
2. Sample spots (iterates rings for each spot)
3. Render rings

Consider spatial indexing for large ring counts (future optimization).

### 27. **Spot Sampling Efficiency**
Each spot checks every ring. With 4 spots and 50 rings = 200 distance calculations per frame.

Acceptable for MVP but consider:
- Early exit when ring is too far from spot
- Spatial partitioning for >100 rings

---

## Specification Compliance

### ✅ Implemented Correctly
- Storm creation and editing
- Swell ring emission and propagation
- Spot metrics and quality labels
- Scenario loading
- Play/Pause/Reset controls
- Keyboard shortcuts (Space, R, M)
- Measure tool
- Responsive canvas

### ⚠️ Needs Verification
- Map projection accuracy (spec says "simple 2D", appears correct)
- Distance scaling (6000km assumption needs validation)
- Storm dragging only when paused (not enforced)
- Scenario load should pause (implemented correctly)

### ❌ Missing/Incomplete
- Step button (advance by 1 hour when paused)
- Help overlay (mentioned in spec, not implemented)
- Tooltips (data-tooltip attributes present but no implementation)
- Keyboard accessibility (arrow keys for tab navigation)

---

## Recommended Fixes Priority

### P0 (Must Fix Before Production)
1. Fix spot position structure mismatch (#1)
2. Fix clock advance calculation (#2)
3. Remove dead code renderScenarioPanel (#4)

### P1 (Should Fix Soon)
4. Add energy threshold for ring pruning (#6)
5. Prevent storm dragging during playback (#7)
6. Cap spot energy accumulation (#8)
7. Reset storm counter (#5)

### P2 (Nice to Have)
8. Add canvas error handling (#11)
9. Add storm parameter validation (#13)
10. Improve ring visualization (#14)
11. Add visual feedback for active spots (#16)

### P3 (Future Enhancement)
12. Fix background image cleanup (#9)
13. Improve speed slider granularity (#15)
14. Add storm placement validation (#17)
15. Add comprehensive test coverage (#22)

---

## Testing Recommendations

### Unit Tests Needed
- `directionalWeight()` with all quadrant combinations
- `sampleSpotEnergy()` with multiple overlapping rings
- Storm parameter validation edge cases
- Clock advance with various multipliers

### Integration Tests Needed
- Scenario loading flow
- Storm creation → ring emission → spot sampling pipeline
- Play/pause/reset state transitions

### Manual Testing Checklist
- [ ] Load each scenario and verify storms appear correctly
- [ ] Drag storm while paused (should work)
- [ ] Drag storm while playing (should not work - but currently does)
- [ ] Add 5+ storms and verify performance stays >30fps
- [ ] Verify spots show correct quality updates
- [ ] Test measure tool accuracy
- [ ] Test on different screen sizes/DPR

---

## Summary

**Overall Assessment:** Good implementation with solid architecture. Most issues are minor and relate to edge cases, validation, and polish. Three critical issues need immediate attention:

1. Spot position data structure mismatch
2. Clock timing calculation error  
3. Dead code removal

The codebase follows the specification well and demonstrates good separation of concerns. With the recommended fixes, this will be a robust MVP ready for user testing.

**Estimated Fix Effort:**
- Critical issues: 2-4 hours
- Major issues: 4-6 hours
- Minor issues: 6-10 hours
- Total: ~20 hours for comprehensive cleanup

---

**Next Steps:**
1. Fix P0 issues immediately
2. Add unit tests for physics functions
3. Implement missing spec features (Step, Help, Tooltips)
4. User testing session to validate UX flows
5. Performance profiling with >50 rings
