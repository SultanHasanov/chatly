import { observer } from 'mobx-react-lite'
import { Bell, Images, Link2, LogOut, Phone, Search, Video } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStores } from '../stores/RootStore'
import { Avatar } from '../components/Avatar'
import { ListRow } from '../components/ListRow'
import { Screen, ScrollArea } from '../components/Screen'
import { TopBar } from '../components/TopBar'

const ROLE_LABEL: Record<string, string> = { admin: 'Админ', guest: 'Гость' }

/** Экран 10 прототипа. */
export const GroupInfo = observer(function GroupInfo() {
  const { chatId } = useParams()
  const { chats, session } = useStores()
  const navigate = useNavigate()

  const chat = chats.chatById(chatId)
  if (!chat) {
    return (
      <Screen>
        <TopBar title="Информация" />
        <div className="p-5 text-label text-muted">Чат не найден</div>
      </Screen>
    )
  }

  const members = chats.membersOf(chat.id)

  const leave = () => {
    chats.leaveChat(chat.id)
    navigate('/chats', { replace: true })
  }

  const messageMember = async (memberId: string) => {
    if (memberId === session.user?.id) return
    const directId = await chats.openDirect(memberId)
    if (directId) navigate(`/chats/${directId}`)
  }

  const action = (Icon: typeof Phone, label: string) => (
    <button type="button" className="tap flex flex-col items-center gap-1.5">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: 'var(--c-bg-field)' }}
      >
        <Icon size={20} strokeWidth={1.6} style={{ color: 'var(--c-accent-deep)' }} />
      </span>
      <span className="text-meta text-ink">{label}</span>
    </button>
  )

  return (
    <Screen>
      <TopBar title={chat.isGroup ? 'Информация о группе' : 'Информация о контакте'} />

      <ScrollArea>
        <div className="flex flex-col items-center gap-1.5 px-5 pt-3.5 pb-2.5">
          <Avatar initials={chat.initials} color={chat.color} size={76} fontSize={26} />
          <div className="text-heading font-bold text-ink">{chat.name}</div>
          <div className="text-note text-muted">
            {chat.isGroup ? `Группа · ${chat.memberCount} участников` : 'Личный чат'}
          </div>
          {chat.description && (
            <p className="px-4 pt-1 text-center text-body text-muted">{chat.description}</p>
          )}
        </div>

        <div
          className="flex justify-center gap-9 pt-1.5 pb-3"
          style={{ borderBottom: '8px solid var(--c-bg-sunken)' }}
        >
          {action(Phone, 'Аудио')}
          {action(Video, 'Видео')}
          {action(Search, 'Поиск')}
        </div>

        <ListRow
          icon={Images}
          label="Медиа, ссылки"
          hint={String(chat.mediaCount)}
          iconColor="var(--c-text-muted)"
        />
        <ListRow icon={Bell} label="Уведомления" iconColor="var(--c-text-muted)" />
        {chat.isGroup && (
          <ListRow
            icon={Link2}
            label="Ссылка-приглашение"
            iconColor="var(--c-text-muted)"
            onClick={() => navigate(`/chats/${chat.id}/invite`)}
          />
        )}

        <div style={{ borderTop: '6px solid var(--c-bg-sunken)' }} className="pt-2">
          {members.map((m) => (
            <button key={m.id} type="button" onClick={() => void messageMember(m.id)} className="tap flex w-full items-center gap-3 px-5 py-1.5 text-left">
              <Avatar initials={m.initials} color={m.color} size={40} fontSize={14} />
              <div className="flex-1 text-body text-ink">
                {m.id === session.user?.id ? 'Вы' : m.name}
              </div>
              {m.role !== 'member' && (
                <span
                  className="rounded-md px-2.5 py-[3px] text-meta font-semibold"
                  style={
                    m.role === 'admin'
                      ? { color: 'var(--c-accent-deep)', background: 'var(--c-bg-field)' }
                      : { color: 'var(--c-text-muted)', background: 'var(--c-bg-field)' }
                  }
                >
                  {ROLE_LABEL[m.role]}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={leave}
          className="tap mt-1 flex w-full items-center justify-center gap-2 px-5 py-3"
        >
          <LogOut size={18} strokeWidth={1.7} style={{ color: 'var(--c-danger)' }} />
          <span className="text-item font-semibold" style={{ color: 'var(--c-danger)' }}>
            {chat.isGroup ? 'Выйти из группы' : 'Удалить чат'}
          </span>
        </button>
        <div className="h-6" />
      </ScrollArea>
    </Screen>
  )
})
