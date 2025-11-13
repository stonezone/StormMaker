# Domain Model

## Storm
- **Fields**: `id`, `name`, `type`, `x`, `y`, `headingDeg`, `speedUnits`, `power`, `windKts`, `radiusKm`, `active`, `lastEmission`.
- **Behavior**: Emits `SwellRing`s on cadence, draggable when simulation paused, edited via Storms panel.

## SwellRing
- **Fields**: `id`, `stormId`, `emittedAt`, `x`, `y`, `radiusKm`, `propagationSpeed`, `baseEnergy`, `decayRate`, `active`.
- **Behavior**: Expands radially each tick, energy decays exponentially, pruned when radius exceeds `MAX_RADIUS_KM` or energy drops below threshold.

## Spot (North Shore Site)
- **Fields**: `id`, `name`, `x`, `y`, `preferredDirection`, `preferredMin`, `preferredMax`, `currentHeight`, `currentQuality`.
- **Behavior**: Samples rings for energy based on spatial proximity + directional weighting, displays qualitative surf labels.

## Scenario
- **Fields**: `id`, `name`, `description`, `storms[]`, `initialTimeHours`.
- **Behavior**: Loading replaces current storms, resets rings/clock, pauses simulation.

## SimulationState
- **Fields**: `timeHours`, `speedMultiplier`, `paused`, `storms`, `swellRings`, `spots`, `selectedStormId`, `activeScenarioId`.
- **Derived State**: Maintained across `stormStore`, `simClock`, `scenarioStore`, plus local `simState` in `main.js` for rings/measure tool.
