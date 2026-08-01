import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { useStores } from '../stores/RootStore'
import { restorePushSubscription } from '../lib/push'

type BadgeNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

export const AppBadgeSync = observer(function AppBadgeSync() {
  const { chats, session } = useStores()
  const unread = chats.chats.reduce((total, chat) => total + chat.unreadCount, 0)
  const userId = session.user?.id

  useEffect(() => {
    if (!userId) return
    void restorePushSubscription(userId).catch(() => undefined)
  }, [userId])

  useEffect(() => {
    const badgeNavigator = navigator as BadgeNavigator
    if (unread > 0) void badgeNavigator.setAppBadge?.(unread).catch(() => undefined)
    else void badgeNavigator.clearAppBadge?.().catch(() => undefined)
  }, [unread])

  return null
})
