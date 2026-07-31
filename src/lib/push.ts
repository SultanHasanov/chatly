import { supabase } from './supabase'

function decodeBase64Url(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

export async function enablePush(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push-уведомления не поддерживаются')
  }
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!key) throw new Error('VAPID-ключ не настроен')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Доступ к уведомлениям не предоставлен')
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64Url(key),
  })
  const json = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    user_agent: navigator.userAgent,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' })
  if (error) throw error
}
