import { describe, it, expect } from "vitest";
import { scenarios, getScenario } from "../data/scenarios.js";

describe("scenarios", () => {
  it("provides at least three presets", () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(3);
  });

  it("retrieves scenario by id", () => {
    const scenario = getScenario("central-west");
    expect(scenario).toBeDefined();
    expect(scenario.storms.length).toBeGreaterThan(0);
  });
});
