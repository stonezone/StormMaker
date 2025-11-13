export const EMISSION_INTERVAL_HOURS = 3;
const BASE_PROPAGATION_SPEED = 500; // km per simulated hour
export const MAX_RADIUS_KM = 6000;
const BASE_DECAY = 0.0004;
const MIN_ACTIVE_ENERGY = 0.05;
const MAX_SPOT_ENERGY = 10;
const RING_SAMPLE_TOLERANCE_PX = 40;

export function createRing(storm, currentHours) {
  return {
    id: `${storm.id}-${currentHours}`,
    stormId: storm.id,
    emittedAt: currentHours,
    x: storm.x,
    y: storm.y,
    radiusKm: 0,
    propagationSpeed: BASE_PROPAGATION_SPEED * (0.4 + storm.power / 10),
    baseEnergy: storm.power * 2,
    decayRate: BASE_DECAY,
    active: true
  };
}

export function shouldEmitRing(storm, currentTime, lastEmission = 0) {
  if (!storm.active) return false;
  if (lastEmission === 0) return true;
  return currentTime - lastEmission >= EMISSION_INTERVAL_HOURS;
}

export function advanceRing(ring, dtHours) {
  ring.radiusKm += ring.propagationSpeed * dtHours;
  const energy = computeRingEnergy(ring);
  if (ring.radiusKm > MAX_RADIUS_KM || energy < MIN_ACTIVE_ENERGY) {
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
  rings.forEach((ring) => {
    if (!ring.active) return;
    const dx = spot.x - ring.x;
    const dy = spot.y - ring.y;
    const distance = Math.hypot(dx, dy);
    const radiusNormalized = ring.radiusKm / MAX_RADIUS_KM;
    const normalizedTolerance = RING_SAMPLE_TOLERANCE_PX / Math.max(canvasSize.width, canvasSize.height);
    if (Math.abs(distance - radiusNormalized) <= normalizedTolerance) {
      const direction = bearingFromNorth(dx, dy);
      const weight = directionalWeight(direction, spot.preferredMin, spot.preferredMax);
      total += computeRingEnergy(ring) * weight;
    }
  });

  return Math.min(total, MAX_SPOT_ENERGY);
}

function bearingFromNorth(dx, dy) {
  return ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
}

export function classifyHeight(height) {
  if (height < 0.5) return "Flat";
  if (height < 2) return "Fun";
  if (height < 4) return "Solid";
  return "XL";
}
