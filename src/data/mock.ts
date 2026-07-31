import type { Chat, Contact, Member, Message, SessionUser } from '../types'

/** Данные перенесены 1:1 из прототипа `design/Chat Brat UI.dc.html`. */

export const ME: SessionUser = {
  id: 'me',
  name: 'Ольга Кравцова',
  initials: 'ОК',
  color: '#25D366',
  isGuest: false,
}

export const CONTACTS: Contact[] = [
  { id: 'c1', name: 'Аня Соловьёва', initials: 'АС', color: '#D46A9F' },
  { id: 'c2', name: 'Марина Соколова', initials: 'МС', color: '#25D366' },
  { id: 'c3', name: 'Игорь Петров', initials: 'ИП', color: '#8E6BC2' },
  { id: 'c4', name: 'Артём Волков', initials: 'АВ', color: '#E8A33D' },
  { id: 'c5', name: 'Наталья Ким', initials: 'НК', color: '#4FA8E8' },
  { id: 'c6', name: 'Сергей Литвин', initials: 'СЛ', color: '#D2691E' },
  { id: 'c7', name: 'Ольга Кравцова', initials: 'ОК', color: '#5B8DEF' },
  { id: 'c8', name: 'Виктор Ершов', initials: 'ВЕ', color: '#3EAE8F' },
]

export const DESIGN_TEAM_MEMBERS: Member[] = [
  { id: 'me', name: 'Ольга Кравцова', initials: 'ОК', color: '#25D366', role: 'admin' },
  { id: 'c2', name: 'Марина Соколова', initials: 'МС', color: '#25D366', role: 'member' },
  { id: 'c3', name: 'Игорь Петров', initials: 'ИП', color: '#8E6BC2', role: 'member' },
  { id: 'c1', name: 'Аня Соловьёва', initials: 'АС', color: '#D46A9F', role: 'guest' },
  { id: 'c5', name: 'Наталья Ким', initials: 'НК', color: '#4FA8E8', role: 'guest' },
]

const DAY = 86_400_000

/** Часы/минуты сегодняшнего дня в миллисекундах от полуночи. */
function at(h: number, m: number, daysAgo = 0): number {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.getTime() - daysAgo * DAY
}

export function seedChats(): Chat[] {
  return [
    {
      id: 'design',
      name: 'Дизайн-команда',
      initials: 'ДК',
      color: '#128C7E',
      isGroup: true,
      memberIds: DESIGN_TEAM_MEMBERS.map((m) => m.id),
      memberCount: 12,
      pinned: true,
      unreadCount: 3,
      inviteCode: 'x7k2mq',
      mediaCount: 24,
    },
    {
      id: 'marina',
      name: 'Марина Соколова',
      initials: 'МС',
      color: '#25D366',
      isGroup: false,
      memberIds: ['me', 'c2'],
      memberCount: 2,
      pinned: false,
      unreadCount: 0,
      inviteCode: 'm4rn12',
      mediaCount: 8,
    },
    {
      id: 'family',
      name: 'Семейный чат',
      initials: 'СЧ',
      color: '#5B8DEF',
      isGroup: true,
      memberIds: ['me', 'c7', 'c8'],
      memberCount: 6,
      pinned: true,
      unreadCount: 1,
      inviteCode: 'fam905',
      mediaCount: 132,
    },
    {
      id: 'artem',
      name: 'Артём Волков',
      initials: 'АВ',
      color: '#E8A33D',
      isGroup: false,
      memberIds: ['me', 'c4'],
      memberCount: 2,
      pinned: false,
      unreadCount: 0,
      inviteCode: 'art77z',
      mediaCount: 3,
    },
    {
      id: 'client',
      name: 'Клиент — ООО Ромашка',
      initials: 'КР',
      color: '#D2691E',
      isGroup: true,
      memberIds: ['me', 'c6'],
      memberCount: 4,
      pinned: false,
      unreadCount: 5,
      inviteCode: 'rmk318',
      mediaCount: 17,
    },
    {
      id: 'igor',
      name: 'Игорь Петров',
      initials: 'ИП',
      color: '#8E6BC2',
      isGroup: false,
      memberIds: ['me', 'c3'],
      memberCount: 2,
      pinned: false,
      unreadCount: 0,
      inviteCode: 'igr220',
      mediaCount: 5,
    },
    {
      id: 'neighbors',
      name: 'Соседи по подъезду',
      initials: 'СП',
      color: '#4FA8E8',
      isGroup: true,
      memberIds: ['me', 'c5', 'c8'],
      memberCount: 28,
      pinned: false,
      unreadCount: 0,
      inviteCode: 'pod4ez',
      mediaCount: 41,
    },
    {
      id: 'anna',
      name: 'Анна Кузьмина',
      initials: 'АК',
      color: '#D46A9F',
      isGroup: false,
      memberIds: ['me', 'c1'],
      memberCount: 2,
      pinned: false,
      unreadCount: 0,
      inviteCode: 'ann561',
      mediaCount: 2,
    },
    {
      id: 'gym',
      name: 'Спортзал Energy',
      initials: 'SE',
      color: '#3EAE8F',
      isGroup: false,
      memberIds: ['me'],
      memberCount: 2,
      pinned: false,
      unreadCount: 0,
      inviteCode: 'engy01',
      mediaCount: 0,
    },
  ]
}

