self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '整体院 癒楽里';
  const options = {
    body: data.body || 'お知らせがあります',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.url || '/',
  };

  const badgeCount = data.badge || 1;

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      navigator.setAppBadge ? navigator.setAppBadge(badgeCount) : Promise.resolve(),
    ])
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (navigator.clearAppBadge) navigator.clearAppBadge();
  event.waitUntil(clients.openWindow(event.notification.data || '/'));
});
