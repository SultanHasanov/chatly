import { autorun, toJS } from 'mobx'

const PREFIX = 'chat-brat:'

export function loadState<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/**
 * Сохраняет сериализуемый срез стора в localStorage при каждом его изменении.
 */
export function persist<T>(key: string, snapshot: () => T): () => void {
  return autorun(() => {
    const data = toJS(snapshot())
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(data))
    } catch {
      /* хранилище переполнено или недоступно — молча пропускаем */
    }
  })
}

export function clearState(key: string): void {
  localStorage.removeItem(PREFIX + key)
}
