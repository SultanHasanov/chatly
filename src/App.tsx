import { RouterProvider } from 'react-router-dom'
import { StoreProvider, rootStore } from './stores/RootStore'
import { router } from './routes'
import { InstallPrompt } from './components/InstallPrompt'
import { AppBadgeSync } from './components/AppBadgeSync'

export default function App() {
  return (
    <StoreProvider value={rootStore}>
      <RouterProvider router={router} />
      <AppBadgeSync />
      <InstallPrompt />
    </StoreProvider>
  )
}
