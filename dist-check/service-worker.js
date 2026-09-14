/* Service Worker for PWA offline support and caching */
const CACHE_NAME = 'im-app-v1';
const RUNTIME_CACHE = 'im-app-runtime-v1';

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
    caches.open(CACHE_NAME).then((cache) => {
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
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
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
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests - can't cache these
  if (request.method !== 'GET') {
    return;
  }

  // Skip requests to chrome extensions or other origins
  if (url.origin !== location.origin) {
    return;
  }

  // Skip caching for images/assets - always get fresh
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico)$/i)) {
    event.respondWith(
      fetch(request).catch(() => {
        // If network fails, return cached version if available
        return caches.match(request);
      })
    );
    return;
  }

  // Handle API requests differently - network first
  if (url.pathname.includes('/api/') || url.origin.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response BEFORE using it
          const responseToCache = response.clone();
          
          // Cache successful API responses
          if (response.ok) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then((c) => {
              try {
                c.put(request, responseToCache);
              } catch (e) {
                console.warn('[Service Worker] Failed to cache:', e);
              }
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(request).then((response) => {
            if (response) {
              console.log('[Service Worker] Serving from cache:', request.url);
              return response;
            }
            throw new Error('Network request failed and no cache available');
          });
        })
    );
    return;
  }

  // For all other requests - cache first, fallback to network
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        console.log('[Service Worker] Serving from cache:', request.url);
        return response;
      }

      return fetch(request).then((response) => {
        // Clone the response BEFORE using it
        const responseToCache = response.clone();
        
        // Cache successful responses
        if (response.ok) {
          const cache = caches.open(RUNTIME_CACHE);
          cache.then((c) => {
            try {
              c.put(request, responseToCache);
            } catch (e) {
              console.warn('[Service Worker] Failed to cache:', e);
            }
          });
        }
        return response;
      });
    }).catch(() => {
      console.warn('[Service Worker] Fetch failed:', request.url);
      // Return a placeholder response if needed
      return new Response('Service Unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
      });
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
