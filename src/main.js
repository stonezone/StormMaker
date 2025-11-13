import "./styles/theme.css";
import "./styles/layout.css";

import { spots } from "./data/spots.js";
import { drawScene } from "./render/mapRenderer.js";
import {
  createRing,
  shouldEmitRing,
  advanceRing,
  sampleSpotEnergy,
  classifyHeight
} from "./physics/swell.js";
import {
  subscribe as subscribeStorms,
  beginPlacement,
  cancelPlacement,
  addStormAt,
  selectStorm,
  updateStorm,
  getSnapshot as getStormSnapshot
} from "./state/stormStore.js";
import {
  subscribeClock,
  setMultiplier,
  togglePlay,
  pause,
  resetClock,
  advance,
  getClockSnapshot,
  setClockHours
} from "./state/simClock.js";
import { replaceStorms } from "./state/stormStore.js";
import {
  subscribe as subscribeScenarioStore,
  loadScenario,
  getSnapshot as scenarioStoreSnapshot
} from "./state/scenarioStore.js";

const canvas = document.getElementById("storm-canvas");
const ctx = canvas?.getContext("2d");

if (!canvas || !ctx) {
  console.error("StormMaker requires a 2D canvas context.");
  const fallback = document.createElement("div");
  fallback.className = "canvas-error";
  fallback.textContent = "StormMaker requires a browser with Canvas support.";
  document.body.innerHTML = "";
  document.body.appendChild(fallback);
  throw new Error("Canvas 2D context unavailable");
}
const spotListEl = document.querySelector("[data-spot-list]");
const simTimeEl = document.getElementById("sim-time");
const speedSlider = document.getElementById("speed-control");
const speedLabel = document.querySelector("[data-speed-label]");
const tabButtons = document.querySelectorAll(".primary-tabs button");
const stormListEl = document.querySelector("[data-storm-list]");
const addStormBtn = document.querySelector("[data-add-storm]");
const placingIndicator = document.querySelector("[data-placing-indicator]");
const stormForm = document.querySelector("[data-storm-form]");
const stormFormInputs = stormForm?.querySelectorAll("input");
const emptyStateEl = document.querySelector("[data-empty-state]");
const playButton = document.querySelector(".control-button.play");
const pauseButton = document.querySelector(".control-button.pause");
const resetButton = document.querySelector(".control-button.reset");
const measureButton = document.querySelector(".control-button.measure");

const scenarioListEl = document.querySelector("[data-scenario-list]");
const tabPanels = document.querySelectorAll("[data-panel]");

const viewport = {
  width: 0,
  height: 0,
  dpr: window.devicePixelRatio || 1
};

const simState = {
  rings: [],
  lastUpdateHours: 0,
  measuring: false,
  measureStart: null,
  measureEnd: null
};

function populateSpotList() {
  if (!spotListEl) return;
  spotListEl.innerHTML = spots
    .map(
      (spot) => `
        <li>
          <span>
            <strong>${spot.name}</strong>
            <small>${spot.preferredDirection}</small>
          </span>
          <span>${spot.quality}</span>
        </li>`
    )
    .join("");
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  viewport.width = rect.width;
  viewport.height = rect.height;
  viewport.dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * viewport.dpr;
  canvas.height = rect.height * viewport.dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(viewport.dpr, viewport.dpr);
}

function setActiveTab(button) {
  const tabName = button.dataset.tab;
  tabButtons.forEach((tab) => tab.classList.remove("active"));
  button.classList.add("active");
  tabPanels.forEach((panel) => {
    if (panel.dataset.panel === tabName) {
      panel.removeAttribute("hidden");
    } else {
      panel.setAttribute("hidden", "true");
    }
  });
}

function hookTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button));
  });
}

function hookSpeedControl() {
  const updateLabel = () => {
    const multiplier = Number(speedSlider.value);
    speedLabel.textContent = `${multiplier.toFixed(1)}x`;
    setMultiplier(multiplier);
  };
  speedSlider.addEventListener("input", updateLabel);
  updateLabel();
}

