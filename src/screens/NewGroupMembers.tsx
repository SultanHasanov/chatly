import { observer } from 'mobx-react-lite'
import { ArrowRight, Check, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStores } from '../stores/RootStore'
import { Avatar } from '../components/Avatar'
import { Screen, ScrollArea } from '../components/Screen'
import { TopBar } from '../components/TopBar'
import { Fab } from '../components/Fab'

/** Экран 5 прототипа. */
export const NewGroupMembers = observer(function NewGroupMembers() {
  const { contacts } = useStores()
  const navigate = useNavigate()

  return (
    <Screen>
      <TopBar title="Добавить участников" onBack={() => navigate('/chats')} />

      {contacts.selected.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-2 px-5 py-1.5">
          {contacts.selected.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => contacts.toggle(c.id)}
              className="tap flex items-center gap-1.5 rounded-2xl py-[5px] pr-2.5 pl-[5px]"
              style={{ background: 'var(--c-bg-field)' }}
            >
              <Avatar initials={c.initials} color={c.color} size={24} fontSize={11} />
              <span className="text-note text-ink">{c.name}</span>
            </button>
          ))}
        </div>
      )}

      <div
        className="mx-5 my-2 flex h-[38px] shrink-0 items-center gap-2 rounded-[10px] px-3"
        style={{ background: 'var(--c-bg-field)' }}
      >
        <Search size={16} strokeWidth={1.7} className="text-muted" />
        <input
          type="text"
          name="q"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          data-form-type="other"
          data-lpignore="true"
          value={contacts.query}
          onChange={(e) => contacts.setQuery(e.target.value)}
          placeholder="Поиск"
          className="flex-1 text-body placeholder:text-faint"
        />
      </div>

      <ScrollArea className="py-1">
        {contacts.filtered.map((c) => {
          const on = contacts.isSelected(c.id)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => contacts.toggle(c.id)}
              className="tap flex w-full items-center gap-3 px-5 py-2.5 text-left"
            >
              <Avatar initials={c.initials} color={c.color} size={44} fontSize={15} />
              <span className="flex-1 text-item text-ink">{c.name}</span>
              <span
                className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2"
                style={{
                  borderColor: on ? 'var(--c-accent)' : '#C7CCCF',
                  background: on ? 'var(--c-accent)' : 'transparent',
                }}
              >
                {on && <Check size={12} strokeWidth={3} color="#fff" />}
              </span>
            </button>
          )
        })}
        <div className="h-24" />
      </ScrollArea>

      {contacts.selected.length > 0 && (
        <div
          className="absolute right-6"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
        >
          <Fab
            icon={ArrowRight}
            label="Далее"
            onClick={() => navigate('/new-group/details')}
          />
        </div>
      )}
    </Screen>
  )
})
