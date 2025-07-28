const CACHE_NAME = 'airport-map-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './assets/styles.css',
  './src/main.js',
  './src/api.js',
  './src/map.js',
  './src/ui.js',
  './src/pwa.js',
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

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS_TO_CACHE);
      await self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
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

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.startsWith('https://unpkg.com/leaflet')) {
    return;
  }
  
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
        const networkResponse = await fetch(event.request);
        
        // Cache the response for future
        if (event.request.method === 'GET' && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // If fetch fails (e.g., offline), return a fallback
        console.error('Fetch failed:', error);
        
        // For navigation requests, return the offline page
        if (event.request.mode === 'navigate') {
          return cache.match('./offline.html');
        }
        
        // Otherwise, just return the error
        throw error;
      }
    })()
  );
});