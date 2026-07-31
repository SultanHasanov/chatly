import { observer } from 'mobx-react-lite'
import { MessageCircle, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStores } from '../stores/RootStore'
import { mountTelegramWidget, telegramConfigured } from '../lib/telegram'

/** Экран 2 прототипа. */
export const Login = observer(function Login() {
  const { session } = useStores()
  const navigate = useNavigate()
  const widgetRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!widgetRef.current) return
    return mountTelegramWidget(widgetRef.current, async (data) => {
      try {
        setError('')
        await session.loginWithTelegram(data)
        navigate('/chats', { replace: true })
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Не удалось войти')
      }
    })
  }, [session, navigate])

  const loginMock = () => {
    session.loginAsMockUser()
    navigate('/chats', { replace: true })
  }

  return (
    <div
      className="flex h-[100dvh] flex-col items-center justify-center gap-5 bg-surface px-8"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div
        className="mb-2 flex h-[72px] w-[72px] items-center justify-center rounded-[20px]"
        style={{ background: 'var(--c-bg-field)' }}
      >
        <MessageCircle size={34} strokeWidth={1.8} style={{ color: 'var(--c-accent-deep)' }} />
      </div>

      <h1 className="text-center text-[20px] font-bold text-ink">Войдите, чтобы начать</h1>
      <p className="text-center text-body leading-relaxed text-muted">
        Chatly использует ваш Telegram-аккаунт для входа — без пароля и SMS-кода
      </p>

      <div className="h-4" />

      {telegramConfigured ? (
        <div ref={widgetRef} className="flex w-full justify-center" />
      ) : (
        <button
          type="button"
          onClick={loginMock}
          className="tap flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[14px]"
          style={{ background: 'var(--c-accent-deep)' }}
        >
          <Send size={22} strokeWidth={1.7} color="#fff" />
          <span className="text-title font-semibold text-white">Войти через Telegram</span>
        </button>
      )}

      <p className="mt-1.5 text-center text-note text-muted">
        Или войдите по ссылке-приглашению
      </p>
      {error && <p className="text-center text-note" style={{ color: 'var(--c-danger)' }}>{error}</p>}
    </div>
  )
})
