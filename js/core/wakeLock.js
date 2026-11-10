// Keeps the screen from sleeping while the page is visible. The browser drops the lock
// whenever the tab is hidden, so we ask again when it comes back.
export function createWakeLock(nav = globalThis.navigator, doc = globalThis.document) {
  let sentinel = null;
  const listeners = [];
  const emit = () => listeners.forEach((fn) => fn(sentinel !== null));

  async function request() {
    if (!nav?.wakeLock?.request) return false;
    try {
      sentinel = await nav.wakeLock.request('screen');
      sentinel.addEventListener?.('release', () => {
        sentinel = null;
        emit();
      });
      emit();
      return true;
    } catch {
      sentinel = null;
      emit();
      return false;
    }
  }

  doc?.addEventListener?.('visibilitychange', () => {
    if (doc.visibilityState === 'visible' && !sentinel) request();
  });

  return {
    request,
    isActive: () => sentinel !== null,
    onChange: (fn) => listeners.push(fn),
  };
}
