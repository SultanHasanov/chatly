import { Download, Share2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const ios = isIos()

  useEffect(() => {
    if (isStandalone() || sessionStorage.getItem('chat-brat:install-dismissed')) return
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as InstallPromptEvent)
      setVisible(true)
    }
    const onInstalled = () => setVisible(false)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    if (ios) setVisible(true)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [ios])

  if (!visible) return null

  const close = () => {
    sessionStorage.setItem('chat-brat:install-dismissed', '1')
    setVisible(false)
  }

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') setVisible(false)
  }

  return (
    <div className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+14px)] left-3 z-[100] mx-auto flex max-w-[430px] items-center gap-3 rounded-2xl border border-divider bg-bar p-3 shadow-2xl">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent">
        <Download size={23} color="#fff" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-label font-semibold text-ink">Установить Chat Brat</div>
        <div className="text-note leading-snug text-muted">{ios ? 'Нажмите «Поделиться», затем «На экран Домой»' : 'Открывайте чат с главного экрана как приложение'}</div>
      </div>
      {ios ? <Share2 size={22} className="shrink-0 text-accent-deep" /> : (
        <button type="button" onClick={() => void install()} className="tap rounded-lg bg-accent px-3 py-2 text-note font-semibold text-white">Установить</button>
      )}
      <button type="button" aria-label="Закрыть предложение установки" onClick={close} className="tap shrink-0 text-muted"><X size={19} /></button>
    </div>
  )
}
