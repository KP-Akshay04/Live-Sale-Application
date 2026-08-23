const CACHE_NAME = 'livesale-erp-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-svg.svg',
];

/**
 * Install
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests.
  if (request.method !== 'GET') {
    return;
  }

  // Never intercept API requests.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Never interfere with Vite development tooling.
  if (
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('hot-update')
  ) {
    return;
  }

  /**
   * SPA navigation:
   * Network first.
   * If offline, use cached index.html.
   */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached =
          (await caches.match('/index.html')) ||
          (await caches.match('/'));

        return (
          cached ||
          new Response('Application unavailable offline.', {
            status: 503,
            headers: {
              'Content-Type': 'text/plain',
            },
          })
        );
      })
    );

    return;
  }

  /**
   * Static assets:
   * Cache first, then network.
   */
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.ok &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }

          return networkResponse;
        })
        .catch(() => {
          return new Response('', {
            status: 503,
            statusText: 'Offline',
          });
        });
    })
  );
});