export function seedMessages(): Message[] {
  const msg = (m: Omit<Message, 'status'> & { status?: Message['status'] }): Message => ({
    status: 'read',
    ...m,
  })

  return [
    // Экран 4 прототипа — переписка в «Дизайн-команде».
    msg({
      id: 'd1',
      chatId: 'design',
      authorId: 'c2',
      authorName: 'Марина',
      authorColor: '#128C7E',
      text: 'Скинула макеты в фигму, посмотрите поле ввода',
      ts: at(10, 2),
      outgoing: false,
    }),
    msg({
      id: 'd2',
      chatId: 'design',
      authorId: 'me',
      authorName: 'Ольга',
      authorColor: '#128C7E',
      text: 'Отлично, гляну после обеда',
      quote: { authorName: 'Марина', text: 'Скинула макеты в фигму, посмотрите поле ввода' },
      ts: at(10, 5),
      outgoing: true,
      status: 'read',
    }),
    msg({
      id: 'd3',
      chatId: 'design',
      authorId: 'c3',
      authorName: 'Игорь',
      authorColor: '#D2691E',
      text: '',
      attachment: { kind: 'image', caption: 'скриншот экрана' },
      ts: at(10, 8),
      outgoing: false,
    }),

    msg({
      id: 'm1',
      chatId: 'marina',
      authorId: 'c2',
      authorName: 'Марина Соколова',
      authorColor: '#128C7E',
      text: 'Посмотрела правки, всё ок',
      ts: at(9, 40),
      outgoing: false,
    }),
    msg({
      id: 'm2',
      chatId: 'marina',
      authorId: 'me',
      authorName: 'Ольга',
      authorColor: '#128C7E',
      text: 'Отлично, гляну после обеда',
      ts: at(9, 52),
      outgoing: true,
      status: 'read',
    }),

    msg({
      id: 'f1',
      chatId: 'family',
      authorId: 'c7',
      authorName: 'Мама',
      authorColor: '#D46A9F',
      text: 'не забудьте про воскресенье',
      ts: at(9, 20),
      outgoing: false,
    }),
    msg({
      id: 'a1',
      chatId: 'artem',
      authorId: 'c4',
      authorName: 'Артём Волков',
      authorColor: '#E8A33D',
      text: 'Скинь, пожалуйста, файл',
      ts: at(18, 30, 1),
      outgoing: false,
    }),
    msg({
      id: 'k1',
      chatId: 'client',
      authorId: 'c6',
      authorName: 'Сергей Литвин',
      authorColor: '#D2691E',
      text: 'Ждём договор',
      ts: at(17, 5, 1),
      outgoing: false,
    }),
    msg({
      id: 'i1',
      chatId: 'igor',
      authorId: 'c3',
      authorName: 'Игорь Петров',
      authorColor: '#8E6BC2',
      text: 'Тестовая сборка готова',
      ts: at(14, 12, 3),
      outgoing: false,
    }),
    msg({
      id: 'n1',
      chatId: 'neighbors',
      authorId: 'c8',
      authorName: 'Виктор Ершов',
      authorColor: '#3EAE8F',
      text: 'Собрание в четверг в 19:00',
      ts: at(11, 30, 3),
      outgoing: false,
    }),
    msg({
      id: 'an1',
      chatId: 'anna',
      authorId: 'me',
      authorName: 'Ольга',
      authorColor: '#128C7E',
      text: 'Спасибо! 🙂',
      ts: at(16, 45, 4),
      outgoing: true,
      status: 'read',
    }),
    msg({
      id: 'g1',
      chatId: 'gym',
      authorId: 'gym',
      authorName: 'Спортзал Energy',
      authorColor: '#3EAE8F',
      text: 'Ваша тренировка перенесена',
      ts: at(12, 0, 6),
      outgoing: false,
    }),
  ]
}

/** Цвета для подписи автора в групповом чате (как в прототипе). */
export const AUTHOR_COLORS = [
  '#128C7E',
  '#D2691E',
  '#8E6BC2',
  '#4FA8E8',
  '#D46A9F',
  '#3EAE8F',
  '#E8A33D',
]
