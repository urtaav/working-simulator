import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLineBuffer, MAX_PANEL_LINES } from '../js/ui/panelView.js';

test('default cap is 400 lines', () => {
  assert.equal(MAX_PANEL_LINES, 400);
});

test('line buffer caps at max and keeps the newest', () => {
  const buf = createLineBuffer(400);
  for (let i = 0; i < 1000; i++) buf.push(`line ${i}`);
  assert.equal(buf.lines().length, 400);
  assert.equal(buf.lines().at(-1), 'line 999');
  assert.equal(buf.lines()[0], 'line 600');
});

test('clear empties the buffer so later pushes do not evict', () => {
  const buf = createLineBuffer(3);
  for (let i = 0; i < 3; i++) buf.push(`a${i}`);
  buf.clear();
  assert.deepEqual(buf.lines(), []);
  assert.deepEqual(buf.push('b0'), []);
});

test('push returns evicted lines', () => {
  const buf = createLineBuffer(400);
  for (let i = 0; i < 400; i++) assert.deepEqual(buf.push(`line ${i}`), []);
  assert.deepEqual(buf.push('line 400'), ['line 0']);
});
