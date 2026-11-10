import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWakeLock } from '../js/core/wakeLock.js';

function fakeDoc(state = 'visible') {
  const listeners = {};
  return {
    visibilityState: state,
    addEventListener: (type, fn) => ((listeners[type] ||= []).push(fn)),
    fire(type) {
      (listeners[type] || []).forEach((fn) => fn());
    },
  };
}

function fakeSentinel() {
  const listeners = {};
  return {
    released: false,
    addEventListener: (type, fn) => ((listeners[type] ||= []).push(fn)),
    release() {
      this.released = true;
      (listeners.release || []).forEach((fn) => fn());
    },
  };
}

test('unsupported browser resolves false without throwing', async () => {
  const wl = createWakeLock({}, fakeDoc());
  assert.equal(await wl.request(), false);
  assert.equal(wl.isActive(), false);
});

test('rejected request resolves false', async () => {
  const nav = { wakeLock: { request: () => Promise.reject(new Error('NotAllowedError')) } };
  const wl = createWakeLock(nav, fakeDoc());
  assert.equal(await wl.request(), false);
});

test('granted request is active and notifies', async () => {
  const sentinel = fakeSentinel();
  const nav = { wakeLock: { request: async () => sentinel } };
  const wl = createWakeLock(nav, fakeDoc());
  const seen = [];
  wl.onChange((a) => seen.push(a));
  assert.equal(await wl.request(), true);
  assert.equal(wl.isActive(), true);
  sentinel.release();
  assert.equal(wl.isActive(), false);
  assert.deepEqual(seen, [true, false]);
});

test('re-requests when the page becomes visible again', async () => {
  let calls = 0;
  let last;
  const nav = { wakeLock: { request: async () => (calls++, (last = fakeSentinel())) } };
  const doc = fakeDoc();
  const wl = createWakeLock(nav, doc);
  await wl.request();
  // browsers release the lock when the tab is hidden
  doc.visibilityState = 'hidden';
  last.release();
  doc.fire('visibilitychange');
  assert.equal(calls, 1);
  doc.visibilityState = 'visible';
  doc.fire('visibilitychange');
  await new Promise((r) => setImmediate(r));
  assert.equal(calls, 2);
});
