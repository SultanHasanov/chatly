import { makeAutoObservable } from 'mobx'
import { clearState, loadState, persist } from '../lib/persist'
import { ME } from '../data/mock'
import { initialsOf } from '../lib/format'
import { AUTHOR_COLORS } from '../data/mock'
import type { SessionUser, TelegramAuthData } from '../types'
import { supabase, supabaseConfigured } from '../lib/supabase'

export class SessionStore {
  user: SessionUser | null = null
  ready = !supabaseConfigured
  /** Онбординг показывается один раз. */
  onboarded = false

  constructor() {
    makeAutoObservable(this)
    const saved = loadState<{ user: SessionUser | null; onboarded: boolean }>('session')
    if (saved && !supabaseConfigured) {
      this.user = saved.user
      this.onboarded = saved.onboarded
    }
    persist('session', () => ({ user: this.user, onboarded: this.onboarded }))
    if (supabaseConfigured) {
      void this.restoreSupabaseSession()
      supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) this.user = null
        else void this.loadSupabaseUser(session.user.id, session.user.is_anonymous)
      })
    }
  }

  private async restoreSupabaseSession() {
    try {
      const { data } = await supabase.auth.getSession()
      if (data.session) await this.loadSupabaseUser(data.session.user.id, data.session.user.is_anonymous)
      else this.user = null
    } finally {
      this.ready = true
    }
  }

  private async loadSupabaseUser(id: string, isAnonymous = false) {
    const { data } = await supabase.from('profiles').select('display_name,avatar_path').eq('id', id).maybeSingle()
    const name = data?.display_name || 'Гость'
    let avatarUrl: string | undefined
    if (data?.avatar_path) {
      const signed = await supabase.storage.from('avatars').createSignedUrl(data.avatar_path, 3600)
      avatarUrl = signed.data?.signedUrl
    }
    this.user = { id, name, initials: initialsOf(name), color: '#5B8DEF', isGuest: isAnonymous, avatarUrl }
  }

  get isAuthed(): boolean {
    return this.user !== null
  }

  get isGuest(): boolean {
    return this.user?.isGuest ?? false
  }

  completeOnboarding() {
    this.onboarded = true
  }

  /** Мок-вход: используется, если Telegram-бот не настроен. */
  loginAsMockUser() {
    this.user = { ...ME }
  }

  /** Вход по данным Telegram Login Widget. */
  async loginWithTelegram(data: TelegramAuthData) {
    if (supabaseConfigured) {
      const result = await supabase.functions.invoke('telegram-auth', { body: data })
      if (result.error || result.data?.error) throw new Error(result.data?.error || result.error.message)
      const verified = await supabase.auth.verifyOtp({ token_hash: result.data.token_hash, type: 'magiclink' })
      if (verified.error) throw verified.error
      return
    }
    const name = [data.first_name, data.last_name].filter(Boolean).join(' ')
    this.user = {
      id: `tg${data.id}`,
      name,
      initials: initialsOf(name),
      color: AUTHOR_COLORS[data.id % AUTHOR_COLORS.length],
      isGuest: false,
    }
  }

  /** Вход по ссылке-приглашению без регистрации. */
  loginAsGuest(name: string, chatId: string) {
    this.user = {
      id: `guest-${Date.now()}`,
      name,
      initials: initialsOf(name),
      color: '#5B8DEF',
      isGuest: true,
      guestChatId: chatId,
    }
  }

  useAnonymousUser(id: string, name: string, chatId: string) {
    this.user = { id, name, initials: initialsOf(name), color: '#5B8DEF', isGuest: true, guestChatId: chatId }
  }

  /** «Привязать Telegram» на экране настроек гостя. */
  upgradeGuest(user?: SessionUser) {
    this.user = user ?? { ...ME }
  }

  async logout() {
    if (supabaseConfigured) await supabase.auth.signOut()
    this.user = null
    clearState('session')
  }
}
