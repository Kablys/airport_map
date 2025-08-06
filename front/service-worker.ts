// Service Worker for Airport Map PWA
// This file is automatically bundled by Bun during the build process

/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Extend the ServiceWorkerGlobalScope to include the missing properties
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: string[];
  skipWaiting(): Promise<void>;
};

const CACHE_NAME = 'airport-map-cache-v2';
const OFFLINE_PAGE = '/offline.html';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  OFFLINE_PAGE,
  '/manifest.json',
  '/assets/styles.css',
  '/src/main.ts',
  '/src/api.ts',
  '/src/map.ts',
  '/src/ui.ts',
  '/src/pwa.ts',
  '../data/airports.json',
  '../data/routes.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  '/assets/icons/icon-72x72.svg',
  '/assets/icons/icon-96x96.svg',
  '/assets/icons/icon-128x128.svg',
  '/assets/icons/icon-144x144.svg',
  '/assets/icons/icon-152x152.svg',
  '/assets/icons/icon-192x192.svg',
  '/assets/icons/icon-384x384.svg',
  '/assets/icons/icon-512x512.svg',
];

/**
 * Install event - cache essential assets
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');

  // Skip waiting to activate the new service worker immediately
  void self.skipWaiting();

  // Pre-cache all essential assets
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell and content');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .catch((error) => {
        console.error('[Service Worker] Cache addAll error:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');

  // Remove previous cached data
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[Service Worker] Removing old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );

  // Take control of all clients immediately
  event.waitUntil(self.clients.claim());
});

/**
 * Fetch event - serve from cache, falling back to network
 */
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and chrome-extension URLs
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Handle API requests with network-first strategy
  if (event.request.url.includes('/api/')) {
    event.respondWith(networkFirstStrategy(event));
    return;
  }

  // For all other requests, use cache-first strategy
  event.respondWith(cacheFirstStrategy(event));
});

/**
 * Cache-first strategy: try cache, then network
 */
async function cacheFirstStrategy(event: FetchEvent): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(event.request);

  if (cachedResponse) {
    console.log(`[Service Worker] Serving from cache: ${event.request.url}`);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(event.request);

    // Only cache successful responses and non-opaque responses
    if (networkResponse.ok && networkResponse.type === 'basic') {
      const responseToCache = networkResponse.clone();
      cache.put(event.request, responseToCache).catch(console.error);
    }

    return networkResponse;
  } catch (error) {
    console.error(`[Service Worker] Network request failed: ${error}`);

    // If it's a navigation request, return the offline page
    if (event.request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_PAGE);
      if (offlinePage) {
        return offlinePage;
      }
      return new Response('You are offline and no offline page is available.', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    throw error;
  }
}

/**
 * Network-first strategy: try network, then cache
 */
async function networkFirstStrategy(event: FetchEvent): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(event.request);

    // Update the cache with the fresh response
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      cache.put(event.request, responseToCache).catch(console.error);
    }

    return networkResponse;
  } catch (error) {
    console.error(`[Service Worker] Network request failed, falling back to cache: ${error}`);
    const cachedResponse = await cache.match(event.request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // If no cache is available and it's a navigation request, return offline page
    if (event.request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_PAGE);
      if (offlinePage) {
        return offlinePage;
      }
    }

    // If all else fails, return a generic error response
    return new Response('Network error occurred and no cache is available.', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Add a message event listener for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});
