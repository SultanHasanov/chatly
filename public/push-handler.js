self.addEventListener('push', (event) => {
  let payload = { title: 'Chatly', body: 'Новое сообщение', url: '/chats' }
  try { payload = { ...payload, ...event.data.json() } } catch { /* use safe defaults */ }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.conversationId ? `chat-${payload.conversationId}` : 'chatly',
    data: { url: payload.url },
  }))
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
