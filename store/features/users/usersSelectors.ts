import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../index'

export const selectUsersState = (state: RootState) => state.users

export const selectUsers = createSelector(selectUsersState, (s) => s.items)
export const selectUsersIsLoading = createSelector(selectUsersState, (s) => s.isLoading)
export const selectUsersError = createSelector(selectUsersState, (s) => s.error)

export const selectActiveUsers = createSelector(selectUsers, (users) =>
  users.filter((u) => u.isActive)
)

export const selectUsersByRole = (role: string) =>
  createSelector(selectUsers, (users) => users.filter((u) => u.role === role))

export const selectUserById = (id: string) =>
  createSelector(selectUsers, (users) => users.find((u) => u.id === id) ?? null)
