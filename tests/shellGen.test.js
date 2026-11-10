import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/core/rng.js';
import { dockerPs, dockerStats, springLogLine, consoleSession } from '../js/content/shellGen.js';
import { forbiddenHits } from './helpers.js';

const LOG_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}\s+(INFO|DEBUG|WARN)\s+\d+ --- \[/;

test('spring log line format', () => {
  const rng = createRng(1);
  for (let i = 0; i < 200; i++) {
    const line = springLogLine(rng, new Date(2026, 10, 10, 9, 30, i % 60, 123));
    assert.match(line, LOG_RE);
  }
});

test('docker ps and stats look like tables', () => {
  for (let s = 1; s <= 20; s++) {
    const ps = dockerPs(createRng(s));
    assert.match(ps[0], /^CONTAINER ID\s+IMAGE/);
    assert.ok(ps.length >= 3);
    const stats = dockerStats(createRng(s));
    assert.match(stats[0], /^CONTAINER ID\s+NAME\s+CPU %/);
    assert.equal(stats.length, ps.length);
  }
});

test('console sessions are non-empty and mvn succeeds', () => {
  let sawMvn = false;
  for (let s = 1; s <= 40; s++) {
    const session = consoleSession(createRng(s));
    assert.ok(session.length >= 3);
    for (const step of session) {
      assert.ok(step.cmd.trim().length > 0);
      assert.ok(step.output.length >= 1, step.cmd);
      if (step.cmd.includes('mvnw')) {
        sawMvn = true;
        assert.ok(step.output.some((l) => l.includes('BUILD SUCCESS')));
      }
    }
  }
  assert.ok(sawMvn);
});

test('no business-domain words', () => {
  for (let s = 1; s <= 100; s++) {
    const rng = createRng(s);
    const text = [
      ...dockerPs(rng),
      ...dockerStats(rng),
      springLogLine(rng, new Date()),
      ...consoleSession(rng).flatMap((x) => [x.cmd, ...x.output]),
    ].join('\n');
    assert.deepEqual(forbiddenHits(text), []);
  }
});
