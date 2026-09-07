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

// Phase 5 — push notifications (VAPID). The server sends JSON payloads;
// show them in the OS notification tray. While a chat tab is actively focused
// on the same conversation, the notification is suppressed (the message is
// already on screen), matching WhatsApp's behaviour.
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json() || {};
  } catch {
    payload = { title: 'Diamond Link', body: event.data.text() };
  }

  const title = payload.title || 'Diamond Link';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/Logo.svg',
    badge: payload.badge || '/Logo.svg',
    tag: payload.tag,
    data: payload.data || {},
    vibrate: [100, 50, 100],
    renotify: payload.renotify ? true : undefined,
    // Notification action buttons (desktop/Android). All carry a single
    // `convId` so notificationclick can route to the right conversation.
    actions: payload.actions || [
      { action: 'open', title: 'Abrir chat', icon: '/Logo.svg' },
      { action: 'reply', title: 'Responder', icon: '/Logo.svg' },
    ],
  };

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const anyFocused = windows.some((c) => 'focus' in c && c.focused);
      if (anyFocused) {
        const convId = payload.data && payload.data.conversationId;
        if (!convId) return;
        const alreadyOnIt = windows.some((c) => {
          try {
            return new URL(c.url).searchParams.get('conv') === convId;
          } catch {
            return false;
          }
        });
        if (alreadyOnIt) return;
      }
      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notification = event.notification;
  const data = notification.data || {};
  const action = event.action;
  const convId = data.conversationId;
  let url =
    action === 'reply'
      ? (convId ? `/chat?conv=${convId}` : '/chat')
      : data.eventId || data.conversationId
      ? (convId ? `/chat?conv=${convId}` : '/calendario')
      : data.patientId
      ? `/menu-navegacion?id=${data.patientId}`
      : data.url || '/';

  // If the app is already running, focus + signal the client. For 'reply',
  // we focus the chat and let the client autofocus the composer (via the
  // CONV already opened). Otherwise open a fresh window.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICKED', data, action });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
