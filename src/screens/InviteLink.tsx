import { observer } from 'mobx-react-lite'
import { Copy, QrCode, RotateCcw, Share2 } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStores } from '../stores/RootStore'
import { Avatar } from '../components/Avatar'
import { Screen, ScrollArea } from '../components/Screen'
import { TopBar } from '../components/TopBar'

/** Экран 7 прототипа. */
export const InviteLink = observer(function InviteLink() {
  const { chatId } = useParams()
  const { chats } = useStores()
  const [toast, setToast] = useState('')
  const [showQr, setShowQr] = useState(false)

  const chat = chats.chatById(chatId)
  if (!chat) {
    return (
      <Screen>
        <TopBar title="Ссылка-приглашение" />
        <div className="p-5 text-label text-muted">Чат не найден</div>
      </Screen>
    )
  }

  const url = `${window.location.origin}/join/${chat.inviteCode}`
  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      flash('Ссылка скопирована')
    } catch {
      flash('Не удалось скопировать')
    }
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: chat.name, url })
      } catch {
        /* пользователь отменил */
      }
    } else {
      copy()
    }
  }

  const reset = () => {
    chats.resetInviteCode(chat.id)
    flash('Ссылка обновлена')
  }

  const btn =
    'tap flex h-12 flex-1 items-center justify-center gap-2 rounded-[10px] border border-divider text-body font-semibold'

  return (
    <Screen>
      <TopBar title="Ссылка-приглашение" />

      <ScrollArea>
        <div className="flex flex-col items-center gap-2.5 px-5 pt-3 pb-6">
          <Avatar initials={chat.initials} color={chat.color} size={80} fontSize={24} />
          <div className="text-[18px] font-semibold text-ink">{chat.name}</div>
        </div>

        <div className="mx-5 rounded-xl border border-divider p-3.5 text-body font-medium break-all"
          style={{ color: 'var(--c-accent-deep)' }}
        >
          {url}
        </div>

        <div className="flex flex-wrap gap-3 px-5 pt-5">
          <button type="button" onClick={copy} className={btn} style={{ color: 'var(--c-accent-deep)' }}>
            <Copy size={16} strokeWidth={1.6} /> Копировать
          </button>
          <button type="button" onClick={share} className={btn} style={{ color: 'var(--c-accent-deep)' }}>
            <Share2 size={16} strokeWidth={1.6} /> Поделиться
          </button>
        </div>

        <div className="flex gap-3 px-5 pt-3">
          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            className={btn}
            style={{ color: 'var(--c-accent-deep)' }}
          >
            <QrCode size={16} strokeWidth={1.6} /> QR-код
          </button>
          <button type="button" onClick={reset} className={btn} style={{ color: 'var(--c-danger)' }}>
            <RotateCcw size={16} strokeWidth={1.6} /> Сбросить
          </button>
        </div>

        {showQr && (
          <div className="flex flex-col items-center gap-2 px-5 pt-6">
            <div
              className="flex h-[180px] w-[180px] items-center justify-center rounded-xl border border-divider"
              style={{ background: 'var(--c-bg-field)' }}
            >
              <QrCode size={120} strokeWidth={1} className="text-ink" />
            </div>
            <div className="text-meta text-muted">Код: {chat.inviteCode}</div>
          </div>
        )}

        <p className="px-5 pt-8 pb-6 text-center text-note leading-relaxed text-muted">
          Любой, у кого есть ссылка, сможет войти в группу без регистрации
        </p>
      </ScrollArea>

      {toast && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-note text-surface"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 28px)' }}
        >
          {toast}
        </div>
      )}
    </Screen>
  )
})
