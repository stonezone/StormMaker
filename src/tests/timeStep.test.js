import { describe, it, expect } from "vitest";
import { computeClampedDeltaHours, MAX_DELTA_HOURS } from "../utils/timeStep.js";

describe("computeClampedDeltaHours", () => {
  it("caps large deltaMs to MAX_DELTA_HOURS", () => {
    const massiveDeltaMs = 1000 * 60 * 60 * 48; // 48 real hours
    const baseAccel = 3600; // default
    const clamped = computeClampedDeltaHours(massiveDeltaMs, baseAccel);
    expect(clamped).toBe(MAX_DELTA_HOURS);
  });

  it("returns zero for negative or invalid inputs", () => {
    expect(computeClampedDeltaHours(-1000, 3600)).toBe(0);
    expect(computeClampedDeltaHours(0, NaN)).toBe(0);
  });

  it("passes through small deltas untouched", () => {
    const deltaMs = 1000; // 1s
    const accel = 3600;
    const expected = (deltaMs / 3600000) * accel;
    expect(computeClampedDeltaHours(deltaMs, accel)).toBeCloseTo(expected, 5);
  });
});
