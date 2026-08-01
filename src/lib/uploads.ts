import { supabase } from './supabase'
import { AVATAR_SIGNED_TTL_SECONDS, rememberAvatarUrl } from './avatarCache'

export type UploadKind = 'image' | 'video' | 'document' | 'voice'

const limits: Record<UploadKind, number> = {
  image: 20 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  document: 50 * 1024 * 1024,
  voice: 25 * 1024 * 1024,
}

export function kindOf(file: File): UploadKind {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'voice'
  return 'document'
}

export function validateUpload(file: File, kind = kindOf(file)) {
  if (!file.size) throw new Error('Файл пуст')
  if (file.size > limits[kind]) throw new Error(`Файл превышает лимит ${limits[kind] / 1024 / 1024} МБ`)
  return kind
}

export async function uploadChatFile(conversationId: string, userId: string, file: File) {
  const kind = validateUpload(file)
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100)
  const path = `${conversationId}/${userId}/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from('chat-media').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (error) throw error
  return { path, kind, mimeType: file.type || 'application/octet-stream', size: file.size, name: file.name }
}

export async function uploadAvatar(userId: string, file: File) {
  validateUpload(file, 'image')
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${userId}/avatar-${Date.now()}.${extension}`
  const { error } = await supabase.storage.from('avatars').upload(path, file)
  if (error) throw error
  const updated = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId)
  if (updated.error) throw updated.error
  // Сразу кладём ссылку и байты в кеш, чтобы после перезагрузки не мигали инициалы.
  const signed = await supabase.storage.from('avatars').createSignedUrl(path, AVATAR_SIGNED_TTL_SECONDS)
  if (signed.data?.signedUrl) rememberAvatarUrl(path, signed.data.signedUrl)
  return path
}

export async function uploadGroupAvatar(userId: string, conversationId: string, file: File) {
  validateUpload(file, 'image')
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${userId}/groups/${conversationId}-${Date.now()}.${extension}`
  const uploaded = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type })
  if (uploaded.error) throw uploaded.error
  const updated = await supabase.from('conversations').update({ avatar_path: path }).eq('id', conversationId)
  if (updated.error) throw updated.error
  const signed = await supabase.storage.from('avatars').createSignedUrl(path, AVATAR_SIGNED_TTL_SECONDS)
  return { path, url: signed.data?.signedUrl }
}
