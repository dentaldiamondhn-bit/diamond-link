// Service Worker for Diamond Link PWA
const CACHE_NAME = 'diamond-link-v2';
const urlsToCache = [
  '/',
  '/dashboard',
  '/calendario',
  '/pacientes',
  '/Logo.svg',
  '/favicon-192.png',
  '/favicon-512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  self.skipWaiting(); // Activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('❌ Failed to cache resources:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Take control immediately
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              // Only cache GET requests to avoid TypeError with POST requests
              if (event.request.method === 'GET') {
                cache.put(event.request, responseToCache);
              }
            });

          return response;
        });
      })
  );
});

// Push notification event - Multiple fallback methods
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received:', event);

  // Parse data
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      // Try text if JSON fails
      data = { message: event.data.text() };
    }
  }

  const title = data.title || 'Diamond Link';
  const message = data.message || data.body || 'Nueva notificación';
  
  // Vibration pattern for Android
  const vibratePattern = data.type?.includes('reminder') 
    ? [300, 150, 300, 150, 300] 
    : [200, 100, 200];

  // Try standard notification first
  const showNotification = async () => {
    const options = {
      body: message,
      icon: '/Logo.svg',
      badge: '/Logo.svg',
      tag: data.type || 'default',
      data: data,
      requireInteraction: data.requireInteraction || true,
      vibrate: vibratePattern,
      // Android-specific options
      sound: 'default',
      urgency: 'high' as const,
      priority: 2 as const, // High priority for Android
      actions: [
        { action: 'open', title: 'Abrir' },
        { action: 'dismiss', title: 'Cerrar' }
      ]
    };

    await self.registration.showNotification(title, options);
  };

  // Wait for notification to show
  event.waitUntil(
    showNotification()
      .then(() => console.log('✅ Push notification shown'))
      .catch(async (error) => {
        console.error('❌ Push notification failed:', error);
        
        // Try simpler notification as fallback
        try {
          await self.registration.showNotification(title, {
            body: message,
            icon: '/Logo.svg'
          });
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
        }
      })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);

  event.notification.close();

  // Handle different actions (simplified for now)
  if (event.action === 'dismiss') {
    return;
  }

  // Default action - open the app
  event.waitUntil(
    clients.matchAll().then(clientList => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url === '/' || client.url.includes('/calendario')) {
          // Focus the existing tab
          return client.focus();
        }
      }
      // Open new tab
      return clients.openWindow('/calendario');
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('🔕 Notification closed:', event);
});

// Background sync for calendar events
self.addEventListener('sync', (event) => {
  if (event.tag === 'calendar-sync') {
    console.log('🔄 Background sync for calendar events');
    event.waitUntil(syncCalendarEvents());
  }
});

// Sync calendar events function
async function syncCalendarEvents() {
  try {
    // This would sync any pending calendar changes
    console.log('📅 Syncing calendar events in background');
  } catch (error) {
    console.error('❌ Error syncing calendar events:', error);
  }
}

// Periodic background sync for reminders
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'calendar-reminders') {
    console.log('⏰ Periodic sync for calendar reminders');
    event.waitUntil(checkReminders());
  }
});

// Check for upcoming reminders
async function checkReminders() {
  try {
    console.log('🔔 Checking for upcoming reminders');
    
    // Fetch upcoming events from API
    const response = await fetch('/api/calendar/reminders/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const reminders = await response.json();
      
      for (const reminder of reminders.upcoming || []) {
        if (reminder.timeuntil <= 0) {
          // Show notification for due reminder
          self.registration.showNotification(reminder.title, {
            body: reminder.message,
            icon: '/Logo.svg',
            badge: '/Logo.svg',
            tag: `reminder-${reminder.id}`,
            data: reminder
          });
        }
      }
    }
  } catch (error) {
    console.error('❌ Error checking reminders:', error);
  }
}
