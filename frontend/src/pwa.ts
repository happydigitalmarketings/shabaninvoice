/**
 * Progressive Web App (PWA) utilities:
 * - Service worker registration
 * - Install prompt management (beforeinstallprompt)
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(canInstall: boolean) => void>();

export function isRunningStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error Safari standalone property
    window.navigator.standalone === true
  );
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('✅ PWA Service Worker registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('⚠️ PWA Service Worker registration failed:', err);
      });
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar on mobile Chrome
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installListeners.forEach((fn) => fn(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installListeners.forEach((fn) => fn(false));
    console.log('🎉 PWA installed successfully!');
  });
}

export function subscribeInstallState(callback: (canInstall: boolean) => void): () => void {
  installListeners.add(callback);
  callback(Boolean(deferredPrompt) && !isRunningStandalone());
  return () => installListeners.delete(callback);
}

export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installListeners.forEach((fn) => fn(false));
  return choice.outcome === 'accepted';
}
