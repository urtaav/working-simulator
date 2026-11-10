// Pointer paths that read as a hand on a mouse: a slight arc, slow start, slow landing.
const SAMPLE_MS = 16;

export function planPath(from, to, rng) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  // Fitts-like: longer moves take longer, but not linearly
  const duration = (200 + 120 * Math.log2(1 + dist / 40)) * (0.8 + rng.next() * 0.4);

  // perpendicular unit vector to bend the path
  const nx = dist ? -dy / dist : 0;
  const ny = dist ? dx / dist : 0;
  const side = rng.chance(0.5) ? 1 : -1;
  const bend1 = side * dist * (0.05 + rng.next() * 0.15);
  const bend2 = side * dist * (0.05 + rng.next() * 0.15);
  const c1 = { x: from.x + dx * 0.3 + nx * bend1, y: from.y + dy * 0.3 + ny * bend1 };
  const c2 = { x: from.x + dx * 0.7 + nx * bend2, y: from.y + dy * 0.7 + ny * bend2 };

  const steps = Math.max(8, Math.round(duration / SAMPLE_MS));
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const s = 0.5 - 0.5 * Math.cos(Math.PI * u);
    const k = 1 - s;
    points.push({
      x: k * k * k * from.x + 3 * k * k * s * c1.x + 3 * k * s * s * c2.x + s * s * s * to.x,
      y: k * k * k * from.y + 3 * k * k * s * c1.y + 3 * k * s * s * c2.y + s * s * s * to.y,
      t: Math.round(u * duration),
    });
  }
  points[0] = { x: from.x, y: from.y, t: 0 };
  points[steps] = { x: to.x, y: to.y, t: points[steps].t };
  return { points };
}

export function nextIdleTarget(bounds, rng) {
  // mostly over the editor/panel area, sometimes toward the edges (tree, tabs, status bar)
  if (rng.chance(0.7)) {
    return { x: bounds.w * (0.15 + rng.next() * 0.7), y: bounds.h * (0.15 + rng.next() * 0.7) };
  }
  return { x: rng.next() * bounds.w, y: rng.next() * bounds.h };
}
