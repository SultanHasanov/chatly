import type { LucideIcon } from 'lucide-react'

/** Строка меню на экранах «Информация о группе» и «Настройки». */
export function ListRow({
  icon: Icon,
  label,
  hint,
  danger = false,
  iconColor,
  onClick,
}: {
  icon: LucideIcon
  label: string
  hint?: string
  danger?: boolean
  iconColor?: string
  onClick?: () => void
}) {
  const color = danger ? 'var(--c-danger)' : (iconColor ?? 'var(--c-accent-deep)')
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap flex w-full items-center gap-3.5 border-b border-divider-soft px-5 py-3.5 text-left"
    >
      <Icon size={20} strokeWidth={1.6} style={{ color }} />
      <span
        className="flex-1 text-item"
        style={{ color: danger ? 'var(--c-danger)' : 'var(--c-text)' }}
      >
        {label}
      </span>
      {hint && <span className="text-label text-muted">{hint}</span>}
    </button>
  )
}
