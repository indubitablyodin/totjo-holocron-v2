import { registerSW } from 'virtual:pwa-register';

import { notifyPwaUpdateAvailable, setPwaUpdater } from '@/app/pwaUpdate';

let hasRegistered = false;

export function registerAppServiceWorker() {
  if (hasRegistered) {
    return;
  }

  hasRegistered = true;

  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      notifyPwaUpdateAvailable();
    },
  });

  setPwaUpdater(updateServiceWorker);
}
