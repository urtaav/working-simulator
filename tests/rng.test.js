import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/core/rng.js';

test('rng: same seed gives same sequence', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 20; i++) assert.equal(a.next(), b.next());
});

test('rng: next stays in [0,1)', () => {
  const r = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const v = r.next();
    assert.ok(v >= 0 && v < 1);
  }
});

test('rng: int stays in range and covers it', () => {
  const r = createRng(1);
  const seen = new Set();
  for (let i = 0; i < 1000; i++) {
    const v = r.int(3, 7);
    assert.ok(v >= 3 && v <= 7);
    seen.add(v);
  }
  assert.deepEqual([...seen].sort(), [3, 4, 5, 6, 7]);
});

test('rng: shuffle keeps elements and does not mutate input', () => {
  const r = createRng(3);
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const out = r.shuffle(input);
  assert.deepEqual([...out].sort((x, y) => x - y), input);
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('rng: pick and chance', () => {
  const r = createRng(9);
  for (let i = 0; i < 100; i++) assert.ok(['a', 'b'].includes(r.pick(['a', 'b'])));
  assert.equal(r.chance(0), false);
  assert.equal(r.chance(1), true);
});
