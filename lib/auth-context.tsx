'use client'

export type { AuthUser } from '@/store/features/auth'
export { useAuth } from '@/store/hooks'
export { setUser, logoutUser as logout } from '@/store/features/auth'

import { useAppDispatch } from '@/store/hooks'
import { logoutUser, setUser, type AuthUser } from '@/store/features/auth'
import { useAuth as useAuthSelector } from '@/store/hooks'
import type { ReactNode } from 'react'
import { StoreProvider } from '@/store/StoreProvider'

export function AuthProvider({ children }: { children: ReactNode }) {
  return <StoreProvider>{children}</StoreProvider>
}

export function useAuthContext() {
  const dispatch = useAppDispatch()
  const { user, isLoading } = useAuthSelector()
  return {
    user,
    isLoading,
    setUser: (u: AuthUser | null) => dispatch(setUser(u)),
    logout: () => dispatch(logoutUser()),
  }
}
