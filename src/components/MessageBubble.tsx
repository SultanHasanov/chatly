import { Check, CheckCheck, Reply } from 'lucide-react'
import { useRef, useState } from 'react'
import { formatTime } from '../lib/format'
import type { Message } from '../types'
import { Avatar } from './Avatar'
import { VoiceMessage } from './VoiceMessage'

const AVATAR_SIZE = 28

export function MessageBubble({
  message,
  showAuthor,
  avatar,
  reserveAvatar = false,
  showTail = true,
  onReply,
}: {
  message: Message
  showAuthor: boolean
  /** Аватар автора: только у первого входящего сообщения серии в группе. */
  avatar?: { initials: string; color: string; src?: string }
  /** Продолжение серии: место под аватар держим, сам аватар не рисуем. */
  reserveAvatar?: boolean
  showTail?: boolean
  onReply: (m: Message) => void
}) {
  const out = message.outgoing
  const gesture = useRef({ x: 0, y: 0 })
  const [swipeX, setSwipeX] = useState(0)

  const finishSwipe = () => {
    if (swipeX >= 48) onReply(message)
    setSwipeX(0)
  }

  const metadata = (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] text-faint">
      <span>{formatTime(message.ts)}</span>
      {out && (message.status === 'read' ? (
        <CheckCheck size={15} strokeWidth={1.8} style={{ color: 'var(--c-tick)' }} />
      ) : message.status === 'delivered' ? (
        <CheckCheck size={15} strokeWidth={1.8} className="text-faint" />
      ) : (
        <Check size={15} strokeWidth={1.8} className="text-faint" />
      ))}
    </span>
  )

  return (
    <div
      className={`relative flex max-w-[80%] items-start gap-1.5 ${out ? 'self-end' : 'self-start'}`}
      style={{ transform: `translateX(${swipeX}px)`, transition: swipeX ? 'none' : 'transform 160ms ease', touchAction: 'pan-y' }}
      onPointerDown={(event) => { gesture.current = { x: event.clientX, y: event.clientY } }}
      onPointerMove={(event) => {
        const dx = event.clientX - gesture.current.x
        const dy = event.clientY - gesture.current.y
        if (dx > 0 && Math.abs(dx) > Math.abs(dy)) setSwipeX(Math.min(64, dx))
      }}
      onPointerUp={finishSwipe}
      onPointerCancel={() => setSwipeX(0)}
      onContextMenu={(event) => { event.preventDefault(); onReply(message) }}
    >
      <span className="pointer-events-none absolute top-1/2 -left-8 -translate-y-1/2" style={{ color: 'var(--c-accent-deep)', opacity: Math.min(1, swipeX / 40) }}>
        <Reply size={22} />
      </span>
      {avatar ? (
        <Avatar
          initials={avatar.initials}
          color={avatar.color}
          size={AVATAR_SIZE}
          fontSize={11}
          src={avatar.src}
        />
      ) : (
        reserveAvatar && <div className="shrink-0" style={{ width: AVATAR_SIZE }} />
      )}
      <div className="flex min-w-0 flex-col">
        {!out && showAuthor && (
          <div
            className="mb-0.5 ml-1 text-note font-semibold"
            style={{ color: message.authorColor }}
          >
            {message.authorName.split(' ')[0]}
          </div>
        )}
        <div
          onDoubleClick={() => onReply(message)}
          className="px-2.5 py-1.5 shadow-sm"
          style={{
            background: out ? 'var(--c-bubble-out)' : 'var(--c-bubble-in)',
            borderRadius: showTail
              ? out
                ? '7.5px 0 7.5px 7.5px'
                : '0 7.5px 7.5px 7.5px'
              : '7.5px',
            padding: message.attachment ? 6 : undefined,
          }}
        >
        {message.quote && (
          <div
            className="mb-1.5 rounded-md px-2 py-1.5"
            style={{
              background: 'var(--c-quote)',
              borderLeft: '3px solid var(--c-accent-deep)',
            }}
          >
            <div className="text-meta font-semibold" style={{ color: 'var(--c-accent-deep)' }}>
              {message.quote.authorName}
            </div>
            <div className="truncate text-note text-muted">{message.quote.text}</div>
          </div>
        )}

        {message.attachment?.kind === 'image' && message.attachment.url ? (
          <img src={message.attachment.url} alt={message.attachment.caption} className="max-h-[320px] w-[220px] rounded-lg object-cover" />
        ) : message.attachment?.kind === 'video' && message.attachment.url ? (
          <video src={message.attachment.url} controls preload="metadata" className="max-h-[320px] w-[240px] rounded-lg" />
        ) : message.attachment?.kind === 'voice' && message.attachment.url ? (
          <VoiceMessage url={message.attachment.url} durationMs={message.attachment.durationMs} />
        ) : message.attachment?.kind === 'document' ? (
          <a href={message.attachment.url} download={message.attachment.fileName} className="block max-w-[240px] rounded-lg bg-field p-3 text-body font-medium text-ink">
            📎 {message.attachment.fileName || message.attachment.caption}
          </a>
        ) : message.attachment ? (
          <div
            className="flex h-[140px] w-[220px] items-center justify-center rounded-lg font-mono text-caption text-faint"
            style={{
              background:
                'repeating-linear-gradient(45deg, var(--c-bg-field), var(--c-bg-field) 10px, var(--c-divider) 10px, var(--c-divider) 20px)',
            }}
          >
            {message.attachment.caption}
          </div>
        ) : (
          <div className="text-body leading-[1.35] whitespace-pre-wrap break-words text-ink">
            <span>{message.text}</span>
            <span className="ml-2 inline-flex translate-y-[2px] align-baseline">{metadata}</span>
          </div>
        )}

        {message.attachment && <div className="mt-0.5 flex justify-end">{metadata}</div>}
        </div>
      </div>
    </div>
  )
}
