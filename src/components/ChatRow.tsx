import { Camera, Check, CheckCheck, FileText, Mic, Pin, Video } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Avatar } from './Avatar'
import { formatChatTime } from '../lib/format'
import type { Chat, Message } from '../types'

const ATTACHMENT_ICON: Record<string, LucideIcon> = {
  image: Camera,
  video: Video,
  voice: Mic,
  document: FileText,
}

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
  const AttachmentIcon = last?.attachment ? ATTACHMENT_ICON[last.attachment.kind] : undefined
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap flex w-full items-center gap-3 px-4 py-2.5 text-left"
    >
      <Avatar initials={chat.initials} color={chat.color} size={56} fontSize={20} src={chat.avatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-title font-semibold text-ink">{chat.name}</div>
        <div className="mt-0.5 flex items-center gap-1">
          {last?.outgoing &&
            (last.status === 'read' ? (
              <CheckCheck size={16} strokeWidth={1.8} className="shrink-0" style={{ color: 'var(--c-tick)' }} />
            ) : (
              <Check size={16} strokeWidth={1.8} className="shrink-0 text-faint" />
            ))}
          {AttachmentIcon && (
            <AttachmentIcon size={15} strokeWidth={1.8} className="shrink-0" style={{ color: 'var(--c-tick)' }} />
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
        {unread ? (
          <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-meta font-semibold text-white">
            {chat.unreadCount}
          </div>
        ) : (
          chat.pinned && <Pin size={14} className="text-faint" strokeWidth={1.8} />
        )}
      </div>
    </button>
  )
}
