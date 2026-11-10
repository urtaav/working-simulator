import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, SCENES, ROTATE_OPTIONS, validate, loadSettings, saveSettings } from '../js/core/settings.js';

function memoryStorage() {
  const data = {};
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
}

test('constants', () => {
  assert.deepEqual(DEFAULTS, { editor: 'vscode', scene: 'code', rotateMinutes: 10, project: null });
  assert.deepEqual(SCENES, ['code', 'query', 'containers', 'console']);
  assert.deepEqual(ROTATE_OPTIONS, [0, 5, 10, 15, 30, 60]);
});

test('garbage falls back to defaults', () => {
  assert.deepEqual(validate({ editor: 'emacs', rotateMinutes: 'abc', scene: 7 }), DEFAULTS);
  assert.deepEqual(validate(null), DEFAULTS);
  assert.deepEqual(validate('nope'), DEFAULTS);
});

test('zero rotation allowed, other invalid values fall back', () => {
  assert.equal(validate({ rotateMinutes: 0 }).rotateMinutes, 0);
  assert.equal(validate({ rotateMinutes: -5 }).rotateMinutes, 10);
  assert.equal(validate({ rotateMinutes: 7 }).rotateMinutes, 10);
  assert.equal(validate({ rotateMinutes: 30 }).rotateMinutes, 30);
});

test('valid values are kept', () => {
  const s = validate({ editor: 'intellij', scene: 'query', rotateMinutes: 5, project: 'app-core' });
  assert.deepEqual(s, { editor: 'intellij', scene: 'query', rotateMinutes: 5, project: 'app-core' });
});

test('throwing storage does not break', () => {
  const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.deepEqual(loadSettings(bad), DEFAULTS);
  assert.doesNotThrow(() => saveSettings(DEFAULTS, bad));
});

test('null storage and corrupt json', () => {
  assert.deepEqual(loadSettings(null), DEFAULTS);
  const st = memoryStorage();
  st.setItem('ws.prefs.v1', '{not json');
  assert.deepEqual(loadSettings(st), DEFAULTS);
});

test('round trip through storage', () => {
  const st = memoryStorage();
  saveSettings({ editor: 'intellij', scene: 'console', rotateMinutes: 15, project: 'shared-lib' }, st);
  assert.deepEqual(loadSettings(st), { editor: 'intellij', scene: 'console', rotateMinutes: 15, project: 'shared-lib' });
});
