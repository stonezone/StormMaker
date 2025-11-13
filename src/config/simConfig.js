export const MAX_RADIUS_KM = 6000;

const DEFAULTS = {
  baseTimeAcceleration: 3600,
  ringSectorWidthDeg: 120,
  ringSampleTolerancePx: 40,
  ringPropagationSpeedKmH: 60,
  ringDecayRatePerKm: 0.001,
  ringMinActiveEnergy: 0.05,
  spotEnergyCap: 10,
  showStormVectors: true,
  spotEnergySmoothingAlpha: 0.25
};

const simConfig = loadConfig();

function loadConfig() {
  try {
    const stored = localStorage.getItem("stormmaker-sim-config");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        baseTimeAcceleration: validateBaseTime(parsed.baseTimeAcceleration) ?? DEFAULTS.baseTimeAcceleration,
        ringSectorWidthDeg: validateSector(parsed.ringSectorWidthDeg) ?? DEFAULTS.ringSectorWidthDeg,
        ringSampleTolerancePx: validateTolerance(parsed.ringSampleTolerancePx) ?? DEFAULTS.ringSampleTolerancePx,
        ringPropagationSpeedKmH: validatePositive(parsed.ringPropagationSpeedKmH) ?? DEFAULTS.ringPropagationSpeedKmH,
        ringDecayRatePerKm: validatePositive(parsed.ringDecayRatePerKm) ?? DEFAULTS.ringDecayRatePerKm,
        ringMinActiveEnergy: validatePositive(parsed.ringMinActiveEnergy) ?? DEFAULTS.ringMinActiveEnergy,
        spotEnergyCap: validatePositive(parsed.spotEnergyCap) ?? DEFAULTS.spotEnergyCap,
        showStormVectors: parseBoolean(parsed.showStormVectors, DEFAULTS.showStormVectors),
        spotEnergySmoothingAlpha:
          validateSmoothing(parsed.spotEnergySmoothingAlpha) ?? DEFAULTS.spotEnergySmoothingAlpha
      };
    }
  } catch (err) {
    // ignore storage errors (e.g., disabled)
  }
  return { ...DEFAULTS };
}

function persistConfig() {
  try {
    localStorage.setItem("stormmaker-sim-config", JSON.stringify(simConfig));
  } catch (err) {
    // storage might be unavailable; silently ignore
  }
}

export function getSimConfig() {
  return simConfig;
}

export function setBaseTimeAcceleration(value) {
  const valid = validateBaseTime(value);
  if (valid != null) {
    simConfig.baseTimeAcceleration = valid;
    persistConfig();
  }
}

export function setRingSectorWidthDeg(value) {
  const valid = validateSector(value);
  if (valid != null) {
    simConfig.ringSectorWidthDeg = valid;
    persistConfig();
  }
}

export function setRingSampleTolerancePx(value) {
  const valid = validateTolerance(value);
  if (valid != null) {
    simConfig.ringSampleTolerancePx = valid;
    persistConfig();
  }
}

export function setRingPropagationSpeedKmH(value) {
  const valid = validatePositive(value);
  if (valid != null) {
    simConfig.ringPropagationSpeedKmH = valid;
    persistConfig();
  }
}

export function setRingDecayRatePerKm(value) {
  const valid = validatePositive(value);
  if (valid != null) {
    simConfig.ringDecayRatePerKm = valid;
    persistConfig();
  }
}

export function setRingMinActiveEnergy(value) {
  const valid = validatePositive(value);
  if (valid != null) {
    simConfig.ringMinActiveEnergy = valid;
    persistConfig();
  }
}

export function setSpotEnergyCap(value) {
  const valid = validatePositive(value);
  if (valid != null) {
    simConfig.spotEnergyCap = valid;
    persistConfig();
  }
}

export function setShowStormVectors(value) {
  simConfig.showStormVectors = Boolean(value);
  persistConfig();
}

export function setSpotEnergySmoothingAlpha(value) {
  const valid = validateSmoothing(value);
  if (valid != null) {
    simConfig.spotEnergySmoothingAlpha = valid;
    persistConfig();
  }
}

export function resetSimConfig() {
  simConfig.baseTimeAcceleration = DEFAULTS.baseTimeAcceleration;
  simConfig.ringSectorWidthDeg = DEFAULTS.ringSectorWidthDeg;
  simConfig.ringSampleTolerancePx = DEFAULTS.ringSampleTolerancePx;
  simConfig.ringPropagationSpeedKmH = DEFAULTS.ringPropagationSpeedKmH;
  simConfig.ringDecayRatePerKm = DEFAULTS.ringDecayRatePerKm;
  simConfig.ringMinActiveEnergy = DEFAULTS.ringMinActiveEnergy;
  simConfig.spotEnergyCap = DEFAULTS.spotEnergyCap;
  simConfig.showStormVectors = DEFAULTS.showStormVectors;
  simConfig.spotEnergySmoothingAlpha = DEFAULTS.spotEnergySmoothingAlpha;
  try {
    localStorage.removeItem("stormmaker-sim-config");
  } catch (err) {
    // ignore
  }
}

function validateBaseTime(value) {
  return Number.isFinite(value) && value > 0 ? value : null;
}

function validateSector(value) {
  return Number.isFinite(value) && value >= 10 && value <= 360 ? value : null;
}

function validateTolerance(value) {
  return Number.isFinite(value) && value >= 5 && value <= 200 ? value : null;
}

function validatePositive(value) {
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function validateSmoothing(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}
