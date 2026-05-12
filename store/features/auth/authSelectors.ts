import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../index'

export const selectAuthState = (state: RootState) => state.auth

export const selectUser = createSelector(selectAuthState, (auth) => auth.user)
export const selectIsAuthenticated = createSelector(selectAuthState, (auth) => auth.user !== null)
export const selectUserRole = createSelector(selectAuthState, (auth) => auth.user?.role ?? null)
export const selectUserTenantId = createSelector(selectAuthState, (auth) => auth.user?.tenantId ?? null)
export const selectAuthIsLoading = createSelector(selectAuthState, (auth) => auth.isLoading)
export const selectAuthError = createSelector(selectAuthState, (auth) => auth.error)
