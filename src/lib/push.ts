import { supabase } from './supabase'

const PUSH_CONTEXT_KEY = 'chat-brat-push-context-v1'

function isInstalledPwa() {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
}

function currentPushContext() {
  return isInstalledPwa() ? 'standalone' : 'browser'
}

function decodeBase64Url(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0))).buffer as ArrayBuffer
}

function sameKey(left: ArrayBuffer | null, right: ArrayBuffer) {
  if (!left || left.byteLength !== right.byteLength) return false
  const bytes = new Uint8Array(left)
  const expected = new Uint8Array(right)
  return bytes.every((value, index) => value === expected[index])
}

async function createSubscription(registration: ServiceWorkerRegistration, applicationServerKey: ArrayBuffer) {
  try {
    return await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
  } catch (firstError) {
    // A just-updated PWA can temporarily retain a stale worker registration.
    // Refresh it and retry once before surfacing the browser/provider error.
    await registration.update().catch(() => undefined)
    await new Promise((resolve) => setTimeout(resolve, 500))
    try {
      return await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
    } catch {
      const message = firstError instanceof Error ? firstError.message : ''
      if (/push service|registration failed/i.test(message)) {
        throw new Error('Сервис push недоступен. Проверьте VPN или сервисы Google и попробуйте ещё раз')
      }
      throw firstError
    }
  }
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
  const applicationServerKey = decodeBase64Url(key.trim())
  let current = await registration.pushManager.getSubscription()
  const context = currentPushContext()
  const savedContext = localStorage.getItem(PUSH_CONTEXT_KEY)
  // Android associates the notification channel with the context where the
  // subscription was created. Recreate legacy/browser subscriptions once when
  // the user launches the installed PWA, otherwise notifications are shown as
  // Chrome notifications and the launcher dot is attached to Chrome.
  const needsInstalledPwaMigration = current && context === 'standalone' && savedContext !== 'standalone'
  if (current && (!sameKey(current.options.applicationServerKey, applicationServerKey) || needsInstalledPwaMigration)) {
    const oldEndpoint = current.endpoint
    await current.unsubscribe()
    await supabase.from('push_subscriptions').delete().eq('endpoint', oldEndpoint)
    current = null
  }
  const subscription = current ?? await createSubscription(registration, applicationServerKey)
  await savePushSubscription(userId, subscription)
  localStorage.setItem(PUSH_CONTEXT_KEY, context)
  return true
}

export async function disablePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return false
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) throw error
  localStorage.removeItem(PUSH_CONTEXT_KEY)
  return false
}

async function savePushSubscription(userId: string, subscription: PushSubscription) {
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

export async function restorePushSubscription(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || Notification.permission !== 'granted') return false
  return enablePush(userId)
}
