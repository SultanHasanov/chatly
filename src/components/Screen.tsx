import type { ReactNode } from 'react'

/**
 * Каркас экрана: занимает всю высоту вьюпорта, учитывает safe-area,
 * скроллится только средняя область.
 */
export function Screen({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`relative flex h-[100dvh] flex-col overflow-hidden bg-surface ${className}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {children}
    </div>
  )
}

export function ScrollArea({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`no-scrollbar flex-1 overflow-y-auto overscroll-contain ${className}`}>
      {children}
    </div>
  )
}

/** Отступ под системный индикатор «домой». */
export function SafeBottom({ extra = 0 }: { extra?: number }) {
  return <div style={{ height: `calc(env(safe-area-inset-bottom) + ${extra}px)` }} />
}
