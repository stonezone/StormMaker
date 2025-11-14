import { describe, it, expect } from "vitest";
import { computeStormDeltaUnits, STORM_REF_SPEED_KMH } from "../utils/stormMotion.js";
import { MAX_RADIUS_KM } from "../config/simConfig.js";

describe("computeStormDeltaUnits", () => {
  it("moves storms the expected map distance", () => {
    const speedUnits = 0.5; // = 0.5 * 40 km/h = 20 km/h
    const dtHours = 5;
    const expectedDistanceKm = speedUnits * STORM_REF_SPEED_KMH * dtHours;
    const expectedUnits = expectedDistanceKm / MAX_RADIUS_KM;
    const { dx, dy } = computeStormDeltaUnits(speedUnits, 0, dtHours);
    expect(dx).toBeCloseTo(expectedUnits, 6);
    expect(dy).toBeCloseTo(0, 6);
  });

  it("handles arbitrary headings", () => {
    const { dx, dy } = computeStormDeltaUnits(1, 90, 1);
    expect(dx).toBeCloseTo(0, 6);
    expect(dy).toBeGreaterThan(0);
  });
});
