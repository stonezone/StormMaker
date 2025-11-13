import "./styles/theme.css";
import "./styles/layout.css";

import { spots } from "./data/spots.js";
import { drawScene } from "./render/mapRenderer.js";
import {
  createRing,
  shouldEmitRing,
  advanceRing,
  sampleSpotEnergy,
  classifyHeight,
  bearingFromNorth,
  resetRingEnergyCache,
  getRingEnergyCacheStats,
  resetRingEnergyCacheStats
} from "./physics/swell.js";
import {
  getSimConfig,
  setBaseTimeAcceleration,
  setRingSectorWidthDeg,
  setRingSampleTolerancePx,
  setRingPropagationSpeedKmH,
  setRingDecayRatePerKm,
  setRingMinActiveEnergy,
  setSpotEnergyCap,
  setShowStormVectors,
  setSpotEnergySmoothingAlpha,
  MAX_RADIUS_KM
} from "./config/simConfig.js";
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
import {
  subscribe as subscribeStorms,
  beginPlacement,
  cancelPlacement,
  addStormAt,
  selectStorm,
  updateStorm,
  deleteStorm,
  getSnapshot as getStormSnapshot,
  replaceStorms
} from "./state/stormStore.js";
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
const baseTimeInput = document.querySelector("[data-config-base-time]");
const sectorInput = document.querySelector("[data-config-sector]");
const sampleInput = document.querySelector("[data-config-sample]");
const spotSmoothInput = document.querySelector("[data-config-spot-smoothing]");
const propSpeedInput = document.querySelector("[data-config-prop-speed]");
const decayInput = document.querySelector("[data-config-decay]");
const minEnergyInput = document.querySelector("[data-config-min-energy]");
const spotCapInput = document.querySelector("[data-config-spot-cap]");
const stormVectorToggle = document.querySelector("[data-config-storm-vectors]");
const deleteStormBtn = document.querySelector("[data-delete-storm]");
const resetConfigBtn = document.querySelector("[data-config-reset]");
const frameTimeEl = document.querySelector("[data-frame-time]");
const frameFpsEl = document.querySelector("[data-frame-fps]");
const ringCountEl = document.querySelector("[data-ring-count]");
const cacheHitsEl = document.querySelector("[data-cache-hits]");
const cacheMissesEl = document.querySelector("[data-cache-misses]");
const cacheHitRateEl = document.querySelector("[data-cache-hit-rate]");

const viewport = {
  cssWidth: 0,
  cssHeight: 0,
  dpr: window.devicePixelRatio || 1
};

const cleanupCallbacks = [];
let initialized = false;

function registerCleanup(fn) {
  if (typeof fn === "function") {
    cleanupCallbacks.push(fn);
  }
}

function runCleanup() {
  while (cleanupCallbacks.length) {
    const fn = cleanupCallbacks.pop();
    try {
      fn();
    } catch (err) {
      console.warn("Cleanup error", err);
    }
  }
}

function addListener(target, type, handler, options) {
  if (!target?.addEventListener) return;
  target.addEventListener(type, handler, options);
  registerCleanup(() => target.removeEventListener(type, handler, options));
}

const simState = {
  rings: [],
  lastUpdateHours: 0,
  measuring: false,
  measureStart: null,
  measureEnd: null,
  stormEmissionTimes: new Map() // Track lastEmission per storm ID
};

const diagnostics = {
  fpsEma: null
};

let isPlaying = false;
let wasPlayingBeforeHide = false;

let animationId = null;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

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
  viewport.cssWidth = rect.width;
  viewport.cssHeight = rect.height;
  viewport.dpr = Math.max(1, window.devicePixelRatio || 1);

  const renderWidth = Math.round(rect.width * viewport.dpr);
  const renderHeight = Math.round(rect.height * viewport.dpr);
  if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
    canvas.width = renderWidth;
    canvas.height = renderHeight;
  }
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(viewport.dpr, viewport.dpr);
}

