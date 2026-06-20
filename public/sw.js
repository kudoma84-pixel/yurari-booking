self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '整体院 癒楽里';
  const options = {
    body: data.body || 'お知らせがあります',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.url || '/',
  };
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.registration.badge ? self.registration.badge.set(1) : (navigator.setAppBadge ? navigator.setAppBadge(1) : Promise.resolve()),
    ])
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (navigator.clearAppBadge) navigator.clearAppBadge();
  event.waitUntil(clients.openWindow(event.notification.data || '/'));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data || '/'));
});
