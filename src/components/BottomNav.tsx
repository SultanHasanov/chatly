import { CircleDashed, MessageSquare, Phone, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const TABS = [
  { id: 'chats', label: 'Чаты', icon: MessageSquare },
  { id: 'status', label: 'Статус', icon: CircleDashed, dot: true },
  { id: 'communities', label: 'Сообщества', icon: Users },
  { id: 'calls', label: 'Звонки', icon: Phone },
] as const satisfies readonly {
  id: string
  label: string
  icon: LucideIcon
  dot?: boolean
}[]

export type TabId = (typeof TABS)[number]['id']

/** Нижняя панель навигации в духе актуального WhatsApp. */
export function BottomNav({
  active,
  onChange,
}: {
  active: TabId
  onChange: (id: TabId) => void
}) {
  return (
    <nav
      className="flex shrink-0 items-stretch border-t border-divider pt-1.5"
      style={{
        background: 'var(--c-nav-bg)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)',
      }}
    >
      {TABS.map((t) => {
        const on = t.id === active
        const Icon = t.icon
        const dot = 'dot' in t && t.dot
        return (
          <button
            key={t.id}
            type="button"
            aria-current={on ? 'page' : undefined}
            onClick={() => onChange(t.id)}
            className="tap flex flex-1 flex-col items-center gap-1 py-0.5"
          >
            <span
              className="relative flex h-8 w-16 items-center justify-center rounded-full"
              style={{ background: on ? 'var(--c-nav-active-pill)' : 'transparent' }}
            >
              <Icon
                size={22}
                strokeWidth={on ? 2 : 1.7}
                style={{ color: on ? 'var(--c-nav-active-ink)' : 'var(--c-nav-ink)' }}
                fill={on ? 'currentColor' : 'none'}
                fillOpacity={on ? 0.18 : 0}
              />
              {dot && (
                <span
                  className="absolute top-0.5 right-4 h-2 w-2 rounded-full"
                  style={{ background: 'var(--c-accent)' }}
                />
              )}
            </span>
            <span
              className="text-caption"
              style={{
                fontWeight: on ? 600 : 500,
                color: on ? 'var(--c-nav-active-ink)' : 'var(--c-nav-ink)',
              }}
            >
              {t.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
