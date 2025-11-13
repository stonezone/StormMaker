import { describe, it, expect } from "vitest";
import {
  directionalWeight,
  computeRingEnergy,
  advanceRing,
  createRing,
  classifyHeight,
  sampleSpotEnergy,
  MAX_RADIUS_KM
} from "../physics/swell.js";

describe("directionalWeight", () => {
  it("returns 1 inside window", () => {
    expect(directionalWeight(310, 300, 320)).toBe(1);
  });

  it("drops to zero far outside window", () => {
    const weight = directionalWeight(30, 300, 320);
    expect(weight).toBe(0);
  });

  it("handles wrap-around windows", () => {
    expect(directionalWeight(0, 350, 10)).toBe(1);
    expect(directionalWeight(180, 350, 10)).toBe(0);
  });
});

describe("computeRingEnergy", () => {
  it("decays as radius grows", () => {
    const ring = createRing({ id: "test", power: 5, active: true }, 0);
    const initial = computeRingEnergy(ring);
    ring.radiusKm = 2000;
    const later = computeRingEnergy(ring);
    expect(later).toBeLessThan(initial);
  });
});

describe("advanceRing", () => {
  it("increments radius and deactivates beyond max", () => {
    const ring = createRing({ id: "test", power: 5, active: true }, 0);
    advanceRing(ring, MAX_RADIUS_KM / ring.propagationSpeed + 1);
    expect(ring.active).toBe(false);
  });
});

describe("classifyHeight", () => {
  it("assigns qualitative buckets", () => {
    expect(classifyHeight(0.1)).toBe("Flat");
    expect(classifyHeight(1)).toBe("Fun");
    expect(classifyHeight(3)).toBe("Solid");
    expect(classifyHeight(5)).toBe("XL");
  });
});

describe("sampleSpotEnergy", () => {
  it("caps accumulated energy", () => {
    const spot = { x: 0.75, y: 0.8, preferredMin: 300, preferredMax: 330 };
    const rings = Array.from({ length: 20 }, (_, idx) => {
      const ring = createRing({ id: `r${idx}`, power: 10, active: true }, 0);
      ring.radiusKm = MAX_RADIUS_KM * 0.5;
      ring.x = spot.x;
      ring.y = spot.y - 0.01;
      return ring;
    });
    const value = sampleSpotEnergy(spot, rings, { width: 1000, height: 600 });
    expect(value).toBeLessThanOrEqual(10);
  });
});
