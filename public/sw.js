const CACHE_NAME = 'diamond-link-v12';
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
          caches
            .match(event.request)
            .then(
              (cached) =>
                cached ||
                caches.match('/').then((root) => root || caches.match('/dashboard')),
            )
            .then(
              (res) =>
                res ||
                new Response('Sin conexión. Vuelve a intentarlo cuando tengas internet.', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                }),
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
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => new Response('', { status: 503 }));
    }),
  );
});

// ---------------------------------------------------------------------------
// Push aggregation — WhatsApp-style per-thread notifications.
//
// sw.js is a plain static file (no bundler), so instead of importing
// idb-keyval we talk to a tiny native IndexedDB store directly. Each thread
// keeps a persistent unread record (count + last few message snippets) so the
// tray card can be replaced/renotified per chat while the app is closed.
// ---------------------------------------------------------------------------
const PUSH_DB_NAME = 'diamond-link-push';
const PUSH_DB_VERSION = 1;
const PUSH_STORE = 'threads';
const MAX_SNIPPETS = 3;

// Desktop Chromium renders a notification card at its content height, so a long
// multi-line body (or a huge SVG icon — hence the PNG below) makes the card
// "way too tall". Cap the visible body to the last 2 lines with an ellipsis.
function compactBody(lines) {
  const long = (lines || []).join('\n');
  const parts = long
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => (l.length > 90 ? l.slice(0, 89) + '…' : l));
  return parts.slice(-2).join('\n') + (parts.length > 2 ? '\n…' : '');
}

