import { observer } from 'mobx-react-lite'
import { Camera, MoreVertical, Pencil, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStores } from '../stores/RootStore'
import { Screen, ScrollArea } from '../components/Screen'
import { Tabs } from '../components/Tabs'
import { ChatRow } from '../components/ChatRow'
import { Fab } from '../components/Fab'

/** Экраны 3 и 9 прототипа (обычный и гостевой вид). */
export const ChatList = observer(function ChatList() {
  const { chats, session, ui, contacts } = useStores()
  const navigate = useNavigate()
  const [search, setSearch] = useState<string | null>(null)
  const [hint, setHint] = useState(false)

  useEffect(() => {
    if (session.user) void chats.syncFromSupabase(session.user)
  }, [chats, session.user])

  const guest = session.isGuest
  const visible = guest
    ? chats.sortedChats.filter((c) => c.id === session.user?.guestChatId)
    : chats.sortedChats
  const list = search
    ? visible.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : visible

  const openNewGroup = () => {
    if (guest) {
      setHint(true)
      setTimeout(() => setHint(false), 2600)
      return
    }
    contacts.reset()
    navigate('/new-group')
  }

  return (
    <Screen>
      <header className="flex shrink-0 items-center justify-between px-5 pt-1.5 pb-1">
        {search === null ? (
          <>
            <div className="flex items-center gap-2">
              <h1 className="text-display font-bold text-ink">Chat Brat</h1>
              {guest && (
                <span
                  className="rounded-md px-2 py-[3px] text-caption font-semibold text-muted"
                  style={{ background: 'var(--c-bg-field)' }}
                >
                  Гость
                </span>
              )}
            </div>
            <div className="flex items-center gap-5">
              {!guest && (
                <button type="button" aria-label="Камера" className="tap">
                  <Camera size={22} strokeWidth={1.7} className="text-ink" />
                </button>
              )}
              {!guest && (
                <button
                  type="button"
                  aria-label="Поиск"
                  className="tap"
                  onClick={() => setSearch('')}
                >
                  <Search size={22} strokeWidth={1.7} className="text-ink" />
                </button>
              )}
              <button
                type="button"
                aria-label="Меню"
                className="tap"
                onClick={() => navigate('/settings')}
              >
                <MoreVertical size={18} strokeWidth={2.4} className="text-ink" />
              </button>
            </div>
          </>
        ) : (
          <div
            className="flex h-10 w-full items-center gap-2 rounded-[10px] px-3"
            style={{ background: 'var(--c-bg-field)' }}
          >
            <Search size={16} strokeWidth={1.7} className="text-muted" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск"
              className="flex-1 text-body placeholder:text-faint"
            />
            <button type="button" aria-label="Закрыть поиск" onClick={() => setSearch(null)}>
              <X size={18} className="text-muted" />
            </button>
          </div>
        )}
      </header>

      <Tabs active={ui.tab} onChange={(t) => ui.setTab(t)} />

      <ScrollArea>
        {ui.tab !== 'chats' ? (
          <div className="flex h-full flex-col items-center justify-center px-10 py-24 text-center text-label text-faint">
            {ui.tab === 'status' ? 'Статусов пока нет' : 'История звонков пуста'}
          </div>
        ) : (
          <>
            {list.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                preview={chats.previewOf(chat)}
                last={chats.lastMessageOf(chat.id)}
                onClick={() => navigate(`/chats/${chat.id}`)}
              />
            ))}
            {guest && (
              <div className="flex flex-col items-center justify-center gap-2 px-10 py-24 text-center text-label text-faint">
                Другие чаты появятся, если вы войдёте через Telegram
              </div>
            )}
            {!guest && list.length === 0 && (
              <div className="px-10 py-24 text-center text-label text-faint">Ничего не найдено</div>
            )}
          </>
        )}
      </ScrollArea>

      <div
        className="pointer-events-none absolute right-[22px] flex flex-col items-end gap-2"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
      >
        {hint && (
          <div className="max-w-[220px] rounded-lg bg-ink px-3 py-2 text-center text-note text-surface">
            Войдите через Telegram, чтобы создавать группы
          </div>
        )}
        <div className="pointer-events-auto">
          <Fab icon={Pencil} label="Новая группа" onClick={openNewGroup} disabled={guest} />
        </div>
      </div>
    </Screen>
  )
})
