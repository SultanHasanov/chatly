import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

/** Шапка внутреннего экрана: «← Заголовок» + действия справа. */
export function TopBar({
  title,
  onBack,
  right,
  className = '',
}: {
  title: ReactNode
  onBack?: () => void
  right?: ReactNode
  className?: string
}) {
  const navigate = useNavigate()
  return (
    <header
      className={`flex shrink-0 items-center gap-3.5 bg-surface px-5 py-2.5 ${className}`}
    >
      <button
        type="button"
        aria-label="Назад"
        className="tap -ml-1 p-1"
        onClick={() => (onBack ? onBack() : navigate(-1))}
      >
        <ChevronLeft size={24} strokeWidth={2} className="text-ink" />
      </button>
      <div className="min-w-0 flex-1 text-[19px] font-semibold text-ink">{title}</div>
      {right}
    </header>
  )
}
