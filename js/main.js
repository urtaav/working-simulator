import { createRng } from './core/rng.js';
import { loadSettings, saveSettings, SCENES } from './core/settings.js';
import { createWakeLock } from './core/wakeLock.js';
import { planDockChange } from './core/dockActions.js';
import { PROJECTS, BRANCHES } from './content/vocab.js';
import { createIde } from './ui/ide.js';
import { createFakeCursor } from './ui/fakeCursor.js';
import { setTabIdentity } from './ui/tabIdentity.js';
import { createDock } from './ui/dock.js';
import { createDirector } from './scenes/director.js';

const params = new URLSearchParams(location.search);
const state = loadSettings();
const rng = createRng((Date.now() ^ (performance.now() * 1000)) >>> 0);
const project = state.project ?? rng.pick(PROJECTS);
const branch = rng.pick(BRANCHES);
const speed = Math.max(1, Number(params.get('speed')) || 1); // dev aid only

const ide = createIde(document.getElementById('app'), { editor: state.editor, project });
ide.setBranch(branch);

document.documentElement.classList.add('fake-pointer');
const cursor = createFakeCursor(document.body);

let lastFile = project;
const identity = (fileName) => {
  lastFile = fileName;
  setTabIdentity(ide.skin(), fileName, project);
};
identity(project);

const wakeLock = createWakeLock();
wakeLock.request();

let dock = null;
const director = createDirector({
  ide,
  rng,
  cursor,
  project,
  branch,
  identity,
  speed,
  getRotation: () => state.rotateMinutes,
  onSceneChange: (scene) => {
    // keep the dock's view of "current scene" in sync after a rotation
    state.scene = scene;
    dock?.setScene(scene);
  },
});

dock = createDock(document.getElementById('dock-root'), {
  settings: state,
  wakeLock,
  onChange(next) {
    const plan = planDockChange(state, next, director.current());
    Object.assign(state, next);
    saveSettings(state);
    if (plan.skin) {
      ide.setSkin(plan.skin);
      setTabIdentity(plan.skin, lastFile, project);
    }
    if (plan.startScene) director.start(plan.startScene);
    else if (plan.reschedule) director.setRotation();
  },
});

const requested = params.get('scene');
director.start(SCENES.includes(requested) ? requested : state.scene);
