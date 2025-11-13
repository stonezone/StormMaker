# StormMaker / North Pacific Swell Lab

## Project Context
StormMaker is a browser-based educational simulation that teaches how North Pacific storms generate swell that reaches Oʻahu's North Shore. Users create and manipulate storms, watch animated swell rings propagate across the ocean, and observe real-time wave conditions at famous surf spots (Sunset, Pipeline, Waimea, Haleʻiwa).

**Status:** Working MVP (v0.1.0)
**Last Updated:** November 13, 2025
**Tech Stack:** Vanilla JavaScript, Vite, Vitest, Canvas API
**Lines of Code:** ~1,300 JavaScript

---

## Quick Start

```bash
npm install
npm run dev      # Start development server (localhost:5173)
npm test         # Run test suite (9 tests)
npm run build    # Production bundle
```

---

## Architecture Overview

### Module Structure
```
src/
├── data/           # Static data (spots, scenarios)
│   ├── scenarios.js
│   └── spots.js
├── physics/        # Core simulation logic
│   └── swell.js    # Ring emission, propagation, energy calculations
├── render/         # Canvas rendering
│   └── mapRenderer.js
├── state/          # State management (pub/sub pattern)
│   ├── scenarioStore.js
│   ├── simClock.js
│   └── stormStore.js
├── styles/         # CSS theme and layout
└── main.js         # UI orchestration and event handling
```

### Key Design Patterns

**State Management:**
- Each store (stormStore, scenarioStore, simClock) uses subscribe/emit pattern
- Immutable snapshots prevent direct mutation
- Clean separation between state and UI

**Physics Engine:**
- Pure functional style in swell.js
- Ring emission every 3 hours (EMISSION_INTERVAL_HOURS)
- Energy decay: `baseEnergy * exp(-decayRate * radiusKm)`
- Directional weighting for spot-specific swell reception

**Rendering:**
- 60 FPS animation loop via requestAnimationFrame
- Canvas cleared and redrawn each frame
- Responsive viewport with devicePixelRatio support

---

## Core Concepts

### Storms
- Position (x, y): Normalized coordinates (0-1)
- Heading: Direction of travel (0-360°)
- Speed: Movement rate (units/hour)
- Power: Swell generation strength (0-10)
- Wind: Additional metadata (not currently used in physics)

### Swell Rings
- Emitted from storms every 3 hours
- Propagate at ~500 km/hr (scaled by storm power)
- Energy decays exponentially with distance
- Pruned when radius > 6000 km or energy < 0.05

### Spots
- Fixed North Shore locations
- Preferred swell direction windows (e.g., 300°-320°)
- Sample energy from passing rings
- Quality classification: Flat, Fun, Solid, XL

### Scenarios
- Preset storm configurations
- Historical events (Historic Major, Central West, Aleutian Low)
- Loading pauses simulation and resets time

---

## Recent Fixes (November 13, 2025)

### Critical Issues Resolved
1. **State Mutation Bug** - Fixed snapshot mutation in ring emission
2. **XSS Vulnerability** - Added HTML escaping for all user-controlled strings
3. **Memory Leak** - Added animation frame cleanup for Vite HMR
4. **Storm Motion** - Implemented movement based on heading/speed (was missing!)
5. **Position Validation** - Atomic check prevents storms on land
6. **Directional Weight** - Improved physics to calculate distance from window center

### Breaking Changes
- `shouldEmitRing()` now requires `lastEmission` parameter
- Storm motion changes gameplay dynamics (storms now move!)

---

## Known Limitations

### Missing Spec Features
- Step button (advance by 1 hour when paused)
- Help overlay
- Tooltips (data attributes present but no implementation)
- Storm duration field

### Areas for Improvement
- Test coverage: ~20% (only physics layer tested)
- No TypeScript/JSDoc annotations
- Magic numbers scattered in code
- No CI/CD pipeline
- No performance monitoring beyond basic diagnostics

---

## Development Guidelines

### Code Style
- **Naming:** camelCase for functions/variables, SCREAMING_SNAKE_CASE for constants
- **Functions:** Keep under 50 lines, single responsibility
- **State:** Never mutate store snapshots directly
- **Rendering:** Minimize canvas operations per frame

### Testing
- Unit tests for all physics functions
- Integration tests for state → physics → render pipeline
- Edge cases: 0°/360° wrapping, land boundaries, NaN/Infinity inputs

### Security
- Always escape HTML when using `innerHTML`
- Validate all numeric inputs with `Number.isFinite()`
- Use `textContent` instead of `innerHTML` where possible

### Performance
- Keep ring count < 50 for smooth 60 FPS
- Spatial indexing not needed until >100 rings
- Background image loaded once and cached globally

---

## File-Specific Notes

### `src/main.js` (507 lines)
**Responsibilities:**
- Canvas setup and resizing
- Event handling (mouse, keyboard)
- Animation loop coordination
- UI rendering (storm list, spot panel, scenarios)

**Key Functions:**
- `renderFrame()` - Main animation loop
- `updateRings()` - Storm motion + ring emission
- `updateSpots()` - Sample energy from rings
- `hookCanvasInteractions()` - Mouse drag/measure tool

**Common Issues:**
- Long function (renderFrame is 40+ lines) - consider splitting
- Mixed concerns (UI + simulation logic) - could extract

### `src/physics/swell.js` (88 lines)
**Responsibilities:**
- Ring creation and advancement
- Energy calculations
- Directional weighting
- Spot sampling

