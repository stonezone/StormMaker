import { computeRingEnergy, MAX_RADIUS_KM } from "../physics/swell.js";

const COAST_FILL = "rgba(238, 232, 213, 0.7)";
const COAST_STROKE = "rgba(44, 62, 80, 0.12)";
const fallbackPalette = {
  oceanBase: "#87CEEB",
  oceanDeep: "#1E5F74",
  accentCoral: "#FF6B6B",
  accentYellow: "#FFD93D",
  primary: "#2196F3"
};
const headingFontStack = 'Poppins, "Segoe UI", system-ui, sans-serif';
const bodyFontStack = 'Inter, "Open Sans", system-ui, sans-serif';
const monoFontStack = '"SFMono-Regular", Consolas, "Liberation Mono", monospace';

function resolvePalette() {
  if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
    return fallbackPalette;
  }
  const styles = window.getComputedStyle(document.documentElement);
  return {
    oceanBase: getStyleColor(styles, "--color-ocean-base", fallbackPalette.oceanBase),
    oceanDeep: getStyleColor(styles, "--color-ocean-deep", fallbackPalette.oceanDeep),
    accentCoral: getStyleColor(styles, "--color-accent-coral", fallbackPalette.accentCoral),
    accentYellow: getStyleColor(styles, "--color-accent-yellow", fallbackPalette.accentYellow),
    primary: getStyleColor(styles, "--color-primary", fallbackPalette.primary)
  };
}

function getStyleColor(styles, varName, fallback) {
  const value = styles.getPropertyValue(varName);
  if (!value) return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

const globalBgKey = "__stormmakerBgImage";
let backgroundImage = typeof window !== "undefined" ? window[globalBgKey] : null;
let backgroundReady = false;
let backgroundFailed = false;

if (typeof Image !== "undefined") {
  if (!backgroundImage) {
    backgroundImage = new Image();
    backgroundImage.src = "/assets/game-background.jpeg";
    if (typeof window !== "undefined") {
      window[globalBgKey] = backgroundImage;
    }
  }
  backgroundReady = backgroundImage.complete && backgroundImage.naturalWidth > 0;
  backgroundImage.onload = () => {
    backgroundReady = true;
  };
  backgroundImage.onerror = () => {
    backgroundFailed = true;
  };
}

export function drawScene(
  ctx,
  { width, height },
  { spots, storms, selectedId, rings = [], measureOverlay = null }
) {
  const palette = resolvePalette();
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height, palette);
  drawDarkOverlay(ctx, width, height);
  drawGrid(ctx, width, height);
  drawHawaiiInset(ctx, width, height, palette);
  drawRings(ctx, width, height, rings);
  drawStorms(ctx, width, height, storms, selectedId, palette);
  drawSpots(ctx, width, height, spots, palette);
  if (measureOverlay) {
    drawMeasureOverlay(ctx, measureOverlay, palette);
  }
}

function drawBackground(ctx, width, height, palette) {
  if (backgroundReady) {
    const imgRatio = backgroundImage.width / backgroundImage.height;
    const canvasRatio = width / height;
    let renderWidth;
    let renderHeight;
    if (canvasRatio > imgRatio) {
      renderWidth = width;
      renderHeight = width / imgRatio;
    } else {
      renderHeight = height;
      renderWidth = height * imgRatio;
    }
    const offsetX = (width - renderWidth) / 2;
    const offsetY = (height - renderHeight) / 2;
    ctx.drawImage(backgroundImage, offsetX, offsetY, renderWidth, renderHeight);
    return;
  }

  if (backgroundFailed) {
    drawFallbackOcean(ctx, width, height, palette);
    return;
  }

  // Loading placeholder
  drawFallbackOcean(ctx, width, height, palette);
}

