import { makeAutoObservable } from 'mobx'
import { clearState, loadState, persist } from '../lib/persist'
import { initialsOf } from '../lib/format'
import type { SessionUser } from '../types'
import { ensureAnonymousSession, supabase, supabaseConfigured } from '../lib/supabase'
import { clearAvatarCache, knownAvatarUrl, signedAvatarUrl, warmAvatar } from '../lib/avatarCache'

export class SessionStore {
  user: SessionUser | null = null
  ready = !supabaseConfigured
  /** Онбординг показывается один раз. */
  onboarded = false

  constructor() {
    makeAutoObservable(this)
    const saved = loadState<{ user: SessionUser | null; onboarded: boolean }>('session')
    if (saved) {
      const savedUser = saved.user
      // Подписанная ссылка из прошлой сессии может быть протухшей: берём только годную,
      // иначе <img> отвалится и на аватаре мигнут инициалы.
      this.user = savedUser
        ? {
            ...savedUser,
            isGuest: false,
            guestChatId: undefined,
            avatarUrl: savedUser.avatarPath ? knownAvatarUrl(savedUser.avatarPath) : savedUser.avatarUrl,
          }
        : null
      if (this.user?.avatarPath) void this.adoptCachedAvatar(this.user.avatarPath)
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

  private async adoptCachedAvatar(path: string) {
    const cached = await warmAvatar(path)
    if (cached && this.user?.avatarPath === path) this.user = { ...this.user, avatarUrl: cached }
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
    const avatarPath: string | undefined = data?.avatar_path ?? undefined
    let avatarUrl: string | undefined
    if (avatarPath) {
      avatarUrl = (await warmAvatar(avatarPath)) ?? (await signedAvatarUrl(avatarPath))
    }
    this.user = { id, name, initials: initialsOf(name), color: cached?.color ?? '#5B8DEF', isGuest: false, avatarPath, avatarUrl: avatarUrl ?? (avatarPath ? cached?.avatarUrl : undefined) }
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
    clearAvatarCache()
    clearState('session')
  }
}
