import { observer } from 'mobx-react-lite'
import { Camera, ChevronLeft, Mic, MoreVertical, Paperclip, Send, Video, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStores } from '../stores/RootStore'
import { Avatar } from '../components/Avatar'
import { MessageBubble } from '../components/MessageBubble'
import { Screen, ScrollArea } from '../components/Screen'
import { formatDayDivider } from '../lib/format'
import type { Message } from '../types'

/** Экраны 4 и 4b прототипа — тема переключается классом на <html>. */
export const Chat = observer(function Chat() {
  const { chatId } = useParams()
  const { chats, session } = useStores()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [recording, setRecording] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [loadingChat, setLoadingChat] = useState(false)
  const loadAttemptedRef = useRef<string | null>(null)

  const chat = chats.chatById(chatId)
  const list = chat ? chats.messagesOf(chat.id) : []

  useEffect(() => {
    if (chat || !chatId || !session.user || loadAttemptedRef.current === chatId) return
    loadAttemptedRef.current = chatId
    setLoadingChat(true)
    void chats.syncFromSupabase(session.user).catch(() => undefined).finally(() => setLoadingChat(false))
  }, [chat, chatId, chats, session.user])

  useEffect(() => {
    if (chat) chats.markRead(chat.id)
  }, [chat, chats, list.length])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [list.length, replyTo])

  if (!chat) {
    return (
      <Screen>
        <div className="flex h-full items-center justify-center text-label text-muted">
          {loadingChat ? 'Загрузка чата…' : 'Чат не найден или доступ к нему закрыт'}
        </div>
      </Screen>
    )
  }

  const members = chats.membersOf(chat.id)
  const subtitle = chat.isGroup
    ? `${members
        .filter((m) => m.id !== session.user?.id)
        .slice(0, 3)
        .map((m) => m.name.split(' ')[0])
        .join(', ')}, вы${
        chat.memberCount > 4 ? ` +${chat.memberCount - 4}` : ''
      }`
    : 'в сети'

  const send = async () => {
    if (!session.user) return
    try {
      setUploadError('')
      await chats.sendMessage(
        chat.id,
        text,
        session.user,
        replyTo
          ? {
              authorName: replyTo.authorName.split(' ')[0],
              text: replyTo.attachment ? replyTo.attachment.caption : replyTo.text,
            }
          : undefined,
      )
      setText('')
      setReplyTo(null)
    } catch (reason) {
      setUploadError(reason instanceof Error ? reason.message : 'Не удалось отправить сообщение')
    }
  }

  const attach = async (file?: File) => {
    if (!file || !session.user) return
    try {
      setUploadError('')
      await chats.sendAttachment(chat.id, file, session.user, text.trim())
      setText('')
    } catch (reason) {
      setUploadError(reason instanceof Error ? reason.message : 'Не удалось отправить файл')
    }
  }

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop()
      setRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => event.data.size && chunksRef.current.push(event.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        stream.getTracks().forEach((track) => track.stop())
        void attach(new File([blob], `voice-${Date.now()}.webm`, { type: blob.type }))
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      setUploadError('Нет доступа к микрофону')
    }
  }

  let lastDay = ''

  return (
    <Screen className="bg-chat">
      <header
        className="flex shrink-0 items-center gap-2.5 border-b border-divider bg-bar px-3.5 pt-1.5 pb-2.5"
        style={{ background: 'var(--c-bar)' }}
      >
        <button type="button" aria-label="Назад" className="tap" onClick={() => navigate('/chats')}>
          <ChevronLeft size={22} strokeWidth={2} style={{ color: 'var(--c-accent-deep)' }} />
        </button>
        <button
          type="button"
          className="tap flex min-w-0 flex-1 items-center gap-2.5 text-left"
          onClick={() => navigate(`/chats/${chat.id}/info`)}
        >
          <Avatar initials={chat.initials} color={chat.color} size={38} fontSize={14} src={chat.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-item font-semibold text-ink">{chat.name}</div>
            <div className="truncate text-meta text-muted">{subtitle}</div>
          </div>
        </button>
        <button type="button" aria-label="Видеозвонок" className="tap">
          <Video size={20} strokeWidth={1.7} style={{ color: 'var(--c-accent-deep)' }} />
        </button>
        <button
          type="button"
          aria-label="Ещё"
          className="tap"
          onClick={() => navigate(`/chats/${chat.id}/info`)}
        >
          <MoreVertical size={18} strokeWidth={2.4} style={{ color: 'var(--c-accent-deep)' }} />
        </button>
      </header>

      <ScrollArea className="flex flex-col gap-2 px-3.5 py-2.5">
        {list.map((m, i) => {
          const day = formatDayDivider(m.ts)
          const divider = day !== lastDay
          lastDay = day
          const prev = list[i - 1]
          return (
            <div key={m.id} className="contents">
              {divider && (
                <div
                  className="my-1 self-center rounded-lg px-3 py-1 text-meta font-semibold"
                  style={{ background: 'var(--c-chip)', color: 'var(--c-chip-text)' }}
                >
                  {day}
                </div>
              )}
              <MessageBubble
                message={m}
                showAuthor={chat.isGroup && (divider || prev?.authorId !== m.authorId)}
                onReply={setReplyTo}
              />
            </div>
          )
        })}
        <div ref={endRef} />
      </ScrollArea>

      <div
        className="shrink-0 px-3 pt-1.5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
      >
        {replyTo && (
          <div
            className="mb-1.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5"
            style={{ background: 'var(--c-bar)', borderLeft: '3px solid var(--c-accent-deep)' }}
          >
            <div className="min-w-0 flex-1">
              <div className="text-meta font-semibold" style={{ color: 'var(--c-accent-deep)' }}>
                {replyTo.authorName.split(' ')[0]}
              </div>
              <div className="truncate text-note text-muted">
                {replyTo.attachment ? replyTo.attachment.caption : replyTo.text}
              </div>
            </div>
            <button type="button" aria-label="Отменить ответ" onClick={() => setReplyTo(null)}>
              <X size={18} className="text-muted" />
            </button>
          </div>
        )}

        {uploadError && <div className="mb-1 text-center text-note" style={{ color: 'var(--c-danger)' }}>{uploadError}</div>}
        {recording && <div className="mb-1 text-center text-note text-muted">Идёт запись… нажмите ещё раз для отправки</div>}
        <div className="flex items-center gap-2.5">
          <button type="button" aria-label="Вложение" className="tap" onClick={() => fileRef.current?.click()}>
            <Paperclip size={24} strokeWidth={1.6} className="text-muted" />
          </button>
          <input ref={fileRef} hidden type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt" onChange={(e) => void attach(e.target.files?.[0])} />
          <input
            name="chat-message"
            autoComplete="off"
            autoCapitalize="sentences"
            enterKeyHint="send"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void send()
            }}
            placeholder="Сообщение"
            className="h-10 flex-1 rounded-full px-3.5 text-body placeholder:text-faint"
            style={{ background: 'var(--c-bar)' }}
          />
          {!text && (
            <button type="button" aria-label="Камера" className="tap">
              <Camera size={22} strokeWidth={1.6} className="text-muted" />
            </button>
          )}
          <button
            type="button"
            aria-label={text ? 'Отправить' : 'Голосовое сообщение'}
            onClick={text ? () => void send() : () => void toggleRecording()}
            className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent"
          >
            {text ? (
              <Send size={18} strokeWidth={1.9} color="#fff" />
            ) : (
              <Mic size={18} strokeWidth={1.7} color="#fff" />
            )}
          </button>
        </div>
      </div>
    </Screen>
  )
})
