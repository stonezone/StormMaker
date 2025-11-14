export const MAX_DELTA_HOURS = 6;

export function computeClampedDeltaHours(deltaMs, baseTimeAcceleration, maxDeltaHours = MAX_DELTA_HOURS) {
  const safeDeltaMs = Math.max(0, deltaMs || 0);
  const accel = Number.isFinite(baseTimeAcceleration) && baseTimeAcceleration > 0 ? baseTimeAcceleration : 0;
  const rawDeltaHours = (safeDeltaMs / 3600000) * accel;
  if (!Number.isFinite(rawDeltaHours)) {
    return 0;
  }
  return Math.min(rawDeltaHours, maxDeltaHours);
}
