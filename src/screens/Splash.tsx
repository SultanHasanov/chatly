import { observer } from 'mobx-react-lite'
import { MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStores } from '../stores/RootStore'

/** Экран 1 прототипа. */
export const Splash = observer(function Splash() {
  const { session } = useStores()
  const navigate = useNavigate()

  const start = () => {
    session.completeOnboarding()
    navigate(session.isAuthed ? '/chats' : '/login', { replace: true })
  }

  return (
    <div
      className="flex h-[100dvh] flex-col items-center justify-between px-10"
      style={{
        background: '#25D366',
        paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 44px)',
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-white">
          <MessageCircle size={52} strokeWidth={1.8} color="#25D366" />
        </div>
        <div className="text-[30px] font-bold text-white">Chatly</div>
        <div className="text-center text-item" style={{ color: '#EFFFF4' }}>
          Общайтесь без лишнего
        </div>
      </div>

      <button
        type="button"
        onClick={start}
        className="tap h-[52px] w-full rounded-2xl bg-white text-title font-semibold"
        style={{ color: '#128C7E' }}
      >
        Продолжить
      </button>
    </div>
  )
})