function drawFallbackOcean(ctx, width, height, palette) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, palette.oceanBase);
  gradient.addColorStop(1, palette.oceanDeep);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawDarkOverlay(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(2, 11, 25, 0.35)");
  gradient.addColorStop(1, "rgba(2, 11, 25, 0.55)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(ctx, width, height) {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  for (let lat = 0; lat <= 6; lat += 1) {
    const y = (lat / 6) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let lon = 0; lon <= 8; lon += 1) {
    const x = (lon / 8) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawHawaiiInset(ctx, width, height, palette) {
  const centerX = width * 0.75;
  const centerY = height * 0.78;
  const radius = Math.min(width, height) * 0.12;

  // Glow ring
  const radGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.4, centerX, centerY, radius);
  radGrad.addColorStop(0, "rgba(255, 255, 255, 0.35)");
  radGrad.addColorStop(1, "rgba(33, 150, 243, 0)");
  ctx.fillStyle = radGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Oʻahu mark
  ctx.fillStyle = palette.accentCoral;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radius * 0.24, radius * 0.12, Math.PI / 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.7, Math.PI * 0.25, Math.PI * 1.2);
  ctx.stroke();

  ctx.fillStyle = "white";
  ctx.font = "600 14px " + headingFontStack;
  ctx.fillText("Oʻahu – North Shore", centerX - radius * 0.8, centerY - radius * 0.9);
}

function drawRings(ctx, width, height, rings) {
  rings.forEach((ring) => {
    const energy = computeRingEnergy(ring);
    const opacity = Math.max(0.15, Math.min(0.85, energy / 8));
    ctx.beginPath();
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity.toFixed(2)})`;
    ctx.lineWidth = 1 + energy * 0.2;
    const radiusPx = (ring.radiusKm / MAX_RADIUS_KM) * width;
    ctx.arc(ring.x * width, ring.y * height, radiusPx, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawStorms(ctx, width, height, storms, selectedId, palette) {
  storms.forEach((storm) => {
    const x = storm.x * width;
    const y = storm.y * height;

    ctx.strokeStyle = storm.id === selectedId ? "white" : "rgba(255,255,255,0.6)";
    ctx.lineWidth = storm.id === selectedId ? 4 : 2;
    ctx.setLineDash(storm.id === selectedId ? [6, 8] : []);
    ctx.beginPath();
    ctx.arc(x, y, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    const headingRad = (storm.headingDeg * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(headingRad) * 30, y + Math.sin(headingRad) * 30);
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.font = "600 12px " + headingFontStack;
    ctx.fillText(storm.name, x + 12, y - 12);
    ctx.font = "10px " + bodyFontStack;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`Pwr ${storm.power.toFixed(1)} • ${storm.headingDeg.toFixed(0)}°`, x + 12, y + 4);
  });
}

function drawSpots(ctx, width, height, spots, palette) {
  spots.forEach((spot) => {
    const x = spot.x * width;
    const y = spot.y * height;
    const energetic = (spot.currentHeight ?? 0) > 0.5;
    if (energetic) {
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = palette.accentYellow;
    }
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = palette.accentCoral;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (energetic) {
      ctx.restore();
    }

    ctx.fillStyle = "white";
    ctx.font = "600 12px " + monoFontStack;
    ctx.fillText(spot.name, x + 10, y - 6);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "10px " + bodyFontStack;
    const qualityLabel = spot.currentQuality ?? spot.quality ?? "";
    ctx.fillText(qualityLabel, x + 10, y + 8);
  });
}

function drawMeasureOverlay(ctx, overlay, palette) {
  const { startX, startY, endX, endY, distance, bearing } = overlay;
  ctx.strokeStyle = palette.accentYellow;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(endX + 10, endY - 20, 120, 40);
  ctx.fillStyle = "white";
  ctx.font = "600 12px " + monoFontStack;
  ctx.fillText(`${distance.toFixed(0)} km`, endX + 16, endY - 2);
  ctx.fillText(`${bearing.toFixed(0)}°`, endX + 16, endY + 12);
}
