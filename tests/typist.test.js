import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/core/rng.js';
import { planTyping } from '../js/core/typist.js';

const JAVA = `package com.example.common.util;

public final class StringUtils {

    private StringUtils() {
    }

    public static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    public static String truncate(String value, int max) {
        if (value == null || value.length() <= max) {
            return value;
        }
        return value.substring(0, max) + "...";
    }
}
`;

function replay(actions) {
  const buf = [];
  for (const a of actions) {
    if (a.kind === 'char') buf.push(a.ch);
    else if (a.kind === 'backspace') buf.pop();
  }
  return buf.join('');
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const stdev = (xs) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

test('replaying actions reproduces the text', () => {
  for (let seed = 1; seed <= 20; seed++) {
    assert.equal(replay(planTyping(JAVA, createRng(seed))), JAVA);
  }
});

test('delays are irregular', () => {
  const delays = planTyping(JAVA, createRng(3))
    .filter((a) => a.kind === 'char')
    .map((a) => a.delay);
  assert.ok(new Set(delays).size >= 15);
  assert.ok(stdev(delays) > 20, `stdev ${stdev(delays)}`);
});

test('pauses after line breaks and braces', () => {
  const actions = planTyping(JAVA, createRng(4), { typoRate: 0 });
  const chars = actions.filter((a) => a.kind !== 'backspace');
  const after = [];
  const all = [];
  for (let i = 1; i < actions.length; i++) {
    const prev = actions[i - 1];
    const extra = actions[i].kind === 'pause' ? actions[i].delay + (actions[i + 1]?.delay ?? 0) : actions[i].delay;
    if (prev.kind === 'char' && (prev.ch === '\n' || prev.ch === '{')) after.push(extra);
  }
  for (const a of chars) if (a.kind === 'char') all.push(a.delay);
  assert.ok(mean(after) >= 2 * mean(all), `after ${mean(after)} vs mean ${mean(all)}`);
});

test('typos happen and are fixed', () => {
  const text = 'const value = computeSomething(input);\n'.repeat(26);
  const actions = planTyping(text, createRng(8), { typoRate: 0.05 });
  assert.ok(actions.some((a) => a.kind === 'backspace'));
  assert.equal(replay(actions), text);
});

test('leading indentation is typed fast', () => {
  const actions = planTyping(JAVA, createRng(6), { typoRate: 0 }).filter((a) => a.kind === 'char');
  let atLineStart = true;
  for (const a of actions) {
    if (atLineStart && a.ch === ' ') assert.ok(a.delay <= 40, `indent delay ${a.delay}`);
    if (a.ch === '\n') atLineStart = true;
    else if (a.ch !== ' ') atLineStart = false;
  }
});

test('default speed is human (~55 wpm)', () => {
  const text = 'abcdefghij'.repeat(30);
  const total = planTyping(text, createRng(11)).reduce((s, a) => s + a.delay, 0);
  assert.ok(total >= 45000 && total <= 150000, `total ${total}`);
});
