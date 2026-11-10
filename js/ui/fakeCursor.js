import { planPath, nextIdleTarget } from '../core/cursorPath.js';

// Drawn pointer. A web page can't move the real mouse, so we hide it and animate this one.
const ARROW = '<svg width="20" height="28" viewBox="0 0 20 28"><path d="M1 1v21l5.5-5.2 3.6 8.4 3.4-1.5-3.5-8.2H18z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>';
const BEAM = '<svg width="12" height="22" viewBox="0 0 12 22"><path d="M2 1h3l1 1 1-1h3M6 2v18M2 21h3l1-1 1 1h3" fill="none" stroke="#000" stroke-width="3"/><path d="M2 1h3l1 1 1-1h3M6 2v18M2 21h3l1-1 1 1h3" fill="none" stroke="#fff" stroke-width="1.3"/></svg>';

export function createFakeCursor(root) {
  const node = document.createElement('div');
  node.className = 'fake-cursor';
  node.innerHTML = ARROW;
  root.appendChild(node);
  let pos = { x: window.innerWidth * 0.6, y: window.innerHeight * 0.45 };
  let shape = 'arrow';

  function setShape(next) {
    if (next === shape) return;
    shape = next;
    node.innerHTML = next === 'text' ? BEAM : ARROW;
  }

  function place(p) {
    pos = { x: p.x, y: p.y };
    const ox = shape === 'text' ? -6 : -1;
    const oy = shape === 'text' ? -11 : -1;
    node.style.transform = `translate(${Math.round(p.x + ox)}px, ${Math.round(p.y + oy)}px)`;
  }

  // the I-beam shows over text areas, like a real OS pointer
  function updateShape() {
    node.style.visibility = 'hidden';
    const under = document.elementFromPoint(pos.x, pos.y);
    node.style.visibility = '';
    setShape(under?.closest('.ide-editor, .panel-body') ? 'text' : 'arrow');
  }

  // timers instead of requestAnimationFrame: rAF stops when the window is occluded,
  // and a scene waiting on the pointer would freeze with it
  function moveTo(target, rng) {
    const { points } = planPath(pos, target, rng);
    return new Promise((resolve) => {
      const t0 = performance.now();
      let i = 0;
      let frames = 0;
      function frame() {
        const elapsed = performance.now() - t0;
        while (i < points.length - 1 && points[i + 1].t <= elapsed) i++;
        place(points[i]);
        if (++frames % 6 === 0) updateShape();
        if (i >= points.length - 1) {
          updateShape();
          resolve();
        } else setTimeout(frame, 16);
      }
      setTimeout(frame, 16);
    });
  }

  async function idleDrift(rng, bounds) {
    await moveTo(nextIdleTarget(bounds, rng), rng);
  }

  place(pos);
  return { moveTo, idleDrift, place, position: () => ({ ...pos }) };
}
