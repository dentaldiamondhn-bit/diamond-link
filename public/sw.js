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
  if (event.request.url.includes('/api/')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});

self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data?.json() || {};
  } catch {
    data = { title: 'Diamond Link', message: event.data?.text() || '' };
  }

  const options = {
    body: data.message || data.body || 'Nueva notificación',
    icon: '/Logo.svg',
    badge: '/Logo.svg',
    tag: data.type || 'general',
    data: data.metadata || data,
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  if (data.metadata?.eventTime || data.metadata?.taskTime || data.metadata?.itemTime) {
    const d = new Date(data.metadata.eventTime || data.metadata.taskTime || data.metadata.itemTime);
    if (!isNaN(d.getTime())) {
      options.body += ` | ${d.toLocaleDateString('es-HN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }
  }

  event.waitUntil(self.registration.showNotification(data.title || 'Diamond Link', options));
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
