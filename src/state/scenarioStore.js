import { scenarios, getScenario } from "../data/scenarios.js";

const state = {
  activeScenarioId: null
};

const listeners = new Set();

function emit() {
  const snapshot = getSnapshot();
  listeners.forEach((listener) => listener(snapshot));
}

export function getSnapshot() {
  return {
    activeScenarioId: state.activeScenarioId,
    scenarios
  };
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(getSnapshot());
  return () => listeners.delete(listener);
}

export function loadScenario(id) {
  const scenario = getScenario(id);
  if (!scenario) return null;
  state.activeScenarioId = scenario.id;
  emit();
  return scenario;
}

export function resetScenarioState() {
  state.activeScenarioId = null;
  emit();
}
