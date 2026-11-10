import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/core/rng.js';
import { planPath, nextIdleTarget } from '../js/core/cursorPath.js';

const A = { x: 100, y: 500 };
const B = { x: 700, y: 500 };

test('starts at origin and ends exactly at target', () => {
  for (let s = 1; s <= 10; s++) {
    const { points } = planPath(A, B, createRng(s));
    assert.deepEqual({ x: points[0].x, y: points[0].y }, A);
    const last = points.at(-1);
    assert.deepEqual({ x: last.x, y: last.y }, B);
  }
});

test('is not a straight line', () => {
  for (let s = 1; s <= 10; s++) {
    const { points } = planPath(A, B, createRng(s));
    const maxDev = Math.max(...points.map((p) => Math.abs(p.y - 500)));
    assert.ok(maxDev >= 8, `seed ${s} deviation ${maxDev}`);
  }
});

test('human duration', () => {
  for (let s = 1; s <= 20; s++) {
    const long = planPath(A, B, createRng(s)).points.at(-1).t;
    assert.ok(long >= 350 && long <= 1400, `600px took ${long}`);
    const short = planPath(A, { x: 150, y: 500 }, createRng(s)).points.at(-1).t;
    assert.ok(short >= 120, `50px took ${short}`);
  }
});

test('eases in and out', () => {
  const { points } = planPath(A, B, createRng(2));
  const speed = (i) => Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y) / (points[i + 1].t - points[i].t);
  const n = points.length - 1;
  const avg = (from, to) => {
    let s = 0;
    for (let i = from; i < to; i++) s += speed(i);
    return s / (to - from);
  };
  const mid = avg(Math.floor(n / 3), Math.floor((2 * n) / 3));
  assert.ok(mid > avg(0, Math.max(1, Math.floor(n / 10))));
  assert.ok(mid > avg(n - Math.max(1, Math.floor(n / 10)), n));
});

test('t is strictly increasing', () => {
  const { points } = planPath(A, B, createRng(5));
  for (let i = 1; i < points.length; i++) assert.ok(points[i].t > points[i - 1].t);
});

test('idle targets stay in bounds and favor the center', () => {
  const rng = createRng(1);
  const bounds = { w: 1920, h: 1080 };
  let central = 0;
  for (let i = 0; i < 500; i++) {
    const p = nextIdleTarget(bounds, rng);
    assert.ok(p.x >= 0 && p.x <= 1920 && p.y >= 0 && p.y <= 1080);
    if (p.x >= 288 && p.x <= 1632 && p.y >= 162 && p.y <= 918) central++;
  }
  assert.ok(central / 500 >= 0.6, `central ratio ${central / 500}`);
});
