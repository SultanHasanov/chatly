import { observer } from 'mobx-react-lite'
import { MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useStores } from '../stores/RootStore'

/** Экран 2 прототипа. */
export const Login = observer(function Login() {
  const { session } = useStores()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!session.ready) return <div className="flex h-[100dvh] items-center justify-center bg-surface text-label text-muted">Загрузка…</div>
  if (session.isAuthed) return <Navigate to="/chats" replace />

  const start = async () => {
    if (!name.trim() || loading) return
    try {
      setLoading(true)
      setError('')
      await session.startWithName(name)
      navigate('/chats', { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось создать профиль')
    } finally {
      setLoading(false)
    }
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

      <h1 className="text-center text-[20px] font-bold text-ink">Как вас называть?</h1>
      <p className="text-center text-body leading-relaxed text-muted">
        Имя увидят участники групп. Регистрация, пароль и Telegram не нужны.
      </p>
      <input autoFocus value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void start()} placeholder="Ваше имя" maxLength={80} className="h-12 w-full rounded-[10px] border border-divider px-3.5 text-item placeholder:text-faint" />
      <button type="button" onClick={() => void start()} disabled={!name.trim() || loading} className="tap h-[52px] w-full rounded-xl bg-accent text-title font-semibold text-white disabled:opacity-50">
        {loading ? 'Создаём профиль…' : 'Продолжить'}
      </button>
      {error && <p className="text-center text-note" style={{ color: 'var(--c-danger)' }}>{error}</p>}
    </div>
  )
})
