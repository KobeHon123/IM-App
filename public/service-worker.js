/* Service Worker for PWA offline support and caching */
const CACHE_VERSION = 'im-app-v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Files to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - pre-cache essential files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[Service Worker] Pre-caching files');
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[Service Worker] Pre-cache failed:', err);
        // Continue even if pre-cache fails
      });
    }).then(() => {
      self.skipWaiting(); // Activate immediately
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'CONTROLLER_CHANGED',
          });
        });
      });
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Skip non-GET requests - can't cache these
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  // Skip requests to chrome extensions or other origins
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the response for future visits
          const responseCopy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put('/index.html', responseCopy);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cached index.html
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Handle image and asset requests
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|avif|mp4|woff2?|ttf)$/i.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the image/asset response
          const responseCopy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseCopy);
          });
          return response;
        })
        .catch(() => {
          // Return cached image/asset if available
          return caches.match(request);
        })
    );
    return;
  }

  // Handle all other requests
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache the response
        const responseCopy = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseCopy);
        });
        return response;
      })
      .catch(() => {
        // Return cached response or fallback to index.html
        return caches.match(request).then((cached) => cached || caches.match('/index.html'));
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLIENTS_CLAIM') {
    self.clients.claim();
  }
});
