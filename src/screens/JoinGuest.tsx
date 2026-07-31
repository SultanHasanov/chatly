import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStores } from '../stores/RootStore'
import { Avatar } from '../components/Avatar'
import { Screen } from '../components/Screen'
import { ensureAnonymousSession, supabase, supabaseConfigured } from '../lib/supabase'
import type { Chat as ChatModel } from '../types'

/** Экран 8 прототипа. */
export const JoinGuest = observer(function JoinGuest() {
  const { code = '' } = useParams()
  const { chats, session } = useStores()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [remoteChat, setRemoteChat] = useState<ChatModel | null>(null)
  const [loading, setLoading] = useState(supabaseConfigured)
  const [error, setError] = useState('')

  const localChat = chats.chatByInviteCode(code)
  const chat = localChat ?? remoteChat ?? undefined

  useEffect(() => {
    if (!supabaseConfigured || localChat) return
    void (async () => {
      try {
        await ensureAnonymousSession()
        const { data, error: previewError } = await supabase.rpc('preview_invite', { invite_code: code })
        if (previewError) throw previewError
        const row = Array.isArray(data) ? data[0] : data
        if (row) setRemoteChat({ id: row.conversation_id, name: row.name, initials: row.name.slice(0, 2).toUpperCase(), color: '#128C7E', isGroup: true, memberIds: [], memberCount: Number(row.member_count), pinned: false, unreadCount: 0, inviteCode: code, mediaCount: 0 })
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Не удалось открыть приглашение')
      } finally { setLoading(false) }
    })()
  }, [code, localChat])

  if (loading) return <Screen><div className="flex h-full items-center justify-center text-label text-muted">Загрузка приглашения…</div></Screen>

  if (!chat) {
    return (
      <Screen>
        <div className="flex h-full flex-col items-center justify-center gap-3 px-10 text-center">
          <div className="text-[20px] font-bold text-ink">{error || 'Ссылка недействительна'}</div>
          <p className="text-body text-muted">Попросите отправить новую ссылку-приглашение</p>
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="tap mt-4 text-body font-medium"
            style={{ color: 'var(--c-accent-deep)' }}
          >
            На главную
          </button>
        </div>
      </Screen>
    )
  }

  const join = async () => {
    if (!name.trim()) return
    if (supabaseConfigured) {
      try {
        const auth = await ensureAnonymousSession(name.trim())
        const joined = await supabase.rpc('join_group', { invite_code: code, guest_name: name.trim() })
        if (joined.error) throw joined.error
        session.useAnonymousUser(auth.user.id, name.trim(), chat.id)
        if (!chats.chatById(chat.id)) chats.chats.unshift(chat)
        navigate('/chats', { replace: true })
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось вступить') }
      return
    }
    session.loginAsGuest(name.trim(), chat.id)
    if (session.user) chats.addGuest(chat.id, session.user)
    navigate('/chats', { replace: true })
  }

  return (
    <Screen>
      <div className="flex flex-1 flex-col items-center gap-3 px-8 pt-16">
        <Avatar initials={chat.initials} color={chat.color} size={88} fontSize={28} />
        <div className="text-[20px] font-bold text-ink">{chat.name}</div>
        <div className="text-label text-muted">{chat.memberCount} участников</div>

        <div className="h-7" />

        <label className="w-full">
          <span className="mb-1.5 block text-note text-muted">Ваше имя</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void join()}
            placeholder="Например, Ольга"
            className="h-12 w-full rounded-[10px] border border-divider px-3.5 text-item placeholder:text-faint"
          />
        </label>

        <div className="h-4" />

        <button
          type="button"
          onClick={() => void join()}
          disabled={!name.trim()}
          className="tap h-[52px] w-full rounded-xl text-title font-semibold"
          style={{
            background: name.trim() ? 'var(--c-accent)' : 'var(--c-disabled)',
            color: name.trim() ? '#fff' : 'var(--c-disabled-text)',
          }}
        >
          Войти в группу
        </button>

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="tap mt-2 text-label font-medium"
          style={{ color: 'var(--c-accent-deep)' }}
        >
          Войти через Telegram вместо этого
        </button>
      </div>
    </Screen>
  )
})