function openPushDB() {
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = indexedDB.open(PUSH_DB_NAME, PUSH_DB_VERSION);
    } catch (err) {
      reject(err);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PUSH_STORE)) {
        db.createObjectStore(PUSH_STORE, { keyPath: 'threadId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function pushStoreAccess(mode) {
  const db = await openPushDB();
  return db.transaction(PUSH_STORE, mode).objectStore(PUSH_STORE);
}

// Every helper is defensive: push must never fall over because a side channel
// (IndexedDB) is unavailable — the notification itself always still shows.
async function getThread(threadId) {
  try {
    const store = await pushStoreAccess('readonly');
    return await new Promise((resolve, reject) => {
      const req = store.get(threadId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function saveThread(record) {
  try {
    const store = await pushStoreAccess('readwrite');
    await new Promise((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Non-fatal: aggregation state is best-effort.
  }
}

async function deleteThread(threadId) {
  try {
    const store = await pushStoreAccess('readwrite');
    await new Promise((resolve, reject) => {
      const req = store.delete(threadId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Non-fatal.
  }
}

// Phase 5 — push notifications (VAPID). The server sends JSON payloads;
// show them in the OS notification tray. IMPORTANT: every push must end in a
// showNotification() call. Chromium counts pushes that finish without a
// visible notification as "silent substitutions" and, once the per-origin
// budget is exhausted, STOPS WAKING THE WORKER FOR NEW PUSHES ENTIRELY — the
// classic "delivered but never appears" failure with no console error. So no
// early returns and no unguarded throws in here, ever.
const LEGACY_ACTIONS = [
  { action: 'open', title: 'Abrir chat' },
  { action: 'reply', title: 'Responder' },
];

// Per-thread (WhatsApp-style) notification. One tray card per conversation,
// re-notifying/replacing on every new message for that chat.
async function showThreadNotification(payload, data) {
  const conversationId = String(data.conversationId);
  const threadId = 'chat-thread-' + conversationId;
  const senderName = String(data.senderName || '');
  const messageText = String(data.messageText || payload.body || '');
  const conversationName = String(data.conversationName || '');
  const conversationType = String(data.conversationType || 'direct');

  const prev = (await getThread(threadId)) || {
    threadId,
    conversationId,
    conversationName,
    conversationType,
    count: 0,
    messages: [],
  };

  // Direct chats title with the sender's name; groups/channels title with the
  // conversation name. Each snippet for a group is prefixed with the sender.
  const isDirect = conversationType === 'direct';
  const chatTitle = isDirect
    ? senderName || conversationName || 'Diamond Link'
    : conversationName || 'Chat';
  const snippet = !isDirect && senderName ? `${senderName}: ${messageText}` : messageText;

  const count = (prev.count || 0) + 1;
  const messages = [...(prev.messages || []), { text: snippet }].slice(-MAX_SNIPPETS);

  const title = count > 1 ? `${chatTitle} (${count})` : chatTitle;
  const body = compactBody(messages.map((m) => m.text));

  await saveThread({
    threadId,
    conversationId,
    conversationName,
    conversationType,
    count,
    messages,
  });

  await self.registration.showNotification(title, {
    body,
    // Same-origin asset only. Chrome drops (and can reject) cross-origin
    // notification icons, so we never ship remote avatar URLs here; the sender
    // info still rides inside `data`.
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: threadId,
    renotify: true,
    data: {
      ...data,
      conversationId,
      conversationTitle: title,
      unreadCount: count,
      senderName,
      messageText,
    },
    vibrate: [100, 50, 100],
    // Chrome shows only the first 2 actions; body tap opens the chat.
    actions: [
      { action: 'responder', title: 'Responder' },
      { action: 'marcar_leido', title: 'Marcar leído' },
    ],
  });
}

// Legacy payloads (test button, calendar/patient links) without thread data:
// show exactly what the server sent, still guaranteed visible.
async function showSimpleNotification(payload) {
  const title = payload.title || 'Diamond Link';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || undefined,
    data: payload.data || {},
    vibrate: [100, 50, 100],
    ...(payload.renotify ? { renotify: true } : {}),
    actions: payload.actions || LEGACY_ACTIONS,
  };
  await self.registration.showNotification(title, options);
}

// Calendario Phase 5 — per-event aggregation (one tray card per cita, replacing
// and re-notifying on every change for that event, keyed `calendar-<eventId>`).
// Reuses the same IndexedDB "threads" store as chat, with a calendar-typed key.
async function showCalendarNotification(payload, data) {
  const eventId = String(data.eventId);
  const threadId = 'calendar-' + eventId;
  const snippet = String(payload.body || '');

  const prev = (await getThread(threadId)) || {
    threadId,
    eventId,
    count: 0,
    messages: [],
  };

  const count = (prev.count || 0) + 1;
  const messages = [...(prev.messages || []), { text: snippet }].slice(-MAX_SNIPPETS);
  const baseTitle = String(data.title || payload.title || 'Cita');
  const title = count > 1 ? `${baseTitle} (${count})` : baseTitle;
  const body = compactBody(messages.map((m) => m.text));

  await saveThread({ threadId, eventId, count, messages });

  await self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: threadId,
    renotify: true,
    data: {
      ...data,
      eventId,
      url: data.url || `/calendario?view=day&date=${String(data.date || '')}&eventId=${eventId}`,
      unreadCount: count,
    },
    vibrate: [100, 50, 100],
    actions: [{ action: 'open', title: 'Abrir cita' }],
  });
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = (event.data && event.data.json()) || {};
  } catch {
    payload = {
      title: 'Diamond Link',
      body: (event.data && event.data.text()) || 'Nuevo mensaje',
    };
  }

  event.waitUntil(
    (async () => {
      try {
        const data = (payload.data && typeof payload.data === 'object' ? payload.data : {}) || {};
        if (data.conversationId) {
          await showThreadNotification(payload, data);
        } else if (data.type === 'calendar' && data.eventId) {
          await showCalendarNotification(payload, data);
        } else {
          await showSimpleNotification(payload);
        }
      } catch {
        // Ensure the push is never silent even if a single option is rejected
        // (e.g. platform-specific field). Chrome substitutes a generic tile
        // otherwise, and repeated substitutions burn the silent budget that
        // stops waking the worker entirely.
        try {
          await self.registration.showNotification('Diamond Link', {
            body: payload.body || '',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
          });
        } catch {
          await self.registration.showNotification('Diamond Link').catch(() => {});
        }
      }
    })()
  );
});

// Mark an in-app bell row read (PATCH route is Clerk-gated via the session
// cookie; same-origin SW fetches include cookies by default).
async function markBellRead(bellId) {
  if (!bellId) return;
  try {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: bellId, action: 'markAsRead' }),
    });
  } catch {
    // Best effort — a closed notification should never break anything.
  }
}

// Acknowledge a chat thread (bump last_read_at + per-message reads).
async function markChatConversationRead(conversationId) {
  if (!conversationId) return;
  try {
    await fetch('/api/chat/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId }),
    });
  } catch {
    // Best effort.
  }
}

// Swipe/dismiss in the tray (Android) → acknowledge without opening the app.
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data || {};
  const conversationId = data.conversationId || null;
  const bellId = data.bellId || null;
  const threadId = conversationId
    ? 'chat-thread-' + conversationId
    : data.type === 'calendar' && data.eventId
      ? 'calendar-' + data.eventId
      : null;

  event.waitUntil(
    (async () => {
      if (bellId) await markBellRead(bellId);
      if (threadId) await deleteThread(threadId);
      if (conversationId) await markChatConversationRead(conversationId);
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notification = event.notification;
  const data = notification.data || {};
  const action = event.action;
  const conversationId = data.conversationId || null;
  const bellId = data.bellId || null;
  const isMarkRead = action === 'marcar_leido' || action === 'mark_read' || action === 'mark_as_read';
  // `data.url` may point somewhere else (calendario, patient) for legacy
  // notifications; chat notifications always deep-link to the thread.
  const threadId = conversationId
    ? 'chat-thread-' + conversationId
    : data.type === 'calendar' && data.eventId
      ? 'calendar-' + data.eventId
      : null;
  const url = conversationId
    ? `/chat?conv=${conversationId}`
    : data.url || '/';

  event.waitUntil(
    (async () => {
      // Opening a thread clears its pending unread count (the client resets
      // the in-app badge by actually loading the conversation).
      if (threadId) await deleteThread(threadId);
      if (bellId) await markBellRead(bellId);

      const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const sameOrigin = windowClients.filter((c) =>
        c.url.startsWith(self.location.origin)
      );

      // "Marcar leído" NEVER opens/navigates the app — it just acknowledges.
      // If a chat tab is already open, hand the action to it (it clears the
      // in-app badge without navigating); otherwise mark read server-side and
      // stay put.
      if (isMarkRead) {
        const chatWindow = sameOrigin.find((c) => c.url.includes('/chat'));
        if (chatWindow) {
          chatWindow.postMessage({ type: 'NOTIFICATION_CLICKED', data, action, threadId });
          chatWindow.focus();
        } else if (conversationId) {
          await markChatConversationRead(conversationId);
        }
        return;
      }

      // Prefer the chat window (it owns the NOTIFICATION_CLICKED listener for
      // reply/mark-read); fall back to any other app window.
      const target =
        sameOrigin.find((c) => c.url.includes('/chat')) ||
        sameOrigin.find((c) => 'focus' in c);

      if (target) {
        // App already running: focus it and let the client route the thread /
        // action (reply focuses the composer, marcar_leido clears the badge).
        target.postMessage({ type: 'NOTIFICATION_CLICKED', data, action, threadId });
        return target.focus();
      }

      // App not running at all: open the deep link.
      return clients.openWindow(url);
    })()
  );
});
