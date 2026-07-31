import { observer } from 'mobx-react-lite'
import type { ReactElement } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { useStores } from './stores/RootStore'
import { Splash } from './screens/Splash'
import { Login } from './screens/Login'
import { ChatList } from './screens/ChatList'
import { Chat } from './screens/Chat'
import { NewGroupDetails } from './screens/NewGroupDetails'
import { InviteLink } from './screens/InviteLink'
import { JoinGuest } from './screens/JoinGuest'
import { GroupInfo } from './screens/GroupInfo'
import { Settings } from './screens/Settings'

const RequireAuth = observer(function RequireAuth({ children }: { children: ReactElement }) {
  const { session } = useStores()
  if (!session.isAuthed) return <Navigate to="/login" replace />
  return children
})

/** Гость с активной сессией не должен снова видеть онбординг. */
const Entry = observer(function Entry() {
  const { session } = useStores()
  if (session.isAuthed) return <Navigate to="/chats" replace />
  if (session.onboarded) return <Navigate to="/login" replace />
  return <Splash />
})

const guard = (element: ReactElement) => <RequireAuth>{element}</RequireAuth>

export const router = createBrowserRouter([
  { path: '/', element: <Entry /> },
  { path: '/login', element: <Login /> },
  { path: '/join/:code', element: <JoinGuest /> },
  { path: '/chats', element: guard(<ChatList />) },
  { path: '/chats/:chatId', element: guard(<Chat />) },
  { path: '/chats/:chatId/info', element: guard(<GroupInfo />) },
  { path: '/chats/:chatId/invite', element: guard(<InviteLink />) },
  { path: '/new-group', element: guard(<NewGroupDetails />) },
  { path: '/new-group/details', element: guard(<NewGroupDetails />) },
  { path: '/settings', element: guard(<Settings />) },
  { path: '*', element: <Navigate to="/" replace /> },
])
