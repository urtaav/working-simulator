import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/core/rng.js';
import { createNoRepeat } from '../js/core/noRepeat.js';

test('noRepeat: avoids the last N picks', () => {
  const rng = createRng(5);
  const nr = createNoRepeat(3);
  const picks = [];
  for (let i = 0; i < 50; i++) picks.push(nr.pickFresh(rng, ['a', 'b', 'c', 'd']));
  for (let i = 1; i < picks.length; i++) {
    const recent = picks.slice(Math.max(0, i - 3), i);
    assert.ok(!recent.includes(picks[i]), `repeat at ${i}: ${picks.slice(i - 3, i + 1)}`);
  }
});

test('noRepeat: falls back when pool is smaller than window', () => {
  const rng = createRng(5);
  const nr = createNoRepeat(3);
  for (let i = 0; i < 5; i++) assert.equal(nr.pickFresh(rng, ['a']), 'a');
});

test('noRepeat: keyOf and remember', () => {
  const rng = createRng(2);
  const nr = createNoRepeat(1);
  nr.remember('x');
  const items = [{ id: 'x' }, { id: 'y' }];
  for (let i = 0; i < 10; i++) {
    const p = nr.pickFresh(rng, items, (t) => t.id);
    assert.notEqual(p.id, i === 0 ? 'x' : undefined);
  }
});
