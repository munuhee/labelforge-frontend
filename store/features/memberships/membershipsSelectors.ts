import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../index'

export const selectMembershipsState = (state: RootState) => state.memberships

export const selectMemberships = createSelector(selectMembershipsState, (s) => s.items)
export const selectMembershipsIsLoading = createSelector(selectMembershipsState, (s) => s.isLoading)
export const selectMembershipsError = createSelector(selectMembershipsState, (s) => s.error)

export const selectActiveMemberships = createSelector(selectMemberships, (memberships) =>
  memberships.filter((m) => m.isActive)
)

export const selectMembershipsByRole = (role: string) =>
  createSelector(selectMemberships, (memberships) =>
    memberships.filter((m) => m.role === role)
  )