function setActiveTab(button) {
  const tabName = button.dataset.tab;
  tabButtons.forEach((tab) => {
    const isActive = tab === button;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
    tab.setAttribute("tabindex", isActive ? "0" : "-1");
  });
  tabPanels.forEach((panel) => {
    if (panel.dataset.panel === tabName) {
      panel.removeAttribute("hidden");
    } else {
      panel.setAttribute("hidden", "true");
    }
  });
}

function hookTabs() {
  const tabsArray = Array.from(tabButtons);
  tabsArray.forEach((button) => {
    const isActive = button.classList.contains("active");
    button.setAttribute("role", "tab");
    button.setAttribute("tabindex", isActive ? "0" : "-1");
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    addListener(button, "click", () => setActiveTab(button));
    addListener(button, "keydown", (event) => {
      let nextIndex = null;
      if (event.key === "ArrowRight") {
        nextIndex = (tabsArray.indexOf(button) + 1) % tabsArray.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex = (tabsArray.indexOf(button) - 1 + tabsArray.length) % tabsArray.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabsArray.length - 1;
      }
      if (nextIndex != null) {
        event.preventDefault();
        const targetTab = tabsArray[nextIndex];
        setActiveTab(targetTab);
        targetTab.focus();
      }
    });
  });
}

function hookSpeedControl() {
  const updateLabel = () => {
    const multiplier = Number(speedSlider.value);
    speedLabel.textContent = `${multiplier.toFixed(1)}x`;
    setMultiplier(multiplier);
  };
  addListener(speedSlider, "input", updateLabel);
  updateLabel();
}

