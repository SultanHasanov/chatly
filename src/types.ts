export interface Contact {
  id: string
  name: string
  initials: string
  color: string
}

export type MemberRole = 'admin' | 'member' | 'guest'

export interface Member extends Contact {
  role: MemberRole
  avatarUrl?: string
}

export interface Quote {
  authorName: string
  text: string
}

export interface Message {
  id: string
  chatId: string
  authorId: string
  authorName: string
  authorColor: string
  text: string
  /** Заглушка вложения из прототипа (плитка «скриншот экрана»). */
  attachment?: {
    kind: 'image' | 'video' | 'document' | 'voice'
    caption: string
    path?: string
    url?: string
    fileName?: string
    mimeType?: string
    size?: number
    durationMs?: number
  }
  quote?: Quote
  ts: number
  outgoing: boolean
  status: 'sent' | 'delivered' | 'read'
}

export interface Chat {
  id: string
  name: string
  initials: string
  color: string
  isGroup: boolean
  memberIds: string[]
  /** Для групп из прототипа участников больше, чем в списке memberIds. */
  memberCount: number
  pinned: boolean
  unreadCount: number
  inviteCode: string
  description?: string
  mediaCount: number
  avatarPath?: string
  avatarUrl?: string
}

export interface SessionUser {
  id: string
  name: string
  initials: string
  color: string
  isGuest: boolean
  /** Для гостя — чат, в который он вошёл по ссылке. */
  guestChatId?: string
  avatarUrl?: string
}

export type ThemeMode = 'light' | 'dark' | 'system'

export interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}
