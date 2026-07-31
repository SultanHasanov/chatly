import type { LucideIcon } from 'lucide-react'

export function Fab({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="tap flex h-14 w-14 items-center justify-center rounded-full shadow-lg disabled:shadow-none"
      style={{
        background: disabled ? 'var(--c-disabled)' : 'var(--c-accent)',
        boxShadow: disabled ? 'none' : '0 6px 16px rgba(37,211,102,0.5)',
      }}
    >
      <Icon
        size={24}
        strokeWidth={1.7}
        style={{ color: disabled ? 'var(--c-disabled-text)' : '#fff' }}
      />
    </button>
  )
}