function hookControls() {
  addListener(addStormBtn, "click", () => {
    beginPlacement();
  });

  addListener(playButton, "click", () => {
    togglePlay();
  });

  addListener(pauseButton, "click", () => {
    pause();
  });

  addListener(resetButton, "click", () => {
    resetClock();
    clearRings();
  });

  addListener(measureButton, "click", () => {
    simState.measuring = !simState.measuring;
    if (!simState.measuring) {
      simState.measureStart = null;
      simState.measureEnd = null;
    }
    measureButton.classList.toggle("active", simState.measuring);
  });

  addListener(stormForm, "input", (event) => {
    const { name, value } = event.target;
    const numericFields = ["headingDeg", "speedUnits", "power", "windKts", "x", "y"];
    if (!numericFields.includes(name)) return;
    const { selectedId } = getStormSnapshot();
    if (!selectedId) return;
    updateStorm(selectedId, { [name]: Number(value) });
  });

  addListener(scenarioListEl, "click", (event) => {
    const button = event.target.closest("button[data-scenario-id]");
    if (!button) return;
    const scenario = loadScenario(button.dataset.scenarioId);
    if (scenario) {
      replaceStorms(scenario.storms);
      clearRings();
      simState.lastUpdateHours = scenario.initialTimeHours;
      setClockHours(scenario.initialTimeHours);
      // Spec requirement: loading a scenario must pause the simulation
      pause();
    }
  });

  addListener(document, "keydown", (event) => {
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

  deleteStormBtn?.addEventListener("click", () => {
    if (isPlaying) return;
    const { selectedId } = getStormSnapshot();
    if (selectedId) {
      deleteStorm(selectedId);
    }
  });
}

function hookConfigControls() {
  const config = getSimConfig();
  if (baseTimeInput) {
    baseTimeInput.value = config.baseTimeAcceleration;
    baseTimeInput.addEventListener("change", () => {
      const next = Number(baseTimeInput.value);
      if (Number.isFinite(next) && next > 0) {
        setBaseTimeAcceleration(next);
      } else {
        baseTimeInput.value = getSimConfig().baseTimeAcceleration;
      }
    });
  }

  if (sectorInput) {
    sectorInput.value = config.ringSectorWidthDeg;
    sectorInput.addEventListener("change", () => {
      const next = Number(sectorInput.value);
      if (Number.isFinite(next) && next >= 10 && next <= 360) {
        setRingSectorWidthDeg(next);
      } else {
        sectorInput.value = getSimConfig().ringSectorWidthDeg;
      }
    });
  }

  if (sampleInput) {
    sampleInput.value = config.ringSampleTolerancePx;
    sampleInput.addEventListener("change", () => {
      const next = Number(sampleInput.value);
      if (Number.isFinite(next) && next >= 5 && next <= 200) {
        setRingSampleTolerancePx(next);
      } else {
        sampleInput.value = getSimConfig().ringSampleTolerancePx;
      }
    });
  }

  if (propSpeedInput) {
    propSpeedInput.value = config.ringPropagationSpeedKmH;
    propSpeedInput.addEventListener("change", () => {
      const next = Number(propSpeedInput.value);
      if (Number.isFinite(next) && next >= 10 && next <= 500) {
        setRingPropagationSpeedKmH(next);
      } else {
        propSpeedInput.value = getSimConfig().ringPropagationSpeedKmH;
      }
    });
  }

  if (decayInput) {
    decayInput.value = config.ringDecayRatePerKm;
    decayInput.addEventListener("change", () => {
      const next = Number(decayInput.value);
      if (Number.isFinite(next) && next >= 0.0001 && next <= 0.01) {
        setRingDecayRatePerKm(next);
      } else {
        decayInput.value = getSimConfig().ringDecayRatePerKm;
      }
    });
  }

  if (minEnergyInput) {
    minEnergyInput.value = config.ringMinActiveEnergy;
    minEnergyInput.addEventListener("change", () => {
      const next = Number(minEnergyInput.value);
      if (Number.isFinite(next) && next >= 0.01 && next <= 5) {
        setRingMinActiveEnergy(next);
      } else {
        minEnergyInput.value = getSimConfig().ringMinActiveEnergy;
      }
    });
  }

  if (spotCapInput) {
    spotCapInput.value = config.spotEnergyCap;
    spotCapInput.addEventListener("change", () => {
      const next = Number(spotCapInput.value);
      if (Number.isFinite(next) && next >= 1 && next <= 50) {
        setSpotEnergyCap(next);
      } else {
        spotCapInput.value = getSimConfig().spotEnergyCap;
      }
    });
  }

  if (stormVectorToggle) {
    stormVectorToggle.checked = config.showStormVectors;
    stormVectorToggle.addEventListener("change", () => {
      setShowStormVectors(stormVectorToggle.checked);
    });
  }

  resetConfigBtn?.addEventListener("click", () => {
    resetSimConfig();
    const fresh = getSimConfig();
    if (baseTimeInput) baseTimeInput.value = fresh.baseTimeAcceleration;
    if (sectorInput) sectorInput.value = fresh.ringSectorWidthDeg;
    if (sampleInput) sampleInput.value = fresh.ringSampleTolerancePx;
    if (propSpeedInput) propSpeedInput.value = fresh.ringPropagationSpeedKmH;
    if (decayInput) decayInput.value = fresh.ringDecayRatePerKm;
    if (minEnergyInput) minEnergyInput.value = fresh.ringMinActiveEnergy;
    if (spotCapInput) spotCapInput.value = fresh.spotEnergyCap;
    if (stormVectorToggle) stormVectorToggle.checked = fresh.showStormVectors;
  });
}

function renderStormList(snapshot) {
  if (!stormListEl) return;
  if (snapshot.storms.length === 0) {
    stormListEl.innerHTML = "";
    emptyStateEl?.removeAttribute("hidden");
    stormForm?.setAttribute("hidden", "true");
    updateDeleteButtonState(null);
    return;
  }

  emptyStateEl?.setAttribute("hidden", "true");
  if (snapshot.selectedId) {
    stormForm?.removeAttribute("hidden");
  } else {
    stormForm?.setAttribute("hidden", "true");
  }
  stormListEl.innerHTML = snapshot.storms
    .map(
      (storm) => `
        <li data-id="${escapeHtml(storm.id)}" class="${storm.id === snapshot.selectedId ? "selected" : ""}">
          <span>
            <strong>${escapeHtml(storm.name)}</strong>
            <small>${storm.headingDeg.toFixed(0)}° • ${storm.power.toFixed(1)} power</small>
          </span>
          <span>${(storm.speedUnits || 0).toFixed(1)} u/h</span>
        </li>`
    )
    .join("");

  updateDeleteButtonState(snapshot.selectedId);
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
            <strong>${escapeHtml(scenario.name)}</strong>
            <small>${escapeHtml(scenario.description)}</small>
          </div>
          <button type="button" data-scenario-id="${escapeHtml(scenario.id)}" class="chip-button">
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
  let activePointerId = null;

  const pointerToCanvas = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height
    };
  };

  const handlePointerDown = (event) => {
    event.preventDefault();
    activePointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    const pointer = pointerToCanvas(event);
    const snapshot = getStormSnapshot();

    if (snapshot.placing) {
      addStormAt(pointer);
      return;
    }

    if (simState.measuring) {
      if (!simState.measureStart) {
        simState.measureStart = pointer;
        simState.measureEnd = null;
      } else {
        simState.measureEnd = pointer;
      }
      return;
    }

    const storm = snapshot.storms.find((item) => {
      const dx = item.x - pointer.x;
      const dy = item.y - pointer.y;
      return Math.sqrt(dx * dx + dy * dy) < 0.04;
    });
    const playing = getClockSnapshot().playing;
    if (storm && !playing) {
      selectStorm(storm.id);
      draggingId = storm.id;
    } else if (storm) {
      selectStorm(storm.id);
    } else {
      selectStorm(null);
    }
  };

  const handlePointerMove = (event) => {
    const pointer = pointerToCanvas(event);
    if (draggingId && event.pointerId === activePointerId) {
      event.preventDefault();
      updateStorm(draggingId, pointer);
      return;
    }
    if (simState.measuring && simState.measureStart) {
      simState.measureEnd = pointer;
    }
  };

  const handlePointerUp = (event) => {
    if (event.pointerId === activePointerId) {
      draggingId = null;
      activePointerId = null;
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch (err) {
        // ignore release errors
      }
    }
  };

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
}

