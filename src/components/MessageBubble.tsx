import { Check, CheckCheck } from 'lucide-react'
import { formatTime } from '../lib/format'
import type { Message } from '../types'
import { VoiceMessage } from './VoiceMessage'

export function MessageBubble({
  message,
  showAuthor,
  onReply,
}: {
  message: Message
  showAuthor: boolean
  onReply: (m: Message) => void
}) {
  const out = message.outgoing
  return (
    <div className={`flex max-w-[80%] flex-col ${out ? 'self-end' : 'self-start'}`}>
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
        className="px-2.5 py-2 shadow-sm"
        style={{
          background: out ? 'var(--c-bubble-out)' : 'var(--c-bubble-in)',
          borderRadius: out ? '7.5px 0 7.5px 7.5px' : '0 7.5px 7.5px 7.5px',
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
          <div className="text-body whitespace-pre-wrap break-words text-ink">{message.text}</div>
        )}

        <div className="mt-0.5 flex items-center justify-end gap-1">
          <span className="text-[11px] text-faint">{formatTime(message.ts)}</span>
          {out &&
            (message.status === 'read' ? (
              <CheckCheck size={15} strokeWidth={1.8} style={{ color: 'var(--c-tick)' }} />
            ) : message.status === 'delivered' ? (
              <CheckCheck size={15} strokeWidth={1.8} className="text-faint" />
            ) : (
              <Check size={15} strokeWidth={1.8} className="text-faint" />
            ))}
        </div>
      </div>
    </div>
  )
}
