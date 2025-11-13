export function applyEma(previous, nextValue, alpha) {
  const weight = clamp(alpha ?? 0, 0, 1);
  const target = Number.isFinite(nextValue) ? nextValue : 0;
  if (!Number.isFinite(previous)) return target;
  if (weight <= 0) return previous;
  if (weight >= 1) return target;
  return weight * target + (1 - weight) * previous;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