**Key Constants:**
- `EMISSION_INTERVAL_HOURS = 3`
- `BASE_PROPAGATION_SPEED = 500` km/hr
- `MAX_RADIUS_KM = 6000`
- `MIN_ACTIVE_ENERGY = 0.05`
- `MAX_SPOT_ENERGY = 10`

**Physics Formula:**
```javascript
energy = baseEnergy * exp(-decayRate * radiusKm)
propagationSpeed = 500 * (0.4 + power/10)
directionalWeight = 1 inside window, smooth falloff beyond
```

### `src/state/stormStore.js` (150 lines)
**Responsibilities:**
- Storm CRUD operations
- Position validation (isOverLand checks)
- Counter management
- Pub/sub notifications

**Key Functions:**
- `addStormAt()` - Create storm at position
- `updateStorm()` - Modify storm properties (atomic position updates)
- `replaceStorms()` - Load scenario
- `isOverLand()` - Prevent placement near Hawaii

### `src/render/mapRenderer.js` (273 lines)
**Responsibilities:**
- Background rendering (image or gradient)
- Grid and Hawaii inset
- Storms, rings, spots visualization
- Measure overlay

**Visual Details:**
- Ring opacity scales with energy (0.15 - 0.85)
- Ring lineWidth: `1 + energy * 0.2`
- Spots glow when energy > 0.5 (shadowBlur: 20px)
- Storm selection: dashed ring

---

## Debugging Tips

### Common Issues

**"Rings not emitting"**
- Check storm.active === true
- Verify clockState.playing === true
- Check simState.stormEmissionTimes Map

**"Spots show no energy"**
- Ring must be within RING_SAMPLE_TOLERANCE_KM of spot
- Check directionalWeight (must be within preferred window)
- Verify rings are active (not pruned)

**"Storms won't move"**
- Check storm.speedUnits > 0
- Verify simulation is playing (not paused)
- Check isOverLand() isn't blocking movement

**"Performance degradation"**
- Count rings: `simState.rings.length`
- Target: < 50 rings for 60 FPS
- Check frameTime in diagnostics panel
- Prune old rings more aggressively

### Useful Console Commands
```javascript
// Access stores
getStormSnapshot()
getClockSnapshot()
scenarioStoreSnapshot()

// Check simulation state
simState.rings.length
simState.stormEmissionTimes

// Force ring emission
simState.stormEmissionTimes.clear()

// Inspect spot energy
spots.forEach(s => console.log(s.name, s.currentHeight, s.currentQuality))
```

---

## Testing Strategy

### Current Coverage
- ✅ Physics functions (swell.js)
- ✅ Scenario loading
- ❌ State stores (stormStore, simClock)
- ❌ Rendering logic
- ❌ UI integration

### Priority Test Cases
1. Storm motion calculation
2. Ring emission timing (respects EMISSION_INTERVAL_HOURS)
3. Directional weight at 0°/360° boundary
4. Spot energy with overlapping rings
5. Land validation for all Hawaii coordinates
6. Scenario load → state reset flow

### Running Tests
```bash
npm test                    # Run all tests
npm test -- --reporter=verbose  # Detailed output
npm test -- --coverage      # Coverage report
```

---

## Deployment Checklist

- [ ] All tests passing (9/9)
- [ ] No console errors in browser
- [ ] Performance: <30ms frame time with 3 storms
- [ ] Accessibility: Keyboard navigation works
- [ ] Security: HTML escaping verified
- [ ] Dependencies: All up to date (especially Vitest)
- [ ] README updated with current features
- [ ] CHANGELOG.md created (currently missing)

---

## Future Enhancements

### Short-term
1. Complete spec implementation (Step button, Help overlay, Tooltips)
2. Improve test coverage to 60%+
3. Add JSDoc comments to all public functions
4. Extract magic numbers to config file

### Medium-term
1. Add TypeScript for type safety
2. Implement undo/redo capability
3. Save/load custom scenarios
4. Performance optimization (spatial indexing for >100 rings)
5. Mobile touch support

### Long-term
1. Multi-player mode (shared storms)
2. Historical data replay
3. Real-time forecast integration
4. 3D visualization mode
5. Educational content/tutorials

---

## Contact & Resources

**Specification:** `docs/north_pacific_combined_project_spec.md`
**Code Review:** `CODE_REVIEW.md`
**Acceptance Criteria:** `ACCEPTANCE.md`
**Dependencies:** Vite ~7.2.2, Vitest ~3.2.4

---

## AI Assistant Instructions

When working on this codebase:
1. **Always run tests** after making changes
2. **Never mutate snapshots** - use store update functions
3. **Escape HTML** when rendering user-controlled strings
4. **Validate inputs** with `Number.isFinite()` before using
5. **Update this file** when adding new features or fixing bugs
6. **Follow existing patterns** - don't introduce new state management approaches
7. **Keep physics pure** - swell.js should have no side effects

### Common Tasks

**Adding a new storm parameter:**
1. Add to `defaultStormConfig` in stormStore.js
2. Add validation in `updateStorm()`
3. Add form field in index.html
4. Update rendering in mapRenderer.js
5. Write tests for new behavior

**Adding a new spot:**
1. Add entry to `spots` array in data/spots.js
2. Include x, y, preferredMin, preferredMax
3. Spot will auto-render and sample energy

**Modifying physics:**
1. Edit constants at top of swell.js
2. Update formulas in compute functions
3. Add unit tests to swell.test.js
4. Verify with visual testing in browser

---

**Last Review:** November 13, 2025
**Reviewer:** Claude (AI Code Assistant)
**Next Review:** After adding 5+ new features or before v0.2.0 release