function hookControls() {
  addStormBtn?.addEventListener("click", () => {
    beginPlacement();
  });

  playButton?.addEventListener("click", () => {
    togglePlay();
  });

  pauseButton?.addEventListener("click", () => {
    pause();
  });

  resetButton?.addEventListener("click", () => {
    resetClock();
    simState.rings = [];
  });

  measureButton?.addEventListener("click", () => {
    simState.measuring = !simState.measuring;
    if (!simState.measuring) {
      simState.measureStart = null;
      simState.measureEnd = null;
    }
    measureButton.classList.toggle("active", simState.measuring);
  });

  stormForm?.addEventListener("input", (event) => {
    const { name, value } = event.target;
    const numericFields = ["headingDeg", "speedUnits", "power", "windKts", "x", "y"];
    if (!numericFields.includes(name)) return;
    const { selectedId } = getStormSnapshot();
    if (!selectedId) return;
    updateStorm(selectedId, { [name]: Number(value) });
  });

  scenarioListEl?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-scenario-id]");
    if (!button) return;
    const scenario = loadScenario(button.dataset.scenarioId);
    if (scenario) {
      replaceStorms(scenario.storms);
      simState.rings = [];
      simState.lastUpdateHours = scenario.initialTimeHours;
      setClockHours(scenario.initialTimeHours);
      // Spec requirement: loading a scenario must pause the simulation
      pause();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === " ") {
      event.preventDefault();
      togglePlay();
    }
    if (event.key.toLowerCase() === "r") {
      resetClock();
      simState.rings = [];
    }
    if (event.key.toLowerCase() === "m") {
      measureButton?.click();
    }
  });
}

function renderStormList(snapshot) {
  if (!stormListEl) return;
  if (snapshot.storms.length === 0) {
    stormListEl.innerHTML = "";
    emptyStateEl?.removeAttribute("hidden");
    stormForm?.setAttribute("hidden", "true");
    return;
  }

  emptyStateEl?.setAttribute("hidden", "true");
  stormForm?.removeAttribute("hidden");
  stormListEl.innerHTML = snapshot.storms
    .map(
      (storm) => `
        <li data-id="${storm.id}" class="${storm.id === snapshot.selectedId ? "selected" : ""}">
          <span>
            <strong>${storm.name}</strong>
            <small>${storm.headingDeg.toFixed(0)}° • ${storm.power.toFixed(1)} power</small>
          </span>
          <span>${(storm.speedUnits || 0).toFixed(1)} u/h</span>
        </li>`
    )
    .join("");
}

function hookStormList() {
  stormListEl?.addEventListener("click", (event) => {
    const listItem = event.target.closest("li[data-id]");
    if (!listItem) return;
    selectStorm(listItem.dataset.id);
  });
}

function handleScenarioSnapshot(snapshot) {
  if (!scenarioListEl) return;
  scenarioListEl.innerHTML = snapshot.scenarios
    .map(
      (scenario) => `
        <li class="${scenario.id === snapshot.activeScenarioId ? "selected" : ""}">
          <div>
            <strong>${scenario.name}</strong>
            <small>${scenario.description}</small>
          </div>
          <button type="button" data-scenario-id="${scenario.id}" class="chip-button">
            ${scenario.id === snapshot.activeScenarioId ? "Loaded" : "Load"}
          </button>
        </li>`
    )
    .join("");
}

function syncStormForm(snapshot) {
  if (!stormFormInputs || !snapshot.selectedId) return;
  const selected = snapshot.storms.find((storm) => storm.id === snapshot.selectedId);
  if (!selected) return;
  stormFormInputs.forEach((input) => {
    input.value = selected[input.name];
  });
}

function hookCanvasInteractions() {
  let draggingId = null;

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const pointer = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height
    };
    if (draggingId) {
      updateStorm(draggingId, pointer);
      return;
    }
    if (simState.measuring && simState.measureStart) {
      simState.measureEnd = pointer;
    }
  });

  canvas.addEventListener("mousedown", (event) => {
    const snapshot = getStormSnapshot();
    if (snapshot.placing) {
      const rect = canvas.getBoundingClientRect();
      const pointer = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height
      };
      addStormAt(pointer);
      return;
    }

    if (simState.measuring) {
      const rect = canvas.getBoundingClientRect();
      const pointer = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height
      };
      if (!simState.measureStart) {
        simState.measureStart = pointer;
      } else {
        simState.measureEnd = pointer;
      }
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const pointer = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height
    };
    const storm = snapshot.storms.find((item) => {
      const dx = item.x - pointer.x;
      const dy = item.y - pointer.y;
      return Math.sqrt(dx * dx + dy * dy) < 0.04;
    });
    const playing = getClockSnapshot().playing;
    if (storm && !playing) {
      selectStorm(storm.id);
      draggingId = storm.id;
    } else if (storm && playing) {
      selectStorm(storm.id);
    } else {
      selectStorm(null);
    }
  });

  window.addEventListener("mouseup", () => {
    draggingId = null;
  });

  canvas.addEventListener("mouseleave", () => {
    draggingId = null;
  });
}

