import { SCENES, ROTATE_OPTIONS } from '../core/settings.js';

const SCENE_LABEL = { code: 'Escribiendo código', query: 'Consultas', containers: 'Contenedores', console: 'Consola' };
const EDITOR_LABEL = { vscode: 'VS Code', intellij: 'IntelliJ' };
const EDGE_PX = 24;
const HIDE_AFTER_MS = 2500;

// Hidden controls. Only shows up when the real mouse touches the bottom edge or with Ctrl+Shift+.
export function createDock(root, { settings, onChange, wakeLock }) {
  const dock = document.createElement('div');
  dock.className = 'dock';
  dock.setAttribute('role', 'toolbar');

  const select = (label, options, value, key, parse = (v) => v) => {
    const wrap = document.createElement('label');
    wrap.className = 'dock-field';
    wrap.append(label);
    const sel = document.createElement('select');
    for (const [v, text] of options) sel.appendChild(new Option(text, String(v), false, String(v) === String(value)));
    sel.addEventListener('change', () => onChange({ ...settings, [key]: parse(sel.value) }));
    wrap.appendChild(sel);
    dock.appendChild(wrap);
    return sel;
  };

  select('Editor', Object.entries(EDITOR_LABEL), settings.editor, 'editor');
  const sceneSel = select('Escena', SCENES.map((s) => [s, SCENE_LABEL[s]]), settings.scene, 'scene');
  select('Cambiar escena cada', ROTATE_OPTIONS.map((m) => [m, m === 0 ? 'No rotar' : `${m} min`]), settings.rotateMinutes, 'rotateMinutes', Number);

  const fs = document.createElement('button');
  fs.type = 'button';
  fs.className = 'dock-btn';
  const syncFs = () => (fs.textContent = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa');
  fs.addEventListener('click', () => {
    const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    p?.catch?.(() => {});
  });
  document.addEventListener('fullscreenchange', syncFs);
  syncFs();
  dock.appendChild(fs);

  const status = document.createElement('span');
  status.className = 'dock-status';
  const syncStatus = (active) => {
    status.textContent = active ? 'Pantalla protegida' : 'Pantalla puede apagarse';
    status.classList.toggle('is-warn', !active);
  };
  wakeLock.onChange(syncStatus);
  syncStatus(wakeLock.isActive());
  dock.appendChild(status);

  root.appendChild(dock);

  let open = false;
  let pinned = false;
  let hideTimer = null;

  function setOpen(next) {
    open = next;
    dock.classList.toggle('is-open', open);
    // while the dock is open the real pointer is needed to click
    document.documentElement.classList.toggle('fake-pointer', !open);
    document.documentElement.classList.toggle('dock-open', open);
    if (!open) document.activeElement?.blur?.();
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => !pinned && !dock.matches(':hover') && !dock.contains(document.activeElement) && setOpen(false), HIDE_AFTER_MS);
  }

  document.addEventListener('mousemove', (e) => {
    if (e.clientY >= window.innerHeight - EDGE_PX) setOpen(true);
    if (open) scheduleHide();
  });
  dock.addEventListener('change', scheduleHide);
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'Period') {
      e.preventDefault();
      pinned = !open;
      setOpen(!open);
      if (!pinned) clearTimeout(hideTimer);
    }
  });

  return {
    setScene(scene) {
      sceneSel.value = scene;
    },
  };
}
