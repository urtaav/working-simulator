import { SCENES } from './settings.js';

export function nextScene(current, rng) {
  return rng.pick(SCENES.filter((s) => s !== current));
}

// ±10% so scene changes don't land on the exact minute every time
export function rotationDelayMs(minutes, rng) {
  if (!minutes) return null;
  return Math.round(minutes * 60000 * (0.9 + rng.next() * 0.2));
}
