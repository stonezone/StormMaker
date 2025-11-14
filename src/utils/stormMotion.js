import { MAX_RADIUS_KM } from "../config/simConfig.js";

export const STORM_REF_SPEED_KMH = 40; // 1 speed unit ≈ 40 km/h

export function computeStormDeltaUnits(speedUnits, headingDeg, dtHours) {
  const safeSpeed = Math.max(0, speedUnits || 0);
  const safeHours = Math.max(0, dtHours || 0);
  const speedKmH = safeSpeed * STORM_REF_SPEED_KMH;
  const distanceKm = speedKmH * safeHours;
  const distanceUnits = distanceKm / MAX_RADIUS_KM;
  const headingRad = ((headingDeg ?? 0) * Math.PI) / 180;
  return {
    dx: Math.cos(headingRad) * distanceUnits,
    dy: Math.sin(headingRad) * distanceUnits
  };
}
