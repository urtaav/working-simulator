// One scheduler per running scene: cancelAll() stops everything that scene queued.
// Work is chained (each step schedules the next), so a hidden tab that comes back
// runs one late step and continues from "now" instead of replaying the backlog.
export function createScheduler(timers = {}) {
  const set = timers.setTimeout ?? globalThis.setTimeout.bind(globalThis);
  const clear = timers.clearTimeout ?? globalThis.clearTimeout.bind(globalThis);
  const ids = new Set();

  function after(ms, fn) {
    const id = set(() => {
      ids.delete(id);
      fn();
    }, Math.max(0, ms));
    ids.add(id);
    return id;
  }

  function cancelAll() {
    for (const id of ids) clear(id);
    ids.clear();
  }

  // a cancelled sleep never resolves, so an awaiting scene loop simply stops
  const sleep = (ms) => new Promise((resolve) => after(ms, resolve));

  return { after, cancelAll, sleep };
}
