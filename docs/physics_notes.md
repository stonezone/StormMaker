# StormMaker Physics Notes

This document captures the baseline assumptions used by the North Shore Swell Lab. Treat it as the source of truth before changing simulation constants or heuristics.

## Energy Invariants

- **Energy unit interpretation** – `sampleSpotEnergy` aggregates ring energy into a dimensionless value. By convention we treat **1.0 energy units ≈ 1 ft Hawaiian scale** at a spot. UI thresholds (`classifyHeight`) translate this to qualitative labels.
- **Storm inputs** – `storm.power` is a normalized intensity knob (0–10). `storm.windKts` represents sustained wind in knots, and `storm.radiusKm` approximates fetch width. Rings derive their `baseEnergy` from those three fields (see §2.1 of `TODO.md`), so doubling wind or fetch roughly doubles initial energy.
- **Storm motion units** – `storm.speedUnits = 1` now represents **40 km/h** of translational motion. Movement converts km → normalized map units via `MAX_RADIUS_KM` (6000 km), so the per-frame displacement equals `(speedUnits * 40 km/h * Δhours) / 6000` along the heading vector.
- **Propagation** – `ringPropagationSpeedKmH` is the outward group velocity for swell energy. The default (`60 km/h`) multiplied by per-storm modifiers determines how quickly rings move across the 6000 km normalized map.
- **Map scale** – Map coordinates are normalized to `[0,1]`. `MAX_RADIUS_KM = 6000` represents the distance from the storm canvas center to its edge. Conversion:
  - `1.0` map units ≈ `MAX_RADIUS_KM` km (full diagonal span).
  - `Δmap = distanceKm / MAX_RADIUS_KM`.
- **Decay intuition** – With the default `ringDecayRatePerKm = 0.001`, energy drops to ~37% after 1,000 km and ~5% after 3,000 km. Expect storms within 2,000 km of Oʻahu to still register "Fun" swell if aligned.

## Regression Checklist (Manual Sanity Scenes)

Use these scenarios before/after physics changes:

| Scenario | Expectation |
| --- | --- |
| **Historic Major NPAC Low** (`historic-major`) | Pipeline & Waimea go "Solid" → "XL" once the core reaches ~0.55/0.45, Haleʻiwa lags slightly. |
| **Central Pacific West Swell** (`central-west`) | Sunset stays higher than Pipeline because the storms aim from 300°–320°; Haleʻiwa stays "Fun". |
| **Single custom storm east of Japan** (power 9, heading 120°, speed 0.4) | All four spots react after ~10 sim hours; Sunset and Pipeline lead due to preferred bearing. |

Record height/quality snapshots from these scenes in the Diag tab metrics when evaluating modifications.
