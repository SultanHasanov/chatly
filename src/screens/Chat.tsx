import { observer } from 'mobx-react-lite'
import {
  ArrowLeft,
  Camera,
  Mic,
  MoreVertical,
  Phone,
  Send,
  Smile,
  Video,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStores } from '../stores/RootStore'
import { Avatar } from '../components/Avatar'
import { MessageBubble } from '../components/MessageBubble'
import { MediaViewer } from '../components/MediaViewer'
import { MediaComposer } from '../components/MediaComposer'
import { Screen, ScrollArea } from '../components/Screen'
import { formatDayDivider, initialsOf } from '../lib/format'
import type { Message } from '../types'

/** Экраны 4 и 4b прототипа — тема переключается классом на <html>. */
export const Chat = observer(function Chat() {
  const { chatId } = useParams()
  const { chats, session } = useStores()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [openMedia, setOpenMedia] = useState<Message | null>(null)
  const [selectedMedia, setSelectedMedia] = useState<File[]>([])
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingStartedRef = useRef(0)
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [showEmojis, setShowEmojis] = useState(false)
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
    if (chat && session.user) {
      void chats.markRead(chat.id, session.user.id).catch(() => {
        // Keep the optimistic local state; the next successful open retries it.
      })
    }
  }, [chat, chats, list.length, session.user])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [list.length, replyTo])

  const scrollToEnd = () => requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'end' }))

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setRecordingSeconds(Math.floor((Date.now() - recordingStartedRef.current) / 1000)), 250)
    return () => window.clearInterval(timer)
  }, [recording])

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
  const memberById = new Map(members.map((member) => [member.id, member]))
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
              messageId: replyTo.id,
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

  const attach = async (file?: File, durationMs?: number) => {
    if (!file || !session.user) return
    try {
      setUploadError('')
      await chats.sendAttachment(chat.id, file, session.user, text.trim(), durationMs)
      setText('')
    } catch (reason) {
      setUploadError(reason instanceof Error ? reason.message : 'Не удалось отправить файл')
    }
  }

  const sendSelectedMedia = (files: File[], caption: string) => {
    if (!session.user) return
    setSelectedMedia([])
    setUploadError('')
    const uploads = files.map((file, index) => chats.sendAttachment(chat.id, file, session.user!, index === 0 ? caption : ''))
    setText('')
    void Promise.all(uploads).catch((reason) => {
      setUploadError(reason instanceof Error ? reason.message : 'Не удалось отправить медиа')
    })
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
        const mimeType = recorder.mimeType.startsWith('audio/webm') ? 'audio/webm' : recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const durationMs = Date.now() - recordingStartedRef.current
        stream.getTracks().forEach((track) => track.stop())
        void attach(new File([blob], `voice-${Date.now()}.webm`, { type: blob.type }), durationMs)
      }
      recorderRef.current = recorder
      recorder.start()
      recordingStartedRef.current = Date.now()
      setRecordingSeconds(0)
      setShowEmojis(false)
      setRecording(true)
    } catch {
      setUploadError('Нет доступа к микрофону')
    }
  }

  const emojis = ['😀', '😂', '🥰', '😍', '😊', '😉', '😎', '🤔', '😢', '😭', '😡', '👍', '👎', '👏', '🙏', '❤️', '🔥', '🎉', '💯', '✅', '👋', '🤝', '💪', '✨']

  let lastDay = ''

  return (
    <Screen className="chat-doodle">
      <header
        className="flex shrink-0 items-center gap-3 px-3 pt-1.5 pb-2.5"
        style={{ background: 'var(--c-bar)' }}
      >
        <button type="button" aria-label="Назад" className="tap" onClick={() => navigate('/chats')}>
          <ArrowLeft size={22} strokeWidth={2} className="text-ink" />
        </button>
        <button
          type="button"
          className="tap flex min-w-0 flex-1 items-center gap-2.5 text-left"
          onClick={() => navigate(`/chats/${chat.id}/info`)}
        >
          <Avatar initials={chat.initials} color={chat.color} size={40} fontSize={15} src={chat.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-item font-semibold text-ink">{chat.name}</div>
            <div className="truncate text-meta text-muted">{subtitle}</div>
          </div>
        </button>
        <button type="button" aria-label="Видеозвонок" className="tap">
          <Video size={22} strokeWidth={1.7} className="text-ink" />
        </button>
        <button type="button" aria-label="Звонок" className="tap">
          <Phone size={20} strokeWidth={1.7} className="text-ink" />
        </button>
        <button
          type="button"
          aria-label="Ещё"
          className="tap"
          onClick={() => navigate(`/chats/${chat.id}/info`)}
        >
          <MoreVertical size={18} strokeWidth={2.4} className="text-ink" />
        </button>
      </header>

      <ScrollArea className="flex flex-col gap-1 px-3.5 py-2.5">
        {list.map((m, i) => {
          const day = formatDayDivider(m.ts)
          const divider = day !== lastDay
          lastDay = day
          const prev = list[i - 1]
          const firstOfRun = divider || prev?.authorId !== m.authorId
          const groupIncoming = chat.isGroup && !m.outgoing
          const author = memberById.get(m.authorId)
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
                showAuthor={chat.isGroup && firstOfRun}
                showTail={firstOfRun}
                avatar={
                  groupIncoming && firstOfRun
                    ? {
                        initials: author?.initials ?? initialsOf(m.authorName),
                        color: m.authorColor,
                        src: author?.avatarUrl,
                      }
                    : undefined
                }
                reserveAvatar={groupIncoming && !firstOfRun}
                onReply={setReplyTo}
                onOpenMedia={setOpenMedia}
                onMediaLoad={m.outgoing ? scrollToEnd : undefined}
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
        {showEmojis && (
          <div className="mb-2 grid grid-cols-8 gap-1 rounded-2xl p-2 shadow-lg" style={{ background: 'var(--c-bar)' }}>
            {emojis.map((emoji) => <button key={emoji} type="button" className="tap flex h-9 items-center justify-center rounded-lg text-[23px]" onClick={() => { setText((value) => value + emoji); setShowEmojis(false) }}>{emoji}</button>)}
          </div>
        )}
        {recording && <div className="mb-1 flex items-center justify-center gap-2 text-note" style={{ color: 'var(--c-danger)' }}><span className="h-2 w-2 animate-pulse rounded-full bg-current" />Запись {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')} · нажмите микрофон для отправки</div>}
        <form
          autoComplete="off"
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); void send() }}
        >
          <div
            className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-[24px] pr-3.5 pl-3"
            style={{ background: 'var(--c-bar)' }}
          >
            <button type="button" aria-label="Эмодзи" className="tap shrink-0" onClick={() => setShowEmojis((value) => !value)}>
              <Smile size={24} strokeWidth={1.6} className="text-muted" />
            </button>
            <input
              type="text"
              name="msg"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-form-type="other"
              data-lpignore="true"
              autoCapitalize="sentences"
              enterKeyHint="send"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void send()
              }}
              placeholder="Сообщение"
              className="min-w-0 flex-1 text-body placeholder:text-faint"
            />
            <button type="button" aria-label="Выбрать фото или видео" className="tap shrink-0" onClick={() => fileRef.current?.click()}>
              <Camera size={22} strokeWidth={1.6} className="text-muted" />
            </button>
          </div>
          <input ref={fileRef} hidden multiple type="file" accept="image/*,video/*" onChange={(e) => { setSelectedMedia(Array.from(e.target.files ?? [])); e.currentTarget.value = '' }} />
          <button
            type="button"
            aria-label={text ? 'Отправить' : 'Голосовое сообщение'}
            onClick={text ? () => void send() : () => void toggleRecording()}
            className="tap flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent"
          >
            {text ? (
              <Send size={20} strokeWidth={1.9} color="#fff" />
            ) : (
              <Mic size={20} strokeWidth={1.7} color="#fff" />
            )}
          </button>
        </form>
      </div>
      {openMedia && <MediaViewer message={openMedia} onClose={() => setOpenMedia(null)} />}
      {selectedMedia.length > 0 && <MediaComposer files={selectedMedia} onClose={() => setSelectedMedia([])} onSend={sendSelectedMedia} />}
    </Screen>
  )
})
