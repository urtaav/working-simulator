import { createRng } from './core/rng.js';
import { loadSettings, SCENES } from './core/settings.js';
import { PROJECTS, BRANCHES } from './content/vocab.js';
import { createIde } from './ui/ide.js';
import { createFakeCursor } from './ui/fakeCursor.js';
import { setTabIdentity } from './ui/tabIdentity.js';
import { createDirector } from './scenes/director.js';

const params = new URLSearchParams(location.search);
const settings = loadSettings();
const rng = createRng((Date.now() ^ (performance.now() * 1000)) >>> 0);
const project = settings.project ?? rng.pick(PROJECTS);
const branch = rng.pick(BRANCHES);
const speed = Math.max(1, Number(params.get('speed')) || 1);

const ide = createIde(document.getElementById('app'), { editor: settings.editor, project });
ide.setBranch(branch);

document.documentElement.classList.add('fake-pointer');
const cursor = createFakeCursor(document.body);

let lastFile = project;
const identity = (fileName) => {
  lastFile = fileName;
  setTabIdentity(ide.skin(), fileName, project);
};
identity(project);

const state = { ...settings };
const director = createDirector({
  ide,
  rng,
  cursor,
  project,
  branch,
  identity,
  speed,
  getRotation: () => state.rotateMinutes,
});

const requested = params.get('scene');
director.start(SCENES.includes(requested) ? requested : settings.scene);

// exposed for the dock (wired in dock.js)
export const app = { ide, director, state, identity: () => setTabIdentity(ide.skin(), lastFile, project) };
