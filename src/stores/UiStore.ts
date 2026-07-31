import { makeAutoObservable } from 'mobx'
import { loadState, persist } from '../lib/persist'
import type { ThemeMode } from '../types'

type Tab = 'chats' | 'status' | 'calls'

export class UiStore {
  theme: ThemeMode = 'system'
  tab: Tab = 'chats'

  constructor() {
    makeAutoObservable(this)
    const saved = loadState<{ theme: ThemeMode }>('ui')
    if (saved?.theme) this.theme = saved.theme
    persist('ui', () => ({ theme: this.theme }))
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => this.applyTheme())
    this.applyTheme()
  }

  get isDark(): boolean {
    if (this.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return this.theme === 'dark'
  }

  setTheme(theme: ThemeMode) {
    this.theme = theme
    this.applyTheme()
  }

  setTab(tab: Tab) {
    this.tab = tab
  }

  /** Класс на <html> + цвет системной строки под текущую тему. */
  applyTheme() {
    const dark = this.isDark
    document.documentElement.classList.toggle('dark', dark)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#1F2C34' : '#128C7E')
  }
}
