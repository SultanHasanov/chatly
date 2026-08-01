import { supabase } from './supabase'

/**
 * Аватары лежат в приватном бакете и отдаются подписанными ссылками.
 * Одной памяти мало: после перезагрузки ссылка из localStorage может быть
 * протухшей, картинка отваливается и на её месте мигают инициалы. Поэтому
 * кешируем два уровня — сами подписанные ссылки (со сроком) и байты картинки
 * в Cache Storage по стабильному ключу storage-пути.
 */

const URL_STORAGE_KEY = 'chat-brat:avatar-urls'
const BYTES_CACHE = 'chatly-avatars-v1'
const CACHE_ORIGIN = 'https://avatar.local/'
/**
 * Аватар — статичная картинка, менять подпись каждый час незачем: это лишний
 * раунд-трип и промах браузерного кеша (в ссылке меняется token). Берём год.
 */
export const AVATAR_SIGNED_TTL_SECONDS = 365 * 24 * 3600
const SIGNED_TTL_MS = AVATAR_SIGNED_TTL_SECONDS * 1000
/** Обновляем заранее, чтобы ссылка не протухла прямо на экране. */
const REFRESH_MARGIN_MS = 24 * 3600_000

type Entry = { url: string; expiresAt: number }

const urlCache = new Map<string, Entry>(loadUrlCache())
/** path → objectURL закешированных байтов. Живёт до перезагрузки вкладки. */
const blobUrls = new Map<string, string>()
const blobLoads = new Map<string, Promise<string | undefined>>()

function loadUrlCache(): [string, Entry][] {
  try {
    const raw = localStorage.getItem(URL_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as [string, Entry][]
    return parsed.filter(([path, entry]) =>
      typeof path === 'string' && typeof entry?.url === 'string' && entry.expiresAt > Date.now())
  } catch {
    return []
  }
}

function saveUrlCache() {
  try {
    localStorage.setItem(URL_STORAGE_KEY, JSON.stringify([...urlCache.entries()]))
  } catch {
    /* хранилище недоступно — работаем только в памяти */
  }
}

function cacheKey(path: string): string {
  return CACHE_ORIGIN + encodeURIComponent(path)
}

function cacheStorage(): CacheStorage | undefined {
  return typeof caches === 'undefined' ? undefined : caches
}

/** Синхронно: годная ссылка из кеша, если она ещё не протухла. */
export function knownAvatarUrl(path: string | undefined): string | undefined {
  if (!path) return undefined
  const blob = blobUrls.get(path)
  if (blob) return blob
  const entry = urlCache.get(path)
  return entry && entry.expiresAt > Date.now() ? entry.url : undefined
}

/** Достаёт байты аватара из Cache Storage и отдаёт objectURL. */
export function warmAvatar(path: string | undefined): Promise<string | undefined> {
  if (!path) return Promise.resolve(undefined)
  const ready = blobUrls.get(path)
  if (ready) return Promise.resolve(ready)
  const inFlight = blobLoads.get(path)
  if (inFlight) return inFlight
  const load = (async () => {
    const storage = cacheStorage()
    if (!storage) return undefined
    try {
      const cache = await storage.open(BYTES_CACHE)
      const hit = await cache.match(cacheKey(path))
      if (!hit) return undefined
      const objectUrl = URL.createObjectURL(await hit.blob())
      blobUrls.set(path, objectUrl)
      return objectUrl
    } catch {
      return undefined
    } finally {
      blobLoads.delete(path)
    }
  })()
  blobLoads.set(path, load)
  return load
}

/** Скачивает картинку по подписанной ссылке и кладёт байты в Cache Storage. */
async function storeAvatarBytes(path: string, signedUrl: string) {
  const storage = cacheStorage()
  if (!storage) return
  try {
    const response = await fetch(signedUrl)
    if (!response.ok) return
    const cache = await storage.open(BYTES_CACHE)
    await cache.put(cacheKey(path), response.clone())
    // Уже показанный objectURL не трогаем: его отзыв сломал бы видимую картинку.
    if (!blobUrls.has(path)) blobUrls.set(path, URL.createObjectURL(await response.blob()))
  } catch {
    /* офлайн или CORS — остаёмся на подписанной ссылке */
  }
}

/** Подписанная ссылка на аватар с кешом; попутно освежает байты в Cache Storage. */
export async function signedAvatarUrl(path: string): Promise<string | undefined> {
  const cached = urlCache.get(path)
  if (cached && cached.expiresAt > Date.now()) {
    if (!blobUrls.has(path)) void storeAvatarBytes(path, cached.url)
    return cached.url
  }
  const signed = await supabase.storage.from('avatars').createSignedUrl(path, AVATAR_SIGNED_TTL_SECONDS)
  const url = signed.data?.signedUrl
  if (!url) return undefined
  rememberAvatarUrl(path, url)
  await storeAvatarBytes(path, url)
  return url
}

/** Кладёт в кеш только что подписанную ссылку (например, сразу после загрузки аватара). */
export function rememberAvatarUrl(path: string, url: string) {
  urlCache.set(path, { url, expiresAt: Date.now() + SIGNED_TTL_MS - REFRESH_MARGIN_MS })
  saveUrlCache()
  void storeAvatarBytes(path, url)
}

export function clearAvatarCache() {
  urlCache.clear()
  saveUrlCache()
  for (const url of blobUrls.values()) URL.revokeObjectURL(url)
  blobUrls.clear()
  blobLoads.clear()
  void cacheStorage()?.delete(BYTES_CACHE)
}
