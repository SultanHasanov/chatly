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
import { enablePush, restorePushSubscription } from '../lib/push'
import { supabaseConfigured } from '../lib/supabase'

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: 'light', label: 'Светлая' },
  { id: 'dark', label: 'Тёмная' },
  { id: 'system', label: 'Как в системе' },
]

/** Экран 11 прототипа. */
export const Settings = observer(function Settings() {
  const { session, ui } = useStores()
  const navigate = useNavigate()
  const user = session.user
  const avatarInput = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (user) void restorePushSubscription(user.id).catch(() => undefined)
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

  const subscribePush = async () => {
    if (!user) return
    try {
      await enablePush(user.id)
      setNotice('Уведомления включены')
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Не удалось включить уведомления')
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
            <div className="text-label text-muted">{session.isGuest ? 'Гостевой вход' : 'В сети'}</div>
          </div>
        </div>

        <ListRow icon={User} label="Аккаунт" />
        <ListRow icon={Shield} label="Приватность" />
        <ListRow icon={MessageCircle} label="Чаты" />
        <ListRow icon={Bell} label="Уведомления" onClick={() => void subscribePush()} />
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

        {session.isGuest && (
          <div
            className="m-5 flex flex-col gap-2.5 rounded-2xl p-4"
            style={{ background: 'var(--c-bg-field)' }}
          >
            <div className="text-label font-semibold text-ink">Вы вошли как гость</div>
            <p className="text-note leading-snug text-muted">
              Привяжите Telegram, чтобы создавать свои группы и видеть все чаты
            </p>
            <button
              type="button"
              onClick={() => {
                session.upgradeGuest()
                navigate('/chats')
              }}
              className="tap flex h-11 items-center justify-center rounded-[10px] bg-accent text-body font-semibold text-white"
            >
              Привязать Telegram
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            session.logout()
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
