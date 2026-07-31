const TABS = [
  { id: 'chats', label: 'Чаты' },
  { id: 'status', label: 'Статус' },
  { id: 'calls', label: 'Звонки' },
] as const

export type TabId = (typeof TABS)[number]['id']

export function Tabs({
  active,
  onChange,
}: {
  active: TabId
  onChange: (id: TabId) => void
}) {
  return (
    <div className="flex shrink-0 gap-7 border-b border-divider px-5 pt-2.5">
      {TABS.map((t) => {
        const on = t.id === active
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className="tap pb-2.5 text-body"
            style={{
              fontWeight: on ? 600 : 500,
              color: on ? 'var(--c-accent-deep)' : 'var(--c-text-muted)',
              borderBottom: on ? '2.5px solid var(--c-accent)' : '2.5px solid transparent',
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
