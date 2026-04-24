/**
 * Register the service worker on app boot.
 * Also exposes a small helper to listen for the "install" prompt.
 */

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return; // Skip in dev to avoid stale caches

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('SW registration failed:', err));
  });
}

// --- Install prompt handling ---
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners: Set<(canInstall: boolean) => void> = new Set();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
  listeners.forEach((cb) => cb(true));
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  listeners.forEach((cb) => cb(false));
});

export function onInstallAvailability(cb: (canInstall: boolean) => void): () => void {
  listeners.add(cb);
  cb(deferredPrompt !== null);
  return () => listeners.delete(cb);
}

export async function triggerInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  listeners.forEach((cb) => cb(false));
  return choice.outcome === 'accepted';
}
