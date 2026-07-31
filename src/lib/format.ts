const WEEKDAYS = [
  'воскресенье',
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
]

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** «10:08» */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

/** Метка справа в списке чатов: время / «вчера» / день недели / «25.07». */
export function formatChatTime(ts: number): string {
  const days = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / 86_400_000)
  if (days <= 0) return formatTime(ts)
  if (days === 1) return 'вчера'
  if (days < 7) return WEEKDAYS[new Date(ts).getDay()]
  return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

/** Разделитель внутри ленты сообщений. */
export function formatDayDivider(ts: number): string {
  const days = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / 86_400_000)
  if (days <= 0) return 'Сегодня'
  if (days === 1) return 'Вчера'
  if (days < 7) return WEEKDAYS[new Date(ts).getDay()]
  return new Date(ts).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })
}

/** «Ольга Кравцова» → «ОК» */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const AUTHOR_COLORS = [
  '#e542a3',
  '#6bcbef',
  '#dfb610',
  '#ff8f7a',
  '#7bd77f',
  '#a67bd7',
  '#f0785a',
  '#5b8def',
  '#e8724c',
  '#4ec9b0',
]

/** Стабильный цвет имени участника: одинаковый на всех устройствах. */
export function authorColorOf(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return AUTHOR_COLORS[Math.abs(hash) % AUTHOR_COLORS.length]
}

export function randomCode(): string {
  return Math.random().toString(36).slice(2, 8)
}
