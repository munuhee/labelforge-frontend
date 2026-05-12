import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../index'

export const selectClientsState = (state: RootState) => state.clients

export const selectClients = createSelector(selectClientsState, (s) => s.items)
export const selectClientsIsLoading = createSelector(selectClientsState, (s) => s.isLoading)
export const selectClientsError = createSelector(selectClientsState, (s) => s.error)

export const selectActiveClients = createSelector(selectClients, (clients) =>
  clients.filter((c) => c.isActive)
)

export const selectClientBySlug = (slug: string) =>
  createSelector(selectClients, (clients) => clients.find((c) => c.slug === slug) ?? null)
