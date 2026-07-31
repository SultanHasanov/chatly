import type { TelegramAuthData } from '../types'

export const TELEGRAM_BOT: string = import.meta.env.VITE_TELEGRAM_BOT ?? ''

export const telegramConfigured = TELEGRAM_BOT.length > 0

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void
  }
}

/**
 * Монтирует официальный Telegram Login Widget в контейнер.
 * Возвращает функцию очистки. Если бот не настроен (нет VITE_TELEGRAM_BOT),
 * ничего не делает — экран входа рисует мок-кнопку.
 *
 * ВНИМАНИЕ: подпись `hash` здесь не проверяется — это требует секрета бота
 * на сервере. См. README.
 */
export function mountTelegramWidget(
  container: HTMLElement,
  onAuth: (user: TelegramAuthData) => void,
): () => void {
  if (!telegramConfigured) return () => {}

  window.onTelegramAuth = onAuth

  const script = document.createElement('script')
  script.src = 'https://telegram.org/js/telegram-widget.js?22'
  script.async = true
  script.setAttribute('data-telegram-login', TELEGRAM_BOT)
  script.setAttribute('data-size', 'large')
  script.setAttribute('data-radius', '12')
  script.setAttribute('data-userpic', 'false')
  script.setAttribute('data-request-access', 'write')
  script.setAttribute('data-onauth', 'onTelegramAuth(user)')
  container.appendChild(script)

  return () => {
    container.innerHTML = ''
    delete window.onTelegramAuth
  }
}
