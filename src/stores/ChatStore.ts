import { makeAutoObservable } from 'mobx'
import { loadState, persist } from '../lib/persist'
import { CONTACTS, DESIGN_TEAM_MEMBERS, seedChats, seedMessages } from '../data/mock'
import { authorColorOf, initialsOf, randomCode } from '../lib/format'
import type { Chat, Member, Message, Quote, SessionUser } from '../types'
import { signedMediaUrl, supabase, supabaseConfigured } from '../lib/supabase'
import { uploadChatFile, uploadGroupAvatar } from '../lib/uploads'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Snapshot {
  chats: Chat[]
  messages: Message[]
  extraMembers: Record<string, Member[]>
}

export class ChatStore {
  chats: Chat[] = []
  messages: Message[] = []
  /** Участники, добавленные в чат уже в приложении (гости по ссылке, новые группы). */
  extraMembers: Record<string, Member[]> = {}
  private realtime: RealtimeChannel | null = null
  private reconciliationTimer: ReturnType<typeof setInterval> | null = null
  private syncPromise: Promise<void> | null = null
  private lastSyncAt = 0
  private readAtOverrides = new Map<string, number>()
  private avatarUrlCache = new Map<string, { url: string; expiresAt: number }>()

  constructor() {
    makeAutoObservable(this)
    const saved = loadState<Snapshot>('chats')
    // This snapshot is also the read-through cache when Supabase is enabled.
    if (saved) {
      this.chats = saved.chats
      this.messages = saved.messages
      this.extraMembers = saved.extraMembers ?? {}
    } else if (!supabaseConfigured) {
      this.chats = seedChats()
      this.messages = seedMessages()
      this.extraMembers = { design: DESIGN_TEAM_MEMBERS }
    }
    persist('chats', () => ({
      chats: this.chats,
      messages: this.messages,
      extraMembers: this.extraMembers,
    }))
  }

  chatById(id: string | undefined): Chat | undefined {
    return this.chats.find((c) => c.id === id)
  }

  chatByInviteCode(code: string): Chat | undefined {
    return this.chats.find((c) => c.inviteCode === code)
  }

  messagesOf(chatId: string): Message[] {
    const unique = new Map<string, Message>()
    for (const message of this.messages) {
      if (message.chatId !== chatId) continue
      const existing = unique.get(message.id)
      // Prefer the completed server/realtime representation over a pending one.
      if (!existing || (existing.attachment?.uploading && !message.attachment?.uploading)) {
        unique.set(message.id, message)
      }
    }
    return [...unique.values()].sort((a, b) => a.ts - b.ts)
  }

  lastMessageOf(chatId: string): Message | undefined {
    const list = this.messagesOf(chatId)
    return list[list.length - 1]
  }

  /** Строка превью в списке чатов: «Игорь: скриншот экрана». */
  previewOf(chat: Chat): string {
    const last = this.lastMessageOf(chat.id)
    if (!last) return 'Нет сообщений'
    const body = last.attachment ? last.attachment.caption : last.text
    if (last.outgoing || !chat.isGroup) return body
    return `${last.authorName.split(' ')[0]}: ${body}`
  }

  membersOf(chatId: string): Member[] {
    const stored = this.extraMembers[chatId]
    if (stored?.length) return stored
    const chat = this.chatById(chatId)
    if (!chat) return []
    return chat.memberIds.map((id) => {
      const c = CONTACTS.find((x) => x.id === id)
      return {
        id,
        name: c?.name ?? 'Вы',
        initials: c?.initials ?? 'Я',
        color: c?.color ?? '#25D366',
        role: id === 'me' ? 'admin' : 'member',
      }
    })
  }