function updateRings(clockHours) {
  const stormSnapshot = getStormSnapshot();
  stormSnapshot.storms.forEach((storm) => {
    if (shouldEmitRing(storm, clockHours)) {
      storm.lastEmission = clockHours;
      simState.rings.push(createRing(storm, clockHours));
    }
  });

  const dtHours = Math.max(0, clockHours - simState.lastUpdateHours);
  simState.lastUpdateHours = clockHours;
  simState.rings.forEach((ring) => advanceRing(ring, dtHours));
  simState.rings = simState.rings.filter((ring) => ring.active);
}

function updateSpots() {
  const canvasSize = { width: viewport.width, height: viewport.height };
  spots.forEach((spot) => {
    const energy = sampleSpotEnergy(
      {
        x: spot.x,
        y: spot.y,
        preferredMin: spot.preferredMin,
        preferredMax: spot.preferredMax
      },
      simState.rings,
      canvasSize
    );
    spot.currentHeight = energy;
    spot.currentQuality = classifyHeight(energy);
  });
}

function renderSpotPanel() {
  if (!spotListEl) return;
  spotListEl.innerHTML = spots
    .map(
      (spot) => `
        <li>
          <span>
            <strong>${spot.name}</strong>
            <small>${spot.preferredDirection}</small>
          </span>
          <span>${(spot.currentHeight ?? 0).toFixed(1)} • ${spot.currentQuality ?? spot.quality ?? "--"}</span>
        </li>`
    )
    .join("");
}

function renderFrame(timestamp) {
  if (!renderFrame.lastTimestamp) {
    renderFrame.lastTimestamp = timestamp;
  }
  const deltaMs = timestamp - renderFrame.lastTimestamp;
  renderFrame.lastTimestamp = timestamp;
  advance(deltaMs / 1000);

  const frameTimeEl = document.querySelector("[data-frame-time]");
  const ringCountEl = document.querySelector("[data-ring-count]");
  frameTimeEl && (frameTimeEl.textContent = `${deltaMs.toFixed(1)}`);
  ringCountEl && (ringCountEl.textContent = `${simState.rings.length}`);

  const clockSnapshot = getClockSnapshot();
  if (clockSnapshot.playing) {
    updateRings(clockSnapshot.hours);
    updateSpots();
    renderSpotPanel();
  }

  const stormSnapshot = getStormSnapshot();
  drawScene(ctx, { width: viewport.width, height: viewport.height }, {
    spots,
    storms: stormSnapshot.storms,
    selectedId: stormSnapshot.selectedId,
    rings: simState.rings,
    measureOverlay: buildMeasureOverlay()
  });
  requestAnimationFrame(renderFrame);
}

function buildMeasureOverlay() {
  if (!simState.measureStart || !simState.measureEnd) return null;
  const { width, height } = viewport;
  const startX = simState.measureStart.x * width;
  const startY = simState.measureStart.y * height;
  const endX = simState.measureEnd.x * width;
  const endY = simState.measureEnd.y * height;
  const dx = simState.measureEnd.x - simState.measureStart.x;
  const dy = simState.measureEnd.y - simState.measureStart.y;
  const distance = Math.hypot(dx * width, dy * height) * (6000 / width);
  const bearing = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  return { startX, startY, endX, endY, distance, bearing };
}

function handleStormSnapshot(snapshot) {
  renderStormList(snapshot);
  syncStormForm(snapshot);
  if (snapshot.placing) {
    placingIndicator?.removeAttribute("hidden");
    canvas.style.cursor = "crosshair";
  } else {
    placingIndicator?.setAttribute("hidden", "true");
    canvas.style.cursor = "default";
  }
}

function handleClockSnapshot({ hours, playing }) {
  simTimeEl.textContent = hours.toFixed(1);
  if (playing) {
    playButton?.classList.add("active");
    pauseButton?.classList.remove("active");
  } else {
    playButton?.classList.remove("active");
    pauseButton?.classList.add("active");
  }
}

function init() {
  populateSpotList();
  hookTabs();
  hookSpeedControl();
  hookControls();
  hookStormList();
  hookCanvasInteractions();
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  subscribeStorms(handleStormSnapshot);
  subscribeClock(handleClockSnapshot);
  subscribeScenarioStore(handleScenarioSnapshot);
  handleStormSnapshot(getStormSnapshot());
  handleClockSnapshot(getClockSnapshot());
  handleScenarioSnapshot(scenarioStoreSnapshot());
  requestAnimationFrame(renderFrame);
}

init();
