// Keep update activation separate from page reloads. Another tab may activate
// a worker while this tab is editing; only an explicit action may reload it.
export function watchPwaUpdates(
  container: ServiceWorkerContainer,
  onAvailable: () => void,
  reload: () => void,
  onError: (error: unknown) => void,
  swUrl = '/sw.js',
) {
  let disposed = false;
  let requested = false;
  let reloaded = false;
  const cleanups: (() => void)[] = [];
  const reloadOnce = () => {
    if (!disposed && requested && !reloaded) {
      reloaded = true;
      reload();
    }
  };
  const onControllerChange = () => {
    if (disposed) return;
    if (requested) reloadOnce();
    else onAvailable();
  };
  container.addEventListener('controllerchange', onControllerChange);
  cleanups.push(() => container.removeEventListener('controllerchange', onControllerChange));

  const registration = container.register(swUrl).then((reg) => {
    if (disposed) return reg;
    const watchInstalling = () => {
      const worker = reg.installing;
      if (!worker) return;
      const onStateChange = () => {
        if (!disposed && worker.state === 'installed' && reg.waiting) onAvailable();
      };
      worker.addEventListener('statechange', onStateChange);
      cleanups.push(() => worker.removeEventListener('statechange', onStateChange));
      onStateChange();
    };
    reg.addEventListener('updatefound', watchInstalling);
    cleanups.push(() => reg.removeEventListener('updatefound', watchInstalling));
    watchInstalling();
    if (reg.waiting) onAvailable();
    return reg;
  });
  // Registration failures must not interfere with editing or create an
  // unhandled rejection when the device is offline.
  void registration.catch((error) => { if (!disposed) onError(error); });

  return {
    async check() {
      try {
        const reg = await registration;
        if (!disposed) await reg.update();
      } catch (error) {
        if (!disposed) onError(error);
      }
    },
    async apply() {
      const reg = await registration;
      if (disposed) return;
      requested = true;
      const worker = reg.waiting;
      if (!worker) {
        reloadOnce();
        return;
      }
      const onStateChange = () => {
        if (worker.state === 'activated') reloadOnce();
      };
      worker.addEventListener('statechange', onStateChange);
      cleanups.push(() => worker.removeEventListener('statechange', onStateChange));
      worker.postMessage({ type: 'SKIP_WAITING' });
    },
    dispose() {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
    },
  };
}
