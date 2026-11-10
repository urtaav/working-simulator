import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScheduler } from '../js/core/scheduler.js';

// Fake timers with a controllable clock. `advance` fires due timers in order.
function fakeTimers() {
  let now = 0;
  let seq = 0;
  const timers = new Map();
  return {
    now: () => now,
    setTimeout: (fn, ms) => {
      const id = ++seq;
      timers.set(id, { fn, at: now + ms });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    advance(ms) {
      const target = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = Math.max(now, due[1].at);
        due[1].fn();
      }
      now = target;
    },
    // simulates a hidden tab: the clock jumps but timers don't get a chance to run until later
    jump(ms) {
      now += ms;
    },
    pending: () => timers.size,
  };
}

test('after runs callback at the right time', () => {
  const ft = fakeTimers();
  const s = createScheduler(ft);
  let ran = 0;
  s.after(100, () => ran++);
  ft.advance(99);
  assert.equal(ran, 0);
  ft.advance(1);
  assert.equal(ran, 1);
});

test('cancelAll stops pending callbacks', () => {
  const ft = fakeTimers();
  const s = createScheduler(ft);
  let ran = 0;
  s.after(100, () => ran++);
  s.after(200, () => ran++);
  s.cancelAll();
  ft.advance(1000);
  assert.equal(ran, 0);
  assert.equal(ft.pending(), 0);
});

test('no burst after a hidden period', () => {
  const ft = fakeTimers();
  const s = createScheduler(ft);
  let count = 0;
  const tick = () => {
    count++;
    s.after(100, tick);
  };
  s.after(100, tick);
  ft.advance(300);
  const before = count;
  ft.jump(60000);
  ft.advance(1);
  assert.ok(count - before <= 2, `burst of ${count - before}`);
});

test('a cancelled scheduler ignores work queued afterwards', async () => {
  const ft = fakeTimers();
  const s = createScheduler(ft);
  s.cancelAll();
  let ran = false;
  let resolved = false;
  s.after(10, () => { ran = true; });
  s.sleep(10).then(() => { resolved = true; });
  ft.advance(100);
  await Promise.resolve();
  assert.equal(ran, false);
  assert.equal(resolved, false);
});

test('sleep resolves and is cancelled by cancelAll', async () => {
  const ft = fakeTimers();
  const s = createScheduler(ft);
  let done = false;
  s.sleep(50).then(() => { done = true; });
  ft.advance(50);
  await Promise.resolve();
  assert.equal(done, true);

  let late = false;
  s.sleep(50).then(() => { late = true; });
  s.cancelAll();
  ft.advance(100);
  await Promise.resolve();
  assert.equal(late, false);
});
