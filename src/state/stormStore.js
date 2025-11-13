const defaultStormConfig = {
  headingDeg: 300,
  speedUnits: 0.6,
  power: 5,
  windKts: 40,
  radiusKm: 400,
  active: true
};

const state = {
  storms: [],
  selectedId: null,
  placing: false,
  counter: 1
};

const listeners = new Set();

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

function emit() {
  const snapshot = getSnapshot();
  listeners.forEach((listener) => listener(snapshot));
}

export function getSnapshot() {
  return {
    storms: state.storms.map((storm) => ({ ...storm })),
    selectedId: state.selectedId,
    placing: state.placing
  };
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(getSnapshot());
  return () => listeners.delete(listener);
}

export function beginPlacement() {
  state.placing = true;
  emit();
}

export function cancelPlacement() {
  if (!state.placing) return;
  state.placing = false;
  emit();
}

export function addStormAt({ x, y }) {
  const storm = normalizeStorm({
    type: "custom",
    x: clamp(x),
    y: clamp(y)
  });
  state.storms.push(storm);
  state.selectedId = storm.id;
  state.placing = false;
  emit();
  return storm;
}

export function selectStorm(id) {
  state.selectedId = id;
  emit();
}

export function updateStorm(id, updates) {
  const storm = state.storms.find((item) => item.id === id);
  if (!storm) return;

  // Handle position updates atomically to prevent storms on land
  if (isFiniteNumber(updates.x) || isFiniteNumber(updates.y)) {
    const nextX = isFiniteNumber(updates.x) ? clamp(updates.x) : storm.x;
    const nextY = isFiniteNumber(updates.y) ? clamp(updates.y) : storm.y;

    if (!isOverLand(nextX, nextY)) {
      storm.x = nextX;
      storm.y = nextY;
    }
  }

  if (isFiniteNumber(updates.headingDeg)) {
    storm.headingDeg = ((updates.headingDeg % 360) + 360) % 360;
  }
  if (isFiniteNumber(updates.speedUnits)) {
    storm.speedUnits = Math.max(0, updates.speedUnits);
  }
  if (isFiniteNumber(updates.power)) {
    storm.power = clamp(updates.power, 0, 10);
  }
  if (isFiniteNumber(updates.windKts)) {
    storm.windKts = Math.max(0, updates.windKts);
  }
  if (typeof updates.name === "string" && updates.name.trim().length) {
    storm.name = updates.name.slice(0, 40);
  }
  emit();
}

export function resetStorms() {
  state.storms = [];
  state.selectedId = null;
  state.counter = 1;
  emit();
}

export function replaceStorms(storms = []) {
  state.storms = storms.map((storm) => normalizeStorm(storm));
  state.selectedId = state.storms[0]?.id ?? null;
  state.counter = state.storms.length + 1;
  emit();
}

function normalizeStorm(storm = {}) {
  const normalized = {
    ...defaultStormConfig,
    ...storm
  };
  normalized.x = clamp(isFiniteNumber(normalized.x) ? normalized.x : 0.5);
  normalized.y = clamp(isFiniteNumber(normalized.y) ? normalized.y : 0.5);
  if (isOverLand(normalized.x, normalized.y)) {
    normalized.x = 0.5;
    normalized.y = 0.5;
  }
  if (!storm.id) {
    normalized.id = `storm-${Date.now()}-${Math.round(Math.random() * 1000)}`;
  }
  if (!storm.name) {
    normalized.name = `Storm ${state.counter++}`;
  }
  if (!storm.type) {
    normalized.type = "custom";
  }
  return normalized;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isOverLand(x, y) {
  // Simple exclusion zone around the Hawaiian islands (lower-right quadrant)
  const nearHawaii = x > 0.65 && x < 0.85 && y > 0.65 && y < 0.9;
  const farNorth = y < 0.05;
  return nearHawaii || farNorth;
}
