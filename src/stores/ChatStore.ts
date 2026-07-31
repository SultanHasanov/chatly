import { makeAutoObservable } from 'mobx'
import { loadState, persist } from '../lib/persist'
import { CONTACTS, DESIGN_TEAM_MEMBERS, seedChats, seedMessages } from '../data/mock'
import { initialsOf, randomCode } from '../lib/format'
import type { Chat, Member, Message, Quote, SessionUser } from '../types'
import { supabase, supabaseConfigured } from '../lib/supabase'
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

  constructor() {
    makeAutoObservable(this)
    const saved = loadState<Snapshot>('chats')
    if (saved && !supabaseConfigured) {
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
    return this.messages.filter((m) => m.chatId === chatId).sort((a, b) => a.ts - b.ts)
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

  sendMessage(chatId: string, text: string, author: SessionUser, quote?: Quote) {
    const body = text.trim()
    if (!body) return
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
    this.markRead(chatId)
    if (supabaseConfigured) {
      void supabase.from('messages').insert({ conversation_id: chatId, author_id: author.id, kind: 'text', body })
    }
  }

  async sendAttachment(chatId: string, file: File, author: SessionUser, caption = '') {
    if (!supabaseConfigured) {
      this.messages.push({
        id: `m${Date.now()}`, chatId, authorId: author.id, authorName: author.name,
        authorColor: author.color, text: caption, ts: Date.now(), outgoing: true, status: 'sent',
        attachment: { kind: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'voice' : 'document', caption: caption || file.name, fileName: file.name, mimeType: file.type, size: file.size, url: URL.createObjectURL(file) },
      })
      return
    }
    const uploaded = await uploadChatFile(chatId, author.id, file)
    const created = await supabase.from('messages').insert({ conversation_id: chatId, author_id: author.id, kind: uploaded.kind, body: caption }).select('id,created_at').single()
    if (created.error) throw created.error
    const attachment = await supabase.from('message_attachments').insert({ message_id: created.data.id, storage_path: uploaded.path, file_name: uploaded.name, mime_type: uploaded.mimeType, size_bytes: uploaded.size })
    if (attachment.error) throw attachment.error
  }

  markRead(chatId: string) {
    const chat = this.chatById(chatId)
    if (chat) chat.unreadCount = 0
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
  }

  async syncFromSupabase(currentUser: SessionUser) {
    if (!supabaseConfigured) return
    const memberships = await supabase.from('conversation_members').select('conversation_id,pinned').eq('user_id', currentUser.id)
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
      return { id: conversation.id, name, initials: initialsOf(name), color: '#128C7E', isGroup: conversation.kind === 'group', memberIds: members.map((row) => row.user_id), memberCount: members.length, pinned: memberships.data?.find((row) => row.conversation_id === conversation.id)?.pinned ?? false, unreadCount: 0, inviteCode: inviteMap.get(conversation.id) ?? '', description: conversation.description ?? undefined, mediaCount: 0, avatarPath: conversation.avatar_path ?? undefined }
    })
    await Promise.all(this.chats.map(async (chat) => {
      if (!chat.avatarPath) return
      const signed = await supabase.storage.from('avatars').createSignedUrl(chat.avatarPath, 3600)
      chat.avatarUrl = signed.data?.signedUrl
    }))
    this.extraMembers = Object.fromEntries(this.chats.map((chat) => [chat.id, (memberRows.data ?? []).filter((row) => row.conversation_id === chat.id).map((row) => {
      const profile = profileMap.get(row.user_id)
      const memberName = profile?.display_name ?? 'Участник'
      return { id: row.user_id, name: memberName, initials: initialsOf(memberName), color: row.user_id === currentUser.id ? currentUser.color : '#5B8DEF', role: row.role === 'owner' ? 'admin' : 'member' }
    })]))
    this.messages = (messageRows.data ?? []).map((message) => this.mapRemoteMessage(message, profileMap, currentUser.id))
    this.subscribeRealtime(currentUser)
  }

  private mapRemoteMessage(message: Record<string, any>, profiles: Map<string, any>, currentUserId: string): Message {
    const profile = profiles.get(message.author_id)
    return { id: message.id, chatId: message.conversation_id, authorId: message.author_id, authorName: profile?.display_name ?? 'Участник', authorColor: '#5B8DEF', text: message.body ?? '', ts: new Date(message.created_at).getTime(), outgoing: message.author_id === currentUserId, status: 'sent' }
  }

  private subscribeRealtime(currentUser: SessionUser) {
    if (this.realtime) void supabase.removeChannel(this.realtime)
    this.realtime = supabase.channel(`messages:${currentUser.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
      const row = payload.new as Record<string, any>
      if (!this.chats.some((chat) => chat.id === row.conversation_id) || this.messages.some((message) => message.id === row.id)) return
      const member = this.membersOf(row.conversation_id).find((item) => item.id === row.author_id)
      const profileMap = new Map([[row.author_id, { display_name: member?.name ?? 'Участник' }]])
      this.messages.push(this.mapRemoteMessage(row, profileMap, currentUser.id))
    }).subscribe()
  }
}
