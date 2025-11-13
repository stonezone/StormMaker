import { getSimConfig, MAX_RADIUS_KM } from "../config/simConfig.js";

const energyCacheStats = {
  hits: 0,
  misses: 0
};

export const EMISSION_INTERVAL_HOURS = 3;

export function createRing(storm, currentHours) {
  const { ringPropagationSpeedKmH, ringDecayRatePerKm } = getSimConfig();
  return {
    id: `${storm.id}-${currentHours}`,
    stormId: storm.id,
    emittedAt: currentHours,
    x: storm.x,
    y: storm.y,
    headingDeg: storm.headingDeg ?? 0,
    radiusKm: 0,
    propagationSpeed: ringPropagationSpeedKmH * (0.4 + storm.power / 10),
    baseEnergy: storm.power * 2,
    decayRate: ringDecayRatePerKm,
    active: true
  };
}

export function shouldEmitRing(storm, currentTime, lastEmission = undefined) {
  if (!storm.active) return false;
  const previous = Number.isFinite(lastEmission) ? lastEmission : storm.lastEmission;
  if (!Number.isFinite(previous)) return true;
  return currentTime - previous >= EMISSION_INTERVAL_HOURS;
}

export function advanceRing(ring, dtHours) {
  ring.radiusKm += ring.propagationSpeed * dtHours;
  const energy = computeRingEnergy(ring);
  ring._cachedEnergy = energy;
  const { ringMinActiveEnergy } = getSimConfig();
  if (ring.radiusKm > MAX_RADIUS_KM || energy < ringMinActiveEnergy) {
    ring.active = false;
  }
}

export function computeRingEnergy(ring) {
  const decay = Math.exp(-ring.decayRate * ring.radiusKm);
  return ring.baseEnergy * decay;
}

export function directionalWeight(directionDeg, minDeg, maxDeg) {
  const norm = ((directionDeg % 360) + 360) % 360;
  const min = ((minDeg % 360) + 360) % 360;
  const max = ((maxDeg % 360) + 360) % 360;

  // Calculate center of preferred window
  let center;
  let windowWidth;

  if (min <= max) {
    // Non-wrapping case (e.g., 300° - 320°)
    center = (min + max) / 2;
    windowWidth = max - min;
  } else {
    // Wrapping case (e.g., 350° - 10°)
    center = ((min + max + 360) / 2) % 360;
    windowWidth = 360 - min + max;
  }

  // Calculate angular distance to center
  let distance = Math.abs(norm - center);
  if (distance > 180) distance = 360 - distance;

  const halfWidth = windowWidth / 2;

  // Inside preferred window
  if (distance <= halfWidth) return 1;

  // Smooth falloff beyond window (45° falloff range)
  const FALLOFF_DEGREES = 45;
  return Math.max(0, 1 - (distance - halfWidth) / FALLOFF_DEGREES);
}

export function sampleSpotEnergy(spot, rings, canvasSize) {
  let total = 0;
  const { ringSampleTolerancePx, ringSectorWidthDeg, spotEnergyCap } = getSimConfig();
  const halfSector = Math.max(10, ringSectorWidthDeg / 2);
  rings.forEach((ring) => {
    if (!ring.active) return;
    const dxCss = (spot.x - ring.x) * canvasSize.width;
    const dyCss = (spot.y - ring.y) * canvasSize.height;
    const distanceCss = Math.hypot(dxCss, dyCss);
    const radiusCss = (ring.radiusKm / MAX_RADIUS_KM) * Math.min(canvasSize.width, canvasSize.height);
    if (Math.abs(distanceCss - radiusCss) <= ringSampleTolerancePx) {
      const direction = bearingFromNorth(dxCss, dyCss);
      const sectorWeight = directionalFalloff(direction, ring.headingDeg ?? 0, halfSector);
      if (sectorWeight <= 0) return;
      const preferredWeight = directionalWeight(direction, spot.preferredMin, spot.preferredMax);
      total += getRingEnergyCached(ring) * sectorWeight * preferredWeight;
    }
  });

  return Math.min(total, spotEnergyCap);
}

export function bearingFromNorth(dx, dy) {
  return ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
}

export function directionalFalloff(angleDeg, centerDeg, halfWidthDeg) {
  const diff = angularDifference(angleDeg, centerDeg);
  const spread = Math.max(5, halfWidthDeg);
  const sigma = spread / Math.SQRT2;
  // Gaussian-style falloff: ~1 at center, rapidly decays but never hits zero.
  return Math.exp(-((diff * diff) / (2 * sigma * sigma)));
}

function angularDifference(a, b) {
  let diff = (a - b + 540) % 360 - 180;
  return Math.abs(diff);
}

export function classifyHeight(height) {
  if (height < 0.3) return "Flat";
  if (height < 1.5) return "Fun";
  if (height < 3.5) return "Solid";
  return "XL";
}

export function getRingEnergyCached(ring) {
  if (typeof ring._cachedEnergy === "number") {
    energyCacheStats.hits += 1;
    return ring._cachedEnergy;
  }
  energyCacheStats.misses += 1;
  const energy = computeRingEnergy(ring);
  ring._cachedEnergy = energy;
  return energy;
}

export function resetRingEnergyCache(rings = []) {
  rings.forEach((ring) => {
    if (ring) {
      ring._cachedEnergy = undefined;
    }
  });
}

export function getRingEnergyCacheStats() {
  return energyCacheStats;
}

export function resetRingEnergyCacheStats() {
  energyCacheStats.hits = 0;
  energyCacheStats.misses = 0;
}
