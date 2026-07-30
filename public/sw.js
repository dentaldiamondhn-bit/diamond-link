const CACHE_NAME = 'diamond-link-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        }),
      ),
    ),
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (url.includes('/api/')) return;
  if (!url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)).catch(() => fetch(event.request)),
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
