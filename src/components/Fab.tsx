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
      className="tap flex h-14 w-14 items-center justify-center rounded-[18px] disabled:shadow-none"
      style={{
        background: disabled ? 'var(--c-disabled)' : 'var(--c-accent)',
        boxShadow: disabled ? 'none' : '0 4px 12px rgba(0,0,0,0.4)',
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
