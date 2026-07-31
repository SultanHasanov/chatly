import { observer } from 'mobx-react-lite'
import { Camera, Check } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStores } from '../stores/RootStore'
import { Screen, ScrollArea } from '../components/Screen'
import { TopBar } from '../components/TopBar'
import { Fab } from '../components/Fab'

/** Экран 6 прототипа. */
export const NewGroupDetails = observer(function NewGroupDetails() {
  const { contacts, chats, session } = useStores()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const avatarInput = useRef<HTMLInputElement>(null)

  const create = async () => {
    if (!name.trim() || !session.user) return
    const chat = await chats.createGroupRemote(name.trim(), session.user, description.trim() || undefined)
    if (avatar) await chats.setGroupAvatar(chat.id, session.user.id, avatar)
    contacts.reset()
    navigate(`/chats/${chat.id}`, { replace: true })
  }

  return (
    <Screen>
      <TopBar title="Новая группа" />

      <ScrollArea>
        <div className="flex items-center gap-4 px-5 pt-6 pb-2">
          <button type="button" onClick={() => avatarInput.current?.click()}
            className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-full"
            style={{ background: 'var(--c-bg-field)' }}
          >
            {avatarPreview ? <img src={avatarPreview} alt="" className="h-full w-full object-cover" /> : <Camera size={28} strokeWidth={1.7} className="text-faint" />}
          </button>
          <input ref={avatarInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
            const file = event.target.files?.[0] ?? null
            setAvatar(file)
            setAvatarPreview(file ? URL.createObjectURL(file) : '')
          }} />
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название группы"
            className="flex-1 border-b border-divider pb-2.5 text-title placeholder:text-faint"
          />
        </div>

        <div className="px-5 py-4">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание группы (необязательно)"
            className="w-full text-body placeholder:text-faint"
          />
        </div>

        <div className="px-5 pt-2 text-label text-muted">
          Участники присоединятся по ссылке-приглашению
        </div>
        <div className="h-24" />
      </ScrollArea>

      <div
        className="absolute right-6"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
      >
        <Fab icon={Check} label="Создать группу" onClick={() => void create()} disabled={!name.trim()} />
      </div>
    </Screen>
  )
})
