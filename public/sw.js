const CACHE_NAME = 'diamond-link-v9';
// Precached at install: the JS/CSS chunks the chat shell needs to boot offline.
const SHELL_CACHE = 'diamond-link-shell-v1';
// Only files whose URL carries a long content hash are immutable (safe to
// cache-first). In dev, Next keeps STABLE names like `chat/page.js`, so those
// must always hit the network or the browser would run frozen old code.
const HAS_SUCCESS_BY_NAME = /[A-Za-z0-9_-]{16,}\.(?:js|css|woff2?|png|jpg|jpeg|webp|avif|gif|svg|ico)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Precache the app shell from the build-time manifest so the chat page
      // can boot offline after installation (even before a normal visit has
      // warmed the runtime caches).
      try {
        const res = await fetch('sw-precache.json');
        const urls = await res.json();
        if (Array.isArray(urls) && urls.length) {
          const cache = await caches.open(SHELL_CACHE);
          await Promise.all(
            urls.map((u) =>
              fetch(u, { cache: 'reload' })
                .then((r) => (r.ok ? cache.put(u, r) : null))
                .catch(() => null)
            )
          );
        }
      } catch (err) {
        console.warn('Shell precache failed:', err);
      }
      self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((name) => name !== CACHE_NAME && name !== SHELL_CACHE).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigation (HTML) requests: network-first so users always get the
  // latest deployment. Fall back to cache only when offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(
            (cached) =>
              cached ||
              caches.match('/').then((root) => root || caches.match('/dashboard')),
          ),
        ),
    );
    return;
  }

  // Hashed build assets: cache-first. These files are content-hashed and
  // immutable, so serving stale copies is safe and fast. Un-hashed paths
  // (dev bundles, route page chunks) fall through to the network-first
  // handling below so changes always reach the client.
  if (url.pathname.startsWith('/_next/static/') && HAS_SUCCESS_BY_NAME.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Other same-origin assets (manifest, icons, etc.): stale-while-revalidate.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  if (data.eventId || data.conversationId) {
    url = data.conversationId ? `/chat?conv=${data.conversationId}` : '/calendario';
  } else if (data.patientId) {
    url = `/menu-navegacion?id=${data.patientId}`;
  } else if (data.url) {
    url = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICKED', data });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
