// One scheduler per running scene: cancelAll() stops everything that scene queued.
// Work is chained (each step schedules the next), so a hidden tab that comes back
// runs one late step and continues from "now" instead of replaying the backlog.
export function createScheduler(timers = {}) {
  const set = timers.setTimeout ?? globalThis.setTimeout.bind(globalThis);
  const clear = timers.clearTimeout ?? globalThis.clearTimeout.bind(globalThis);
  const ids = new Set();
  // once cancelled, the scheduler stays dead: a scene that wakes up from a pointer
  // move (not driven by this scheduler) must not be able to queue more work
  let cancelled = false;

  function after(ms, fn) {
    if (cancelled) return null;
    const id = set(() => {
      ids.delete(id);
      fn();
    }, Math.max(0, ms));
    ids.add(id);
    return id;
  }

  function cancelAll() {
    cancelled = true;
    for (const id of ids) clear(id);
    ids.clear();
  }

  // a cancelled sleep never resolves, so an awaiting scene loop simply stops
  const sleep = (ms) => new Promise((resolve) => after(ms, resolve));

  return { after, cancelAll, sleep };
}
