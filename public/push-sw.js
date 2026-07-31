self.addEventListener('push', (event) => {
  let payload = { title: 'Chat Brat', body: 'Новое сообщение', url: '/chats' }
  try { payload = { ...payload, ...event.data.json() } } catch { /* use safe defaults */ }
  const notification = self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/notification-badge-96.png',
    tag: payload.conversationId ? `chat-${payload.conversationId}` : 'chat-brat',
    data: { url: payload.url },
  })
  const badge = typeof self.navigator.setAppBadge === 'function'
    ? self.navigator.setAppBadge().catch(() => undefined)
    : Promise.resolve()
  event.waitUntil(Promise.all([notification, badge]))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/chats', self.location.origin).href
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows[0]
    if (existing) return existing.navigate(target).then(() => existing.focus())
    return clients.openWindow(target)
  }))
})
