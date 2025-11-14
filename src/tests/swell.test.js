import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  directionalWeight,
  computeRingEnergy,
  advanceRing,
  createRing,
  classifyHeight,
  sampleSpotEnergy,
  bearingFromNorth,
  directionalFalloff
} from "../physics/swell.js";
import { MAX_RADIUS_KM, getSimConfig } from "../config/simConfig.js";

let configSnapshot;

beforeEach(() => {
  configSnapshot = { ...getSimConfig() };
});

afterEach(() => {
  Object.assign(getSimConfig(), configSnapshot);
});

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

describe("bearingFromNorth", () => {
  it("returns 0° when pointing straight up (north)", () => {
    expect(bearingFromNorth(0, -1)).toBeCloseTo(0, 5);
  });

  it("returns 90° when pointing east", () => {
    expect(bearingFromNorth(1, 0)).toBeCloseTo(90, 5);
  });

  it("returns 180° when pointing south", () => {
    expect(bearingFromNorth(0, 1)).toBeCloseTo(180, 5);
  });

  it("returns 270° when pointing west", () => {
    expect(bearingFromNorth(-1, 0)).toBeCloseTo(270, 5);
  });
});

describe("directionalFalloff", () => {
  it("drops weight when sector width narrows for off-axis angles", () => {
    const center = 0;
    const offAxis = 30;
    const wide = directionalFalloff(offAxis, center, 60);
    const narrow = directionalFalloff(offAxis, center, 20);
    expect(narrow).toBeLessThan(wide);
  });
});

describe("ring dynamics", () => {
  it("advanceRing grows radius per propagation speed × dt", () => {
    const config = getSimConfig();
    config.ringPropagationSpeedKmH = 80;
    const ring = createRing({ id: "test", power: 4, active: true }, 0);
    const expectedSpeed = config.ringPropagationSpeedKmH * (0.4 + 4 / 10);
    const dt = 1.25;
    advanceRing(ring, dt);
    expect(ring.radiusKm).toBeCloseTo(expectedSpeed * dt, 5);
  });

  it("computeRingEnergy decays with configured rate", () => {
    const config = getSimConfig();
    config.ringDecayRatePerKm = 0.002;
    const ring = createRing({ id: "test", power: 5, active: true }, 0);
    const initial = computeRingEnergy(ring);
    ring.radiusKm = 500;
    const later = computeRingEnergy(ring);
    expect(later).toBeLessThan(initial);
  });

  it("advanceRing deactivates once energy < min threshold", () => {
    const config = getSimConfig();
    config.ringMinActiveEnergy = 2;
    const ring = createRing({ id: "test", power: 0.5, active: true }, 0);
    advanceRing(ring, 1);
    expect(ring.active).toBe(false);
  });
});

describe("classifyHeight", () => {
  it("assigns qualitative buckets", () => {
    expect(classifyHeight(0.1)).toBe("Flat");
    expect(classifyHeight(1)).toBe("Fun");
    expect(classifyHeight(2.5)).toBe("Solid");
    expect(classifyHeight(6)).toBe("XL");
  });
});

describe("sampleSpotEnergy", () => {
  it("caps accumulated energy", () => {
    const spot = { x: 0.75, y: 0.8, preferredMin: 300, preferredMax: 330 };
    const rings = Array.from({ length: 20 }, (_, idx) => {
      const ring = createRing({ id: `r${idx}`, power: 10, active: true }, 0);
      ring.radiusKm = 0;
      ring.x = spot.x;
      ring.y = spot.y;
      return ring;
    });
    const value = sampleSpotEnergy(spot, rings, { width: 1000, height: 600 });
    expect(value).toBeLessThanOrEqual(10);
  });

  it("matches spot preferences based on incoming direction", () => {
    const canvas = { width: 1000, height: 1000 };
    const ring = createRing({ id: "dir", power: 4, active: true, headingDeg: 150 }, 0);
    ring.radiusKm = MAX_RADIUS_KM * 0.2;
    ring.x = 0.4;
    ring.y = 0.3;
    const spot = {
      x: 0.5,
      y: 0.5,
      preferredMin: 300,
      preferredMax: 330
    };
    const energy = sampleSpotEnergy(spot, [ring], canvas);
    expect(energy).toBeGreaterThan(0);
  });

  it("applies angular falloff", () => {
    const canvas = { width: 1200, height: 800 };
    const baseRing = () => {
      const ring = createRing({ id: "sector", power: 5, active: true, headingDeg: 0 }, 0);
      ring.x = 0.5;
      ring.y = 0.5;
      ring.headingDeg = 0;
      ring.radiusKm = MAX_RADIUS_KM * 0.05; // radius matched to 0.05 map units
      return ring;
    };

    const insideSpot = { x: 0.5, y: 0.45, preferredMin: 0, preferredMax: 359 };
    const outsideSpot = { x: 0.55, y: 0.5, preferredMin: 0, preferredMax: 359 };

    const ring = baseRing();
    const insideEnergy = sampleSpotEnergy(insideSpot, [ring], canvas);
    const outsideEnergy = sampleSpotEnergy(outsideSpot, [ring], canvas);
    expect(insideEnergy).toBeGreaterThan(outsideEnergy);
    expect(outsideEnergy).toBeGreaterThan(0);
    expect(outsideEnergy).toBeLessThan(insideEnergy * 0.5);
  });

  it("matches energy regardless of DPR when using CSS units", () => {
    const canvasCss = { width: 600, height: 600 };
    const spot = { x: 0.5, y: 0.5, preferredMin: 0, preferredMax: 360 };
    const rings = [
      (() => {
        const ring = createRing({ id: "dpr", power: 5, active: true, headingDeg: 0 }, 0);
        ring.x = 0.5;
        ring.y = 0.5;
        ring.radiusKm = MAX_RADIUS_KM * 0.1;
        return ring;
      })()
    ];

    const energy1x = sampleSpotEnergy(spot, rings, canvasCss);
    const energy2x = sampleSpotEnergy(spot, rings, { width: canvasCss.width * 2, height: canvasCss.height * 2 });
    expect(energy2x).toBeCloseTo(energy1x, 6);
  });
});
