// Custom service worker for push notifications
// Version: 2.0 - Clear cache fix

const CACHE_VERSION = 'v2';

self.addEventListener('push', function(event) {
  console.log('[SW] Push received:', event);

  let data = {
    title: 'Nova Transação',
    body: 'Uma nova transação foi recebida',
    icon: '/logo-ov.png',
    badge: '/logo-ov.png',
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: data.badge,
      };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    tag: 'transaction-notification',
    renotify: true,
    requireInteraction: false,
    data: {
      url: '/',
      timestamp: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window/tab open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          return client.navigate(urlToOpen);
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', function(event) {
  console.log('[SW] Push service worker installing, version:', CACHE_VERSION);
  // Force the waiting service worker to become active
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Push service worker activating, version:', CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Clear all old caches
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            console.log('[SW] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Take control of all clients immediately
      clients.claim()
    ]).then(function() {
      console.log('[SW] All caches cleared, now controlling all clients');
    })
  );
});

// Handle fetch - pass through without caching for this simple push SW
self.addEventListener('fetch', function(event) {
  // Let the browser handle fetches normally
  return;
});
