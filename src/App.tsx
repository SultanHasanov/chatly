import { RouterProvider } from 'react-router-dom'
import { StoreProvider, rootStore } from './stores/RootStore'
import { router } from './routes'

export default function App() {
  return (
    <StoreProvider value={rootStore}>
      <RouterProvider router={router} />
    </StoreProvider>
  )
}
