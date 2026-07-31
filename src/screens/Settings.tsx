import { observer } from 'mobx-react-lite'
import { Bell, Camera, Database, LogOut, MessageCircle, Moon, Shield, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStores } from '../stores/RootStore'
import { Avatar } from '../components/Avatar'
import { ListRow } from '../components/ListRow'
import { Screen, ScrollArea } from '../components/Screen'
import { TopBar } from '../components/TopBar'
import type { ThemeMode } from '../types'
import { uploadAvatar } from '../lib/uploads'
import { disablePush, enablePush, restorePushSubscription } from '../lib/push'
import { supabaseConfigured } from '../lib/supabase'

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: 'light', label: 'Светлая' },
  { id: 'dark', label: 'Тёмная' },
  { id: 'system', label: 'Как в системе' },
]

/** Экран 11 прототипа. */
export const Settings = observer(function Settings() {
  const { session, chats, ui } = useStores()
  const navigate = useNavigate()
  const user = session.user
  const avatarInput = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState('')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushBusy, setPushBusy] = useState(true)

  useEffect(() => {
    if (!user) return
    setPushBusy(true)
    void restorePushSubscription(user.id)
      .then(setPushEnabled)
      .catch(() => setPushEnabled(false))
      .finally(() => setPushBusy(false))
  }, [user])

  const chooseAvatar = async (file?: File) => {
    if (!file || !user || !supabaseConfigured) return
    try {
      setNotice('Загрузка аватара…')
      await uploadAvatar(user.id, file)
      user.avatarUrl = URL.createObjectURL(file)
      setNotice('Аватар обновлён')
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Ошибка загрузки')
    }
  }

  const togglePush = async () => {
    if (!user) return
    try {
      setPushBusy(true)
      setNotice('')
      if (pushEnabled) {
        await disablePush()
        setPushEnabled(false)
        setNotice('Уведомления отключены')
      } else {
        await enablePush(user.id)
        setPushEnabled(true)
        setNotice('Уведомления включены')
      }
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Не удалось изменить настройки уведомлений')
    } finally {
      setPushBusy(false)
    }
  }

  return (
    <Screen>
      <TopBar title="Настройки" onBack={() => navigate('/chats')} />

      <ScrollArea>
        <div
          className="flex items-center gap-4 px-5 pt-2.5 pb-5"
          style={{ borderBottom: '8px solid var(--c-bg-sunken)' }}
        >
          <button type="button" className="tap relative" onClick={() => avatarInput.current?.click()}>
            <Avatar initials={user?.initials ?? '?'} color={user?.color ?? '#25D366'} size={64} fontSize={22} src={user?.avatarUrl} />
            <span className="absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full bg-accent"><Camera size={13} color="#fff" /></span>
          </button>
          <input ref={avatarInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void chooseAvatar(e.target.files?.[0])} />
          <div>
            <div className="text-[18px] font-semibold text-ink">{user?.name ?? 'Гость'}</div>
            <div className="text-label text-muted">В сети</div>
          </div>
        </div>

        <ListRow icon={User} label="Аккаунт" />
        <ListRow icon={Shield} label="Приватность" />
        <ListRow icon={MessageCircle} label="Чаты" />
        <div className="flex w-full items-center gap-3.5 border-b border-divider-soft px-5 py-3.5">
          <Bell size={20} strokeWidth={1.6} style={{ color: 'var(--c-accent-deep)' }} />
          <span className="flex-1 text-item text-ink">Уведомления</span>
          <button
            type="button"
            role="switch"
            aria-checked={pushEnabled}
            aria-label={pushEnabled ? 'Отключить уведомления' : 'Включить уведомления'}
            disabled={pushBusy}
            onClick={() => void togglePush()}
            className="tap relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50"
            style={{ background: pushEnabled ? 'var(--c-accent)' : 'var(--c-disabled)' }}
          >
            <span
              className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-transform"
              style={{ left: 3, transform: pushEnabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
        <ListRow icon={Database} label="Хранилище" />
        {notice && <div className="px-5 py-2 text-center text-note text-muted">{notice}</div>}

        <div className="px-5 pt-5 pb-2">
          <div className="mb-2.5 flex items-center gap-2">
            <Moon size={18} strokeWidth={1.6} style={{ color: 'var(--c-accent-deep)' }} />
            <span className="text-item text-ink">Оформление</span>
          </div>
          <div
            className="flex gap-1 rounded-xl p-1"
            style={{ background: 'var(--c-bg-field)' }}
          >
            {THEMES.map((t) => {
              const on = ui.theme === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => ui.setTheme(t.id)}
                  className="tap flex-1 rounded-lg py-2 text-note font-medium"
                  style={{
                    background: on ? 'var(--c-accent)' : 'transparent',
                    color: on ? '#fff' : 'var(--c-text-muted)',
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>


        <button
          type="button"
          onClick={() => {
            void session.logout().then(() => chats.clearLocalData())
            navigate('/login', { replace: true })
          }}
          className="tap flex w-full items-center gap-3.5 px-5 py-4"
        >
          <LogOut size={20} strokeWidth={1.6} style={{ color: 'var(--c-danger)' }} />
          <span className="text-item" style={{ color: 'var(--c-danger)' }}>
            Выйти
          </span>
        </button>
        <div className="h-6" />
      </ScrollArea>
    </Screen>
  )
})