function updateRings(clockHours) {
  const stormSnapshot = getStormSnapshot();
  const dtHours = Math.max(0, clockHours - simState.lastUpdateHours);

  // Update storm positions based on heading and speed
  stormSnapshot.storms.forEach((storm) => {
    if (storm.active && storm.speedUnits > 0) {
      const headingRad = (storm.headingDeg * Math.PI) / 180;
      // Scale factor: speedUnits are relative map units per hour
      const scale = 0.01; // Adjust to make storms move at reasonable pace
      const newX = storm.x + Math.cos(headingRad) * storm.speedUnits * dtHours * scale;
      const newY = storm.y + Math.sin(headingRad) * storm.speedUnits * dtHours * scale;
      updateStorm(storm.id, { x: newX, y: newY });
    }
  });

  // Emit rings from storms
  stormSnapshot.storms.forEach((storm) => {
    const lastEmission = simState.stormEmissionTimes.get(storm.id) || 0;
    if (shouldEmitRing(storm, clockHours, lastEmission)) {
      simState.stormEmissionTimes.set(storm.id, clockHours);
      storm.lastEmission = clockHours;
      simState.rings.push(createRing(storm, clockHours));
    }
  });

  simState.lastUpdateHours = clockHours;
  simState.rings.forEach((ring) => advanceRing(ring, dtHours));
  simState.rings = simState.rings.filter((ring) => ring.active);
}

function updateSpots() {
  const canvasSize = { width: viewport.cssWidth, height: viewport.cssHeight };
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
  resetRingEnergyCache(simState.rings);
  resetRingEnergyCacheStats();
  const deltaHours = (deltaMs / 3600000) * getSimConfig().baseTimeAcceleration;
  advance(deltaHours);

  const clockSnapshot = getClockSnapshot();
  if (clockSnapshot.playing) {
    updateRings(clockSnapshot.hours);
    updateSpots();
    renderSpotPanel();
  }

  const stormSnapshot = getStormSnapshot();
  drawScene(ctx, { width: viewport.cssWidth, height: viewport.cssHeight }, {
    spots,
    storms: stormSnapshot.storms,
    selectedId: stormSnapshot.selectedId,
    rings: simState.rings,
    measureOverlay: buildMeasureOverlay()
  });
  updateDiagnostics(deltaMs);
  animationId = requestAnimationFrame(renderFrame);
}

