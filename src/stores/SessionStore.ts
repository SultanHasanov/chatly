import { makeAutoObservable } from 'mobx'
import { clearState, loadState, persist } from '../lib/persist'
import { initialsOf } from '../lib/format'
import type { SessionUser } from '../types'
import { ensureAnonymousSession, supabase, supabaseConfigured } from '../lib/supabase'

export class SessionStore {
  user: SessionUser | null = null
  ready = !supabaseConfigured
  /** Онбординг показывается один раз. */
  onboarded = false

  constructor() {
    makeAutoObservable(this)
    const saved = loadState<{ user: SessionUser | null; onboarded: boolean }>('session')
    if (saved) {
      this.user = saved.user ? { ...saved.user, isGuest: false, guestChatId: undefined } : null
      this.onboarded = saved.onboarded
      if (supabaseConfigured) this.ready = true
    }
    persist('session', () => ({ user: this.user, onboarded: this.onboarded }))
    if (supabaseConfigured) {
      void this.restoreSupabaseSession()
      supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) this.user = null
        else void this.loadSupabaseUser(session.user.id)
      })
    }
  }

  private async restoreSupabaseSession() {
    try {
      const { data } = await supabase.auth.getSession()
      if (data.session) await this.loadSupabaseUser(data.session.user.id)
      else this.user = null
    } catch {
      // Keep the cached identity when the app starts without a network.
    } finally {
      this.ready = true
    }
  }

  private async loadSupabaseUser(id: string) {
    const { data, error } = await supabase.from('profiles').select('display_name,avatar_path').eq('id', id).maybeSingle()
    if (error) return
    const cached = this.user?.id === id ? this.user : undefined
    const name = data?.display_name || 'Гость'
    let avatarUrl: string | undefined
    if (data?.avatar_path) {
      const signed = await supabase.storage.from('avatars').createSignedUrl(data.avatar_path, 3600)
      avatarUrl = signed.data?.signedUrl
    }
    this.user = { id, name, initials: initialsOf(name), color: cached?.color ?? '#5B8DEF', isGuest: false, avatarUrl: avatarUrl ?? cached?.avatarUrl }
  }

  get isAuthed(): boolean {
    return this.user !== null
  }

  get isGuest(): boolean {
    return false
  }

  completeOnboarding() {
    this.onboarded = true
  }

  async startWithName(name: string) {
    const cleanName = name.trim()
    if (!cleanName) throw new Error('Введите имя')
    if (supabaseConfigured) {
      const auth = await ensureAnonymousSession(cleanName)
      const { error } = await supabase.from('profiles').update({ display_name: cleanName, updated_at: new Date().toISOString() }).eq('id', auth.user.id)
      if (error) throw error
      this.user = { id: auth.user.id, name: cleanName, initials: initialsOf(cleanName), color: '#5B8DEF', isGuest: false }
      return
    }
    this.user = { id: `local-${Date.now()}`, name: cleanName, initials: initialsOf(cleanName), color: '#5B8DEF', isGuest: false }
  }

  useAnonymousUser(id: string, name: string) {
    this.user = { id, name, initials: initialsOf(name), color: '#5B8DEF', isGuest: false }
  }

  async logout() {
    if (supabaseConfigured) await supabase.auth.signOut()
    this.user = null
    clearState('session')
  }
}
