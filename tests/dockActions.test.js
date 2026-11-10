import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planDockChange } from '../js/core/dockActions.js';

// main.js syncs state.scene on every rotation, so `prev.scene` is always the running scene
const at = (scene) => ({ editor: 'vscode', scene, rotateMinutes: 10, project: null });

test('choosing the saved scene after a rotation restarts it', () => {
  // saved scene was code, rotation moved to query (state synced), user picks code again
  const plan = planDockChange(at('query'), { ...at('query'), scene: 'code' }, 'query');
  assert.equal(plan.startScene, 'code');
});

test('picking the scene already running does nothing', () => {
  assert.equal(planDockChange(at('query'), at('query'), 'query').startScene, null);
});

test('editor change switches skin and restarts the running scene', () => {
  const plan = planDockChange(at('containers'), { ...at('containers'), editor: 'intellij' }, 'containers');
  assert.equal(plan.skin, 'intellij');
  assert.equal(plan.startScene, 'containers');
});

test('rotation change after a rotation keeps the running scene', () => {
  const plan = planDockChange(at('query'), { ...at('query'), rotateMinutes: 30 }, 'query');
  assert.equal(plan.startScene, null);
  assert.equal(plan.reschedule, true);
});

test('rotation change only reschedules', () => {
  assert.deepEqual(planDockChange(at('code'), { ...at('code'), rotateMinutes: 30 }, 'code'), { skin: null, startScene: null, reschedule: true });
});
