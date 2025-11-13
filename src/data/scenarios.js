const baseStorm = (overrides) => ({
  type: "preset",
  ...overrides
});

export const scenarios = [
  {
    id: "historic-major",
    name: "Historic Major NPAC Low",
    description: "Deep low northwest of Hawaiʻi tracking east, sending long-period WNW swell.",
    initialTimeHours: 0,
    storms: [
      baseStorm({
        id: "historic-core",
        name: "Historic Core",
        x: 0.55,
        y: 0.45,
        headingDeg: 135,
        speedUnits: 0.4,
        power: 8.5,
        windKts: 70
      }),
      baseStorm({
        id: "historic-secondary",
        name: "Secondary Fetch",
        x: 0.62,
        y: 0.3,
        headingDeg: 170,
        speedUnits: 0.2,
        power: 6.5,
        windKts: 55
      })
    ]
  },
  {
    id: "central-west",
    name: "Central Pacific West Swell",
    description: "Compact storm west of Hawaiʻi driving west-to-east swell trains.",
    initialTimeHours: 6,
    storms: [
      baseStorm({
        id: "central-driver",
        name: "Central Driver",
        x: 0.6,
        y: 0.7,
        headingDeg: 100,
        speedUnits: 0.5,
        power: 7,
        windKts: 60
      }),
      baseStorm({
        id: "equatorial-helper",
        name: "Equatorial Helper",
        x: 0.68,
        y: 0.78,
        headingDeg: 80,
        speedUnits: 0.3,
        power: 5.5,
        windKts: 45
      })
    ]
  },
  {
    id: "aleutian-low",
    name: "Aleutian Hyper Low",
    description: "Large radius storm along the Aleutians producing northerly pulses.",
    initialTimeHours: 12,
    storms: [
      baseStorm({
        id: "aleutian-arc",
        name: "Aleutian Arc",
        x: 0.35,
        y: 0.18,
        headingDeg: 140,
        speedUnits: 0.35,
        power: 9,
        windKts: 80
      }),
      baseStorm({
        id: "bering-helper",
        name: "Bering Helper",
        x: 0.4,
        y: 0.25,
        headingDeg: 160,
        speedUnits: 0.25,
        power: 6,
        windKts: 50
      })
    ]
  }
];

export function getScenario(id) {
  return scenarios.find((scenario) => scenario.id === id);
}
