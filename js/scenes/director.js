import { nextScene, rotationDelayMs } from '../core/rotation.js';
import { createScheduler } from '../core/scheduler.js';
import { SCENES } from '../core/settings.js';
import { codeScene } from './codeScene.js';
import { queryScene } from './queryScene.js';
import { containerScene } from './containerScene.js';
import { consoleScene } from './consoleScene.js';

const RUNNERS = { code: codeScene, query: queryScene, containers: containerScene, console: consoleScene };

// `speed` > 1 is a dev aid (?speed=10) to watch hours of behavior in minutes.
export function createDirector({ ide, rng, cursor, project, branch, identity, getRotation, speed = 1, onSceneChange }) {
  let current = null;
  let scheduler = null;
  let rotateTimer = null;

  const makeScheduler = () =>
    createScheduler({
      setTimeout: (fn, ms) => setTimeout(fn, ms / speed),
      clearTimeout: (id) => clearTimeout(id),
    });

  function scheduleRotation() {
    clearTimeout(rotateTimer);
    const delay = rotationDelayMs(getRotation(), rng);
    if (delay != null) rotateTimer = setTimeout(() => start(nextScene(current, rng)), delay / speed);
  }

  function start(scene) {
    const next = SCENES.includes(scene) ? scene : 'code';
    scheduler?.cancelAll();
    scheduler = makeScheduler();
    current = next;
    const ctx = {
      ide,
      rng,
      cursor,
      project,
      scheduler,
      identity,
      prompt: () => `~/projects/${project} (${branch}) $ `,
    };
    RUNNERS[next](ctx).catch((err) => console.error(err));
    scheduleRotation();
    onSceneChange?.(next);
  }

  return {
    start,
    setRotation: () => scheduleRotation(),
    current: () => current,
  };
}
