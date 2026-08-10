const CACHE_NAME = 'livesale-erp-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-svg.svg',
  '/assets/.aistudio/logo.png' // optional workspace icon
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate Event (Cleanup Old Caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event with Stale-While-Revalidate & SPA Navigation Fallback
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Exclude Dev Hot-Module-Replacement, live reload sockets, and mock API routes from cache
  if (
    requestUrl.pathname.startsWith('/@vite') ||
    requestUrl.pathname.startsWith('/node_modules') ||
    requestUrl.pathname.startsWith('/api') ||
    event.request.url.includes('ws://') ||
    event.request.url.includes('hot-update')
  ) {
    return;
  }

  // SPA Page Navigation Fallback (Redirect all layout requests to cached index.html)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Handle standard static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update for next time
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {
          // Silent catch for background fetch failure in offline mode
        });
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallbacks for asset requests if offline
        if (event.request.url.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
          return caches.match('/icon-svg.svg');
        }
      });
    })
  );
});
