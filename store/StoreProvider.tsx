'use client'
import { Provider } from 'react-redux'
import { useEffect } from 'react'
import { store } from './index'
import { useAppDispatch } from './hooks'
import { fetchCurrentUser } from './features/auth'

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchCurrentUser())
  }, [dispatch])

  return <>{children}</>
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthInitializer>{children}</AuthInitializer>
    </Provider>
  )
}
