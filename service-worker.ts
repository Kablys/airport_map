/// <reference lib="webworker" />

const CACHE_NAME = 'airport-map-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './assets/styles.css',
  './src/main.ts',
  './src/api.ts',
  './src/map.ts',
  './src/ui.ts',
  './src/pwa.ts',
  './data/airports.json',
  './data/routes.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  './assets/icons/icon-72x72.svg',
  './assets/icons/icon-96x96.svg',
  './assets/icons/icon-128x128.svg',
  './assets/icons/icon-144x144.svg',
  './assets/icons/icon-152x152.svg',
  './assets/icons/icon-192x192.svg',
  './assets/icons/icon-384x384.svg',
  './assets/icons/icon-512x512.svg'
];

/**
 * Install event - cache assets
 */
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS_TO_CACHE);
      await self.skipWaiting();
    })()
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

/**
 * Fetch event - serve from cache or network
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Try to get the response from the cache
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, try to fetch it
      try {
        const fetchResponse = await fetch(event.request);

        // Don't cache non-GET requests or if response is not ok
        if (event.request.method !== 'GET' || !fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
          return fetchResponse;
        }

        // Clone the response as it can only be consumed once
        const responseToCache = fetchResponse.clone();
        await cache.put(event.request, responseToCache);

        return fetchResponse;
      } catch (error) {
        // If it's a navigation request and we're offline, show the offline page
        const url = new URL(event.request.url);
        if (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html'))) {
          return cache.match('./offline.html');
        }

        return new Response('Network error happened', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});