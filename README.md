# Chat Brat

PWA-мессенджер, собранный по прототипу `design/Chat Brat UI.dc.html` (11 экранов, iOS 390×844).

Стек: React 19 + TypeScript, Vite, Tailwind CSS 4, MobX, react-router, lucide-react, vite-plugin-pwa.

## Запуск

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # tsc -b && vite build
npm run preview      # проверка PWA на собранной версии
npm run lint
```

Иконки PWA пересобираются из логотипа: `node scripts/generate-icons.mjs`.

## Экраны и маршруты

| # прототипа | Экран | Маршрут |
|---|---|---|
| 1 | Splash / онбординг | `/` |
| 2 | Вход через Telegram | `/login` |
| 3, 9 | Список чатов (обычный / гостевой) | `/chats` |
| 4, 4b | Чат, светлая и тёмная тема | `/chats/:chatId` |
| 5 | Новая группа: участники | `/new-group` |
| 6 | Новая группа: название | `/new-group/details` |
| 7 | Ссылка-приглашение | `/chats/:chatId/invite` |
| 8 | Вход по ссылке (гость) | `/join/:code` |
| 10 | Информация о группе | `/chats/:chatId/info` |
| 11 | Профиль / настройки | `/settings` |

## Что работает

- отправка сообщений (превью, время и порядок чатов в списке обновляются);
- ответ на сообщение — двойной тап по бумажке, цитата попадает в отправленное сообщение;
- создание группы: выбор участников с поиском и чипами → название и описание → новый чат;
- ссылка-приглашение: копирование, `navigator.share`, QR-заглушка, сброс кода;
- гостевой вход по `/join/:code`: виден только этот чат, FAB создания группы задизейблен с подсказкой, в настройках появляется блок «Привязать Telegram»;
- открытие чата обнуляет счётчик непрочитанных;
- переключатель темы (светлая / тёмная / как в системе) в настройках, тёмная тема повторяет экран 4b;
- всё состояние переживает перезагрузку (localStorage, ключи `chat-brat:*`).

## Данные

Бэкенда нет. Моки перенесены 1:1 из прототипа в `src/data/mock.ts`, состояние живёт в MobX-сторах
(`src/stores/`) и сохраняется в localStorage через `src/lib/persist.ts`. Чтобы сбросить состояние —
очистить ключи `chat-brat:*` в DevTools → Application → Local Storage.

## Telegram-вход

## Supabase backend

1. Создайте проект Supabase и включите Authentication → Anonymous Sign-Ins.
2. Примените миграцию `supabase/migrations/202607310001_chat_brat_backend.sql` через Supabase CLI или SQL Editor.
3. Разверните Edge Functions `telegram-auth` и `send-push`.
4. Добавьте frontend-переменные из `.env.example` в `.env`.
5. Добавьте секреты Edge Functions: `TELEGRAM_BOT_TOKEN`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_WEBHOOK_SECRET`. `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` автоматически доступны в размещённых функциях.
6. Создайте Database Webhook для `INSERT` в `public.messages`: URL функции `send-push`, заголовок `x-webhook-secret` со значением `PUSH_WEBHOOK_SECRET`.
7. В BotFather выполните `/setdomain` и укажите HTTPS-домен PWA.

Без переменных Supabase приложение продолжает работать в демонстрационном режиме с локальными моками. Web Push на iOS работает для установленной на домашний экран PWA после явного разрешения пользователя.

### Vercel-прокси для РФ

`vercel.json` проксирует Auth, REST, Storage, Edge Functions и Realtime WebSocket через `/supabase` на домене приложения. В Vercel добавьте `VITE_SUPABASE_USE_PROXY=true`. `VITE_SUPABASE_URL` всё равно указывается: он нужен как конфигурация проекта и для локального режима без прокси.

Прокси привязан к project ref `mcbrchalqroqixisffqs`. При создании другого Supabase-проекта замените этот ref во всех `destination` в `vercel.json`.

По умолчанию `VITE_TELEGRAM_BOT` пуст, и экран входа показывает кнопку из прототипа, которая логинит
тестового пользователя «Ольга Кравцова».

Для реального виджета скопируйте `.env.example` в `.env` и укажите имя бота (без `@`):

```
VITE_TELEGRAM_BOT=my_login_bot
```

Домен приложения должен быть привязан к боту через `/setdomain` у @BotFather. Виджет отдаёт объект с
полем `hash`; **проверка подписи требует секрета бота и поэтому должна выполняться на сервере** —
в текущей frontend-only версии её нет. Перед продакшеном добавьте эндпоинт, который валидирует
`hash` по алгоритму Telegram и выдаёт собственную сессию.

## Дизайн-токены

Палитра и типошкала взяты из мини-гайда прототипа и объявлены CSS-переменными в `src/index.css`
(`:root` — светлая тема, `.dark` — тёмная), а поверх них — токены Tailwind (`bg-surface`, `text-ink`,
`bg-bubble-out`, `text-body` и т. д.). Тема переключается классом `dark` на `<html>`, вместе с ней
меняется `<meta name="theme-color">`.

Бутафорский статус-бар «9:41» и рамка телефона из прототипа намеренно не переносились — их рисует ОС;
вместо фиксированных 390×844 используется `100dvh` + `env(safe-area-inset-*)`.
