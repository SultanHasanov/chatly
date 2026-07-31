import { CheckCheck, Pin } from 'lucide-react'
import { Avatar } from './Avatar'
import { formatChatTime } from '../lib/format'
import type { Chat, Message } from '../types'

export function ChatRow({
  chat,
  preview,
  last,
  onClick,
}: {
  chat: Chat
  preview: string
  last?: Message
  onClick: () => void
}) {
  const unread = chat.unreadCount > 0
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap flex w-full items-center gap-3 border-b border-divider-soft px-5 py-2.5 text-left"
    >
      <Avatar initials={chat.initials} color={chat.color} size={49} fontSize={17} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {chat.pinned && <Pin size={12} className="shrink-0 text-faint" strokeWidth={1.8} />}
          <div className="truncate text-title font-medium text-ink">{chat.name}</div>
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          {last?.outgoing && last.status === 'read' && (
            <CheckCheck size={16} strokeWidth={1.8} style={{ color: 'var(--c-accent-deep)' }} />
          )}
          <div className="truncate text-body text-muted">{preview}</div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div
          className="text-meta"
          style={{ color: unread ? 'var(--c-accent)' : 'var(--c-text-muted)' }}
        >
          {last ? formatChatTime(last.ts) : ''}
        </div>
        {unread && (
          <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-meta font-semibold text-white">
            {chat.unreadCount}
          </div>
        )}
      </div>
    </button>
  )
}
