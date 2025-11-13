const clockState = {
  hours: 0,
  playing: false,
  multiplier: 1
};

const listeners = new Set();

export function getClockSnapshot() {
  return { ...clockState };
}

export function subscribeClock(listener) {
  listeners.add(listener);
  listener(getClockSnapshot());
  return () => listeners.delete(listener);
}

function emit() {
  const snapshot = getClockSnapshot();
  listeners.forEach((listener) => listener(snapshot));
}

export function setMultiplier(value) {
  clockState.multiplier = Math.max(0.1, value);
  emit();
}

export function togglePlay() {
  clockState.playing = !clockState.playing;
  emit();
  return clockState.playing;
}

export function pause() {
  clockState.playing = false;
  emit();
}

export function resetClock() {
  clockState.hours = 0;
  clockState.playing = false;
  emit();
}

export function setClockHours(hours) {
  clockState.hours = hours;
  emit();
}

export function advance(deltaHours) {
  if (!clockState.playing) return;
  clockState.hours += deltaHours * clockState.multiplier;
  emit();
}
