import { ArrowLeft, Download } from 'lucide-react'
import type { Message } from '../types'
import { formatTime } from '../lib/format'

export function MediaViewer({ message, onClose }: { message: Message; onClose: () => void }) {
  const media = message.attachment
  if (!media?.url) return null
  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Просмотр изображения">
      <header className="flex shrink-0 items-center gap-3 bg-[#0b141a] px-3 pt-[calc(env(safe-area-inset-top)+8px)] pb-3">
        <button type="button" aria-label="Закрыть" onClick={onClose} className="tap p-1"><ArrowLeft size={25} /></button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-item font-semibold">{message.outgoing ? 'Вы' : message.authorName}</div>
          <div className="text-note text-[#aebac1]">{formatTime(message.ts)}</div>
        </div>
        <a href={media.url} download={media.fileName || 'photo'} aria-label="Скачать изображение" className="tap p-2"><Download size={23} /></a>
      </header>
      <button type="button" onClick={onClose} className="flex min-h-0 flex-1 items-center justify-center bg-black p-0">
        <img src={media.url} alt={media.caption || 'Изображение'} className="max-h-full max-w-full object-contain" />
      </button>
    </div>
  )
}
