import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/core/rng.js';
import { createDirector } from '../js/scenes/director.js';

// Fake IDE: any method call is accepted; we only record the ones we care about.
function fakeIde(calls) {
  const sink = (path) =>
    new Proxy(() => {}, {
      get: (_, key) => sink(`${path}.${String(key)}`),
      apply: (_, __, args) => {
        calls.push(path);
        if (path.endsWith('.skin')) return 'vscode';
        if (path.endsWith('.bounds')) return { width: 1000, height: 600 };
        return undefined;
      },
    });
  return sink('ide');
}

test('starting a scene closes any half-typed terminal prompt and editor typing state', () => {
  const calls = [];
  const director = createDirector({
    ide: fakeIde(calls),
    rng: createRng(1),
    cursor: { moveTo: async () => {}, idleDrift: async () => {} },
    project: 'app-core',
    branch: 'main',
    identity: () => {},
    getRotation: () => 0,
  });
  director.start('code');
  director.stop();
  assert.ok(calls.includes('ide.panel.endPrompt'), 'panel.endPrompt not called');
  assert.ok(calls.includes('ide.editor.setTyping'), 'editor.setTyping not called');
});
