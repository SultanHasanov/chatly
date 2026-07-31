import { Check, Image as ImageIcon, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export function MediaComposer({ files, onClose, onSend }: {
  files: File[]
  onClose: () => void
  onSend: (files: File[], caption: string) => void
}) {
  const [selected, setSelected] = useState(0)
  const [caption, setCaption] = useState('')
  const [hd, setHd] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files])
  const current = previews[selected] ?? previews[0]

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews])
  if (!current) return null

  const prepareAndSend = async () => {
    if (preparing) return
    setPreparing(true)
    const prepared = hd ? files : await Promise.all(files.map(async (file) => {
      if (file.type !== 'image/jpeg') return file
      try {
        const bitmap = await createImageBitmap(file)
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
        if (scale === 1) { bitmap.close(); return file }
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(bitmap.width * scale)
        canvas.height = Math.round(bitmap.height * scale)
        canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        bitmap.close()
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
        return blob ? new File([blob], file.name, { type: 'image/jpeg', lastModified: file.lastModified }) : file
      } catch { return file }
    }))
    onSend(prepared, caption.trim())
  }

  return (
    <div className="fixed inset-0 z-[130] flex flex-col bg-[#080d10] text-white" role="dialog" aria-modal="true" aria-label="Предпросмотр медиа">
      <header className="flex shrink-0 items-center justify-between bg-[#0b141a] px-3 pt-[calc(env(safe-area-inset-top)+8px)] pb-3">
        <button type="button" aria-label="Отменить" onClick={onClose} className="tap p-2"><X size={27} /></button>
        <div className="text-title font-semibold">Выбрано: {files.length}</div>
        <button type="button" aria-pressed={hd} onClick={() => setHd((value) => !value)} className="tap flex h-9 items-center gap-1 rounded-lg border px-2 text-note font-bold" style={{ borderColor: hd ? 'var(--c-accent)' : '#8696a0', color: hd ? 'var(--c-accent)' : '#e9edef' }}>
          HD {hd && <Check size={14} />}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
        {current.file.type.startsWith('video/') ? (
          <video key={current.url} src={current.url} controls className="max-h-full max-w-full object-contain" />
        ) : (
          <img key={current.url} src={current.url} alt="Предпросмотр" className="max-h-full max-w-full object-contain" />
        )}
      </div>

      {previews.length > 1 && (
        <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto bg-[#0b141a] px-3 py-2">
          {previews.map((preview, index) => (
            <button key={preview.url} type="button" onClick={() => setSelected(index)} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2" style={{ borderColor: selected === index ? 'var(--c-accent)' : 'transparent' }}>
              {preview.file.type.startsWith('video/') ? <video src={preview.url} muted className="h-full w-full object-cover" /> : <img src={preview.url} alt="" className="h-full w-full object-cover" />}
              <span className="absolute right-0 bottom-0 rounded-tl bg-black/65 px-1 text-[10px]">{index + 1}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-2 bg-[#0b141a] px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+10px)]">
        <ImageIcon size={21} className="shrink-0 text-[#aebac1]" />
        <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-[#202c33] px-4">
          <input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Добавить подпись…" className="min-w-0 flex-1 text-body text-white placeholder:text-[#8696a0]" />
          <Sparkles size={19} className="text-[#8696a0]" />
        </div>
        <button type="button" aria-label={`Отправить ${files.length} файлов`} disabled={preparing} onClick={() => void prepareAndSend()} className="tap relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent disabled:opacity-60">
          <Send size={22} color="#fff" />
          {files.length > 1 && <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-accent-deep">{files.length}</span>}
        </button>
      </div>
    </div>
  )
}
