/// <reference lib="dom" />
/**
 * Registers the service worker for PWA functionality
 */
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered with scope:', registration.scope);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  } else {
    console.warn('Service Workers are not supported in this browser');
  }
}

/**
 * Check if the app is being used in standalone mode (installed as PWA)
 *
 * @returns True if the app is in standalone mode
 */
export function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}
