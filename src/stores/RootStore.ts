import { createContext, useContext } from 'react'
import { ChatStore } from './ChatStore'
import { ContactStore } from './ContactStore'
import { SessionStore } from './SessionStore'
import { UiStore } from './UiStore'

export class RootStore {
  ui = new UiStore()
  session = new SessionStore()
  chats = new ChatStore()
  contacts = new ContactStore()
}

export const rootStore = new RootStore()

const StoreContext = createContext<RootStore>(rootStore)

export const StoreProvider = StoreContext.Provider

export function useStores(): RootStore {
  return useContext(StoreContext)
}
