export const SCENES = ['code', 'query', 'containers', 'console'];
export const EDITORS = ['vscode', 'intellij'];
export const ROTATE_OPTIONS = [0, 5, 10, 15, 30, 60];
export const DEFAULTS = Object.freeze({ editor: 'vscode', scene: 'code', rotateMinutes: 10, project: null });

const KEY = 'ws.prefs.v1';

export function validate(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    editor: EDITORS.includes(r.editor) ? r.editor : DEFAULTS.editor,
    scene: SCENES.includes(r.scene) ? r.scene : DEFAULTS.scene,
    rotateMinutes: ROTATE_OPTIONS.includes(r.rotateMinutes) ? r.rotateMinutes : DEFAULTS.rotateMinutes,
    project: typeof r.project === 'string' && r.project ? r.project : null,
  };
}

const defaultStorage = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

// Storage can be missing or blocked (private mode, site data disabled): never let that stop the page.
export function loadSettings(storage = defaultStorage()) {
  try {
    const raw = storage?.getItem(KEY);
    return validate(raw ? JSON.parse(raw) : null);
  } catch {
    return validate(null);
  }
}

export function saveSettings(settings, storage = defaultStorage()) {
  try {
    storage?.setItem(KEY, JSON.stringify(validate(settings)));
  } catch {
    // preferences just won't persist
  }
}
