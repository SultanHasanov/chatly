import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
export const supabaseProxyEnabled = import.meta.env.VITE_SUPABASE_USE_PROXY === 'true'
const clientUrl = supabaseProxyEnabled && typeof window !== 'undefined'
  ? `${window.location.origin}/supabase`
  : url

export const supabaseConfigured = Boolean(url && key)

export const supabase = createClient(
  clientUrl || 'https://placeholder.supabase.co',
  key || 'placeholder',
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  },
)

export async function ensureAnonymousSession(displayName?: string) {
  const current = await supabase.auth.getSession()
  if (current.data.session) return current.data.session
  const { data, error } = await supabase.auth.signInAnonymously({
    options: displayName ? { data: { display_name: displayName } } : undefined,
  })
  if (error) throw error
  if (!data.session) throw new Error('Не удалось создать гостевую сессию')
  return data.session
}

export async function signedMediaUrl(bucket: 'chat-media' | 'avatars', path: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}