  /** Сортировка как в прототипе: закреплённые сверху, дальше по времени. */
  get sortedChats(): Chat[] {
    return [...this.chats].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return (this.lastMessageOf(b.id)?.ts ?? 0) - (this.lastMessageOf(a.id)?.ts ?? 0)
    })
  }

  async sendMessage(chatId: string, text: string, author: SessionUser, quote?: Quote) {
    const body = text.trim()
    if (!body) return
    if (supabaseConfigured) {
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: chatId,
        author_id: author.id,
        kind: 'text',
        body,
        reply_to_id: quote?.messageId ?? null,
      }).select('id,conversation_id,author_id,body,created_at').single()
      if (error) throw error
      if (!this.messages.some((message) => message.id === data.id)) {
        this.messages.push({
          id: data.id, chatId: data.conversation_id, authorId: data.author_id,
          authorName: author.name, authorColor: author.color, text: data.body,
          quote, ts: new Date(data.created_at).getTime(), outgoing: true, status: 'sent',
        })
      }
    } else {
      this.messages.push({
        id: `m${Date.now()}`,
        chatId,
        authorId: author.id,
        authorName: author.name,
        authorColor: author.color,
        text: body,
        quote,
        ts: Date.now(),
        outgoing: true,
        status: 'sent',
      })
    }
    await this.markRead(chatId, author.id)
  }

  async sendAttachment(chatId: string, file: File, author: SessionUser, caption = '', durationMs?: number) {
    const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'voice' : 'document'
    const previewUrl = URL.createObjectURL(file)
    const temporaryId = `upload-${crypto.randomUUID()}`
    const pending: Message = {
      id: temporaryId, chatId, authorId: author.id, authorName: author.name,
      authorColor: author.color, text: caption, ts: Date.now(), outgoing: true, status: 'sent',
      attachment: { kind, caption: caption || file.name, fileName: file.name, mimeType: file.type, size: file.size, durationMs, url: previewUrl, uploading: supabaseConfigured },
    }
    this.messages.push(pending)
    if (!supabaseConfigured) {
      return
    }
    try {
      const uploaded = await uploadChatFile(chatId, author.id, file)
      const created = await supabase.from('messages').insert({ conversation_id: chatId, author_id: author.id, kind: uploaded.kind, body: caption }).select('id,created_at').single()
      if (created.error) throw created.error
      const attachment = await supabase.from('message_attachments').insert({ message_id: created.data.id, storage_path: uploaded.path, file_name: uploaded.name, mime_type: uploaded.mimeType, size_bytes: uploaded.size, duration_ms: durationMs ?? null })
      if (attachment.error) throw attachment.error
      const localAttachment: Message['attachment'] = { kind: uploaded.kind, caption: caption || uploaded.name, path: uploaded.path, url: previewUrl, fileName: uploaded.name, mimeType: uploaded.mimeType, size: uploaded.size, durationMs, uploading: false }
      const realtimeMessage = this.messages.find((message) => message.id === created.data.id)
      if (realtimeMessage) {
        realtimeMessage.attachment = localAttachment
        this.messages = this.messages.filter((message) => message.id !== temporaryId)
      } else {
        pending.id = created.data.id
        pending.ts = new Date(created.data.created_at).getTime()
        pending.attachment = localAttachment
      }
      await this.markRead(chatId, author.id)
    } catch (reason) {
      this.messages = this.messages.filter((message) => message.id !== temporaryId)
      URL.revokeObjectURL(previewUrl)
      throw reason
    }
  }

  async markRead(chatId: string, userId?: string) {
    const chat = this.chatById(chatId)
    if (chat) chat.unreadCount = 0
    const readAt = new Date().toISOString()
    this.readAtOverrides.set(chatId, Date.parse(readAt))
    if (supabaseConfigured) {
      let query = supabase
        .from('conversation_members')
        .update({ last_read_at: readAt })
        .eq('conversation_id', chatId)
      if (userId) query = query.eq('user_id', userId)
      const { error } = await query
      if (error) throw error
    }
  }

  createGroup(name: string, memberIds: string[], author: SessionUser, description?: string): Chat {
    const members: Member[] = [
      { id: author.id, name: author.name, initials: author.initials, color: author.color, role: 'admin' },
      ...memberIds.map((id) => {
        const c = CONTACTS.find((x) => x.id === id)!
        return { ...c, role: 'member' as const }
      }),
    ]
    const chat: Chat = {
      id: `chat${Date.now()}`,
      name,
      initials: initialsOf(name),
      color: '#128C7E',
      isGroup: true,
      memberIds: members.map((m) => m.id),
      memberCount: members.length,
      pinned: false,
      unreadCount: 0,
      inviteCode: randomCode(),
      description,
      mediaCount: 0,
    }
    this.chats.unshift(chat)
    this.extraMembers[chat.id] = members
    this.messages.push({
      id: `sys${Date.now()}`,
      chatId: chat.id,
      authorId: author.id,
      authorName: author.name,
      authorColor: author.color,
      text: 'Группа создана',
      ts: Date.now(),
      outgoing: true,
      status: 'sent',
    })
    return chat
  }

  async createGroupRemote(name: string, author: SessionUser, description?: string): Promise<Chat> {
    if (!supabaseConfigured) return this.createGroup(name, [], author, description)
    const { data, error } = await supabase.rpc('create_group', { group_name: name, group_description: description ?? null })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    const chat: Chat = {
      id: row.conversation_id, name, initials: initialsOf(name), color: '#128C7E', isGroup: true,
      memberIds: [author.id], memberCount: 1, pinned: false, unreadCount: 0,
      inviteCode: row.invite_code, description, mediaCount: 0,
    }
    this.chats.unshift(chat)
    this.extraMembers[chat.id] = [{ ...author, role: 'admin' }]
    return chat
  }

  resetInviteCode(chatId: string): string {
    const chat = this.chatById(chatId)
    if (!chat) return ''
    chat.inviteCode = randomCode()
    return chat.inviteCode
  }

  /** Гость вошёл по ссылке — попадает в участники чата. */
  addGuest(chatId: string, user: SessionUser) {
    const chat = this.chatById(chatId)
    if (!chat) return
    if (chat.memberIds.includes(user.id)) return
    chat.memberIds.push(user.id)
    chat.memberCount += 1
    const list = this.membersOf(chatId)
    this.extraMembers[chatId] = [
      ...list,
      { id: user.id, name: user.name, initials: user.initials, color: user.color, role: 'guest' },
    ]
  }

  leaveChat(chatId: string) {
    this.chats = this.chats.filter((c) => c.id !== chatId)
    this.messages = this.messages.filter((m) => m.chatId !== chatId)
    delete this.extraMembers[chatId]
  }

  clearLocalData() {
    this.chats = []
    this.messages = []
    this.extraMembers = {}
    this.readAtOverrides.clear()
    this.avatarUrlCache.clear()
    if (this.realtime) void supabase.removeChannel(this.realtime)
    if (this.reconciliationTimer) clearInterval(this.reconciliationTimer)
    this.realtime = null
    this.reconciliationTimer = null
    this.lastSyncAt = 0
  }

  togglePin(chatId: string) {
    const chat = this.chatById(chatId)
    if (chat) chat.pinned = !chat.pinned
  }

  async openDirect(otherUserId: string): Promise<string> {
    if (!supabaseConfigured) {
      const existing = this.chats.find((chat) => !chat.isGroup && chat.memberIds.includes(otherUserId))
      return existing?.id ?? ''
    }
    const { data, error } = await supabase.rpc('open_direct', { other_user: otherUserId })
    if (error) throw error
    return data as string
  }

  async renameGroup(chatId: string, name: string, description?: string) {
    const chat = this.chatById(chatId)
    if (!chat) throw new Error('Группа не найдена')
    const cleanName = name.trim()
    if (!cleanName) throw new Error('Введите название группы')
    if (supabaseConfigured) {
      const { error } = await supabase.rpc('rename_group', {
        target: chatId,
        new_name: cleanName,
        new_description: description?.trim() || null,
      })
      if (error) throw error
    }
    chat.name = cleanName
    chat.initials = initialsOf(cleanName)
    chat.description = description?.trim() || undefined
  }

  async deleteGroup(chatId: string) {
    if (supabaseConfigured) {
      const { error } = await supabase.rpc('delete_group', { target: chatId })
      if (error) throw error
    }
    this.chats = this.chats.filter((chat) => chat.id !== chatId)
    this.messages = this.messages.filter((message) => message.chatId !== chatId)
    delete this.extraMembers[chatId]
  }

  async setGroupAvatar(chatId: string, userId: string, file: File) {
    const chat = this.chatById(chatId)
    if (!chat) throw new Error('Группа не найдена')
    if (!supabaseConfigured) {
      chat.avatarUrl = URL.createObjectURL(file)
      return
    }
    const result = await uploadGroupAvatar(userId, chatId, file)
    chat.avatarPath = result.path
    chat.avatarUrl = result.url
    if (result.url) this.avatarUrlCache.set(result.path, { url: result.url, expiresAt: Date.now() + 50 * 60_000 })
  }

  syncFromSupabase(currentUser: SessionUser, force = false): Promise<void> {
    if (!supabaseConfigured) return Promise.resolve()
    if (this.syncPromise) return this.syncPromise
    if (!force && Date.now() - this.lastSyncAt < 30_000) return Promise.resolve()
    this.syncPromise = this.performSupabaseSync(currentUser).finally(() => {
      this.syncPromise = null
    })
    return this.syncPromise
  }

  private async performSupabaseSync(currentUser: SessionUser): Promise<void> {
    const visibleAvatars = new Map(this.chats.flatMap((chat) =>
      chat.avatarPath && chat.avatarUrl ? [[chat.avatarPath, chat.avatarUrl] as const] : [],
    ))
    const memberships = await supabase.from('conversation_members').select('conversation_id,pinned,last_read_at').eq('user_id', currentUser.id)
    if (memberships.error) throw memberships.error
    const ids = (memberships.data ?? []).map((row) => row.conversation_id)
    if (!ids.length) { this.chats = []; this.messages = []; return }
    const [conversations, memberRows, messageRows] = await Promise.all([
      supabase.from('conversations').select('*').in('id', ids),
      supabase.from('conversation_members').select('conversation_id,user_id,role').in('conversation_id', ids),
      supabase.from('messages').select('*').in('conversation_id', ids).is('deleted_at', null).order('created_at'),
    ])
    if (conversations.error) throw conversations.error
    const memberIds = [...new Set((memberRows.data ?? []).map((row) => row.user_id))]
    const profiles = memberIds.length ? await supabase.from('profiles').select('id,display_name,avatar_path').in('id', memberIds) : { data: [] }
    const profileMap = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]))
    const inviteRows = await supabase.from('group_invites').select('conversation_id,code').in('conversation_id', ids)
    const inviteMap = new Map((inviteRows.data ?? []).map((invite) => [invite.conversation_id, invite.code]))
    this.chats = (conversations.data ?? []).map((conversation) => {
      const members = (memberRows.data ?? []).filter((row) => row.conversation_id === conversation.id)
      const directOther = members.find((row) => row.user_id !== currentUser.id)
      const directProfile = directOther ? profileMap.get(directOther.user_id) : undefined
      const name = conversation.kind === 'direct' ? directProfile?.display_name ?? 'Личный чат' : conversation.name
      const membership = memberships.data?.find((row) => row.conversation_id === conversation.id)
      // A sync started before markRead can contain the old server value. Keep the
      // newer local cutoff so returning to the list cannot resurrect the badge.
      const lastReadAt = Math.max(
        new Date(membership?.last_read_at ?? 0).getTime(),
        this.readAtOverrides.get(conversation.id) ?? 0,
      )
      const unreadCount = (messageRows.data ?? []).filter((message) =>
        message.conversation_id === conversation.id &&
        message.author_id !== currentUser.id &&
        new Date(message.created_at).getTime() > lastReadAt
      ).length
      const avatarPath = conversation.avatar_path ?? undefined
      const cachedAvatar = avatarPath ? this.avatarUrlCache.get(avatarPath) : undefined
      return { id: conversation.id, name, initials: initialsOf(name), color: '#128C7E', isGroup: conversation.kind === 'group', memberIds: members.map((row) => row.user_id), memberCount: members.length, pinned: membership?.pinned ?? false, unreadCount, inviteCode: inviteMap.get(conversation.id) ?? '', description: conversation.description ?? undefined, mediaCount: 0, avatarPath, avatarUrl: cachedAvatar?.url ?? (avatarPath ? visibleAvatars.get(avatarPath) : undefined) }
    })
    await Promise.all(this.chats.map(async (chat) => {
      if (!chat.avatarPath) return
      const nextUrl = await this.signedAvatar(chat.avatarPath)
      if (!nextUrl || nextUrl === chat.avatarUrl) return
      // Do not replace the visible cached image until the refreshed signed URL
      // has decoded. Otherwise initials flash between the two image requests.
      if (await this.preloadImage(nextUrl)) chat.avatarUrl = nextUrl
    }))
    const memberAvatars = new Map(await Promise.all(memberIds.map(async (id): Promise<[string, string | undefined]> => {
      const path = profileMap.get(id)?.avatar_path
      return [id, path ? await this.signedAvatar(path) : undefined]
    })))
    this.extraMembers = Object.fromEntries(this.chats.map((chat) => [chat.id, (memberRows.data ?? []).filter((row) => row.conversation_id === chat.id).map((row) => {
      const profile = profileMap.get(row.user_id)
      const memberName = profile?.display_name ?? 'Участник'
      return { id: row.user_id, name: memberName, initials: initialsOf(memberName), color: row.user_id === currentUser.id ? currentUser.color : authorColorOf(row.user_id), role: row.role === 'owner' ? 'admin' : 'member', avatarUrl: memberAvatars.get(row.user_id) }
    })]))
    const attachmentMap = await this.loadAttachments((messageRows.data ?? []).map((message) => message.id))
    const remoteRows = new Map((messageRows.data ?? []).map((message) => [message.id, message]))
    this.messages = (messageRows.data ?? []).map((message) => {
      const replied = message.reply_to_id ? remoteRows.get(message.reply_to_id) : undefined
      const replyProfile = replied ? profileMap.get(replied.author_id) : undefined
      const quote = replied ? { messageId: replied.id, authorName: replyProfile?.display_name ?? 'Участник', text: replied.body || 'Вложение' } : undefined
      return this.mapRemoteMessage(message, profileMap, currentUser.id, attachmentMap.get(message.id), quote)
    })
    this.lastSyncAt = Date.now()
    this.subscribeRealtime(currentUser)
  }

  private mapRemoteMessage(message: Record<string, any>, profiles: Map<string, any>, currentUserId: string, attachment?: Message['attachment'], quote?: Quote): Message {
    const profile = profiles.get(message.author_id)
    return { id: message.id, chatId: message.conversation_id, authorId: message.author_id, authorName: profile?.display_name ?? 'Участник', authorColor: authorColorOf(message.author_id), text: message.body ?? '', ts: new Date(message.created_at).getTime(), outgoing: message.author_id === currentUserId, status: 'sent', attachment, quote }
  }

  private async quoteFor(message: Record<string, any>): Promise<Quote | undefined> {
    if (!message.reply_to_id) return undefined
    const local = this.messages.find((item) => item.id === message.reply_to_id)
    if (local) return { messageId: local.id, authorName: local.authorName, text: local.attachment?.caption || local.text }
    const { data } = await supabase.from('messages').select('id,author_id,body').eq('id', message.reply_to_id).maybeSingle()
    if (!data) return undefined
    const member = this.membersOf(message.conversation_id).find((item) => item.id === data.author_id)
    return { messageId: data.id, authorName: member?.name ?? 'Участник', text: data.body || 'Вложение' }
  }

  /** Подписанная ссылка на аватар с кешом — общая для чатов и участников. */
  private async signedAvatar(path: string): Promise<string | undefined> {
    const cached = this.avatarUrlCache.get(path)
    if (cached && cached.expiresAt > Date.now()) return cached.url
    const signed = await supabase.storage.from('avatars').createSignedUrl(path, 3600)
    const url = signed.data?.signedUrl
    if (url) this.avatarUrlCache.set(path, { url, expiresAt: Date.now() + 50 * 60_000 })
    return url
  }

  private preloadImage(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const image = new Image()
      image.onload = () => resolve(true)
      image.onerror = () => resolve(false)
      image.src = url
    })
  }

  private async loadAttachments(messageIds: string[]): Promise<Map<string, Message['attachment']>> {
    const result = new Map<string, Message['attachment']>()
    if (!messageIds.length) return result
    const { data, error } = await supabase.from('message_attachments').select('message_id,storage_path,file_name,mime_type,size_bytes,duration_ms').in('message_id', messageIds)
    if (error) return result
    await Promise.all((data ?? []).map(async (row) => {
      try {
        const url = await signedMediaUrl('chat-media', row.storage_path)
        const kind = row.mime_type.startsWith('image/') ? 'image' : row.mime_type.startsWith('video/') ? 'video' : row.mime_type.startsWith('audio/') ? 'voice' : 'document'
        result.set(row.message_id, { kind, caption: row.file_name, path: row.storage_path, url, fileName: row.file_name, mimeType: row.mime_type, size: Number(row.size_bytes), durationMs: row.duration_ms ?? undefined })
      } catch { /* Keep the text message visible if a signed URL cannot be created. */ }
    }))
    return result
  }

  private subscribeRealtime(currentUser: SessionUser) {
    if (this.realtime) void supabase.removeChannel(this.realtime)
    if (this.reconciliationTimer) clearInterval(this.reconciliationTimer)
    this.realtime = supabase.channel(`messages:${currentUser.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
      const row = payload.new as Record<string, any>
      if (!this.chats.some((chat) => chat.id === row.conversation_id) || this.messages.some((message) => message.id === row.id)) return
      const member = this.membersOf(row.conversation_id).find((item) => item.id === row.author_id)
      const profileMap = new Map([[row.author_id, { display_name: member?.name ?? 'Участник' }]])
      if (row.kind !== 'text') await new Promise((resolve) => setTimeout(resolve, 300))
      const attachments = await this.loadAttachments([row.id])
      const quote = await this.quoteFor(row)
      // The optimistic upload may have received the server id while realtime
      // was waiting for its attachment row. Check again to avoid a duplicate.
      if (this.messages.some((message) => message.id === row.id)) return
      this.messages.push(this.mapRemoteMessage(row, profileMap, currentUser.id, attachments.get(row.id), quote))
      if (row.author_id !== currentUser.id) {
        const chat = this.chatById(row.conversation_id)
        if (chat) chat.unreadCount += 1
      }
    }).subscribe()
    this.reconciliationTimer = setInterval(() => void this.reconcileMessages(currentUser), 5000)
  }

  private async reconcileMessages(currentUser: SessionUser) {
    const ids = this.chats.map((chat) => chat.id)
    if (!ids.length) return
    const newest = this.messages.reduce((max, message) => Math.max(max, message.ts), 0)
    let query = supabase.from('messages').select('*').in('conversation_id', ids).is('deleted_at', null).order('created_at')
    if (newest) query = query.gt('created_at', new Date(newest).toISOString())
    const { data, error } = await query
    if (error) return
    for (const row of data ?? []) {
      if (this.messages.some((message) => message.id === row.id)) continue
      const member = this.membersOf(row.conversation_id).find((item) => item.id === row.author_id)
      const profiles = new Map([[row.author_id, { display_name: member?.name ?? 'Участник' }]])
      const attachments = await this.loadAttachments([row.id])
      const quote = await this.quoteFor(row)
      // The optimistic item can acquire this id while the attachment and quote
      // requests are in flight. Do not append a second representation.
      if (this.messages.some((message) => message.id === row.id)) continue
      this.messages.push(this.mapRemoteMessage(row, profiles, currentUser.id, attachments.get(row.id), quote))
      if (row.author_id !== currentUser.id) {
        const chat = this.chatById(row.conversation_id)
        if (chat) chat.unreadCount += 1
      }
    }
  }
}