function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function buildMeasureOverlay() {
  if (!simState.measureStart || !simState.measureEnd) return null;
  const width = viewport.cssWidth;
  const height = viewport.cssHeight;
  const startX = simState.measureStart.x * width;
  const startY = simState.measureStart.y * height;
  const endX = simState.measureEnd.x * width;
  const endY = simState.measureEnd.y * height;
  const dx = simState.measureEnd.x - simState.measureStart.x;
  const dy = simState.measureEnd.y - simState.measureStart.y;
  const distance = Math.hypot(dx, dy) * MAX_RADIUS_KM;
  const bearing = bearingFromNorth(dx, dy);
  return { startX, startY, endX, endY, distance, bearing };
}

function updateDiagnostics(deltaMs) {
  if (frameTimeEl) {
    frameTimeEl.textContent = `${deltaMs.toFixed(1)}`;
  }
  if (frameFpsEl) {
    if (deltaMs > 0) {
      const instantFps = 1000 / deltaMs;
      const alpha = 1 - Math.exp(-Math.min(1, deltaMs / 1000));
      diagnostics.fpsEma = diagnostics.fpsEma == null ? instantFps : diagnostics.fpsEma + alpha * (instantFps - diagnostics.fpsEma);
      frameFpsEl.textContent = diagnostics.fpsEma.toFixed(1);
    } else {
      frameFpsEl.textContent = "--";
    }
  }
  if (ringCountEl) {
    ringCountEl.textContent = `${simState.rings.filter((ring) => ring.active).length}`;
  }
  if (cacheHitsEl || cacheMissesEl || cacheHitRateEl) {
    const stats = getRingEnergyCacheStats();
    cacheHitsEl && (cacheHitsEl.textContent = `${stats.hits}`);
    cacheMissesEl && (cacheMissesEl.textContent = `${stats.misses}`);
    if (cacheHitRateEl) {
      const total = stats.hits + stats.misses;
      const rate = total > 0 ? ((stats.hits / total) * 100).toFixed(1) : "--";
      cacheHitRateEl.textContent = `${rate === "--" ? "--" : rate}%`;
    }
  }
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

function updateDeleteButtonState(selectedId) {
  if (!deleteStormBtn) return;
  const shouldHide = !selectedId;
  deleteStormBtn.hidden = shouldHide;
  deleteStormBtn.toggleAttribute("disabled", shouldHide || isPlaying);
}

function handleClockSnapshot({ hours, playing }) {
  isPlaying = playing;
  simTimeEl.textContent = hours.toFixed(1);
  if (playing) {
    playButton?.classList.add("active");
    pauseButton?.classList.remove("active");
  } else {
    playButton?.classList.remove("active");
    pauseButton?.classList.add("active");
  }
  updateDeleteButtonState(getStormSnapshot().selectedId);
}

function init() {
  populateSpotList();
  hookTabs();
  hookSpeedControl();
  hookControls();
  hookConfigControls();
  hookStormList();
  hookCanvasInteractions();
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  subscribeStorms(handleStormSnapshot);
  subscribeClock(handleClockSnapshot);
  subscribeScenarioStore(handleScenarioSnapshot);
  handleStormSnapshot(getStormSnapshot());
  handleClockSnapshot(getClockSnapshot());
  handleScenarioSnapshot(scenarioStoreSnapshot());
  animationId = requestAnimationFrame(renderFrame);
}

function clearRings() {
  resetRingEnergyCache(simState.rings);
  resetRingEnergyCacheStats();
  simState.rings = [];
}

function handleVisibilityChange() {
  if (document.hidden) {
    const clock = getClockSnapshot();
    wasPlayingBeforeHide = clock.playing;
    if (clock.playing) {
      pause();
    }
  } else if (wasPlayingBeforeHide) {
    wasPlayingBeforeHide = false;
    // intentional: user must press play to resume
  }
}

// Cleanup for Vite HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopAnimation();
  });
}

init();
