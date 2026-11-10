import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/core/rng.js';
import { nextScene, rotationDelayMs } from '../js/core/rotation.js';
import { SCENES } from '../js/core/settings.js';

test('never returns the current scene and reaches all others', () => {
  const rng = createRng(1);
  for (const current of SCENES) {
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      const n = nextScene(current, rng);
      assert.notEqual(n, current);
      assert.ok(SCENES.includes(n));
      seen.add(n);
    }
    assert.equal(seen.size, SCENES.length - 1);
  }
});

test('delay has ±10% jitter and 0 means no rotation', () => {
  const rng = createRng(2);
  for (let i = 0; i < 100; i++) {
    const d = rotationDelayMs(10, rng);
    assert.ok(d >= 540000 && d <= 660000, `delay ${d}`);
  }
  assert.equal(rotationDelayMs(0, rng), null);
});
