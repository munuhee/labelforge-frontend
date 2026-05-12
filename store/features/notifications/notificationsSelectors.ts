import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../index'

export const selectNotificationsState = (state: RootState) => state.notifications

export const selectNotifications = createSelector(selectNotificationsState, (s) => s.items)
export const selectNotificationsIsLoading = createSelector(selectNotificationsState, (s) => s.isLoading)
export const selectNotificationsError = createSelector(selectNotificationsState, (s) => s.error)

export const selectUnreadNotifications = createSelector(selectNotifications, (items) =>
  items.filter((n) => !n.read)
)

export const selectUnreadCount = createSelector(
  selectUnreadNotifications,
  (unread) => unread.length
)

export const selectHasUnread = createSelector(selectUnreadCount, (count) => count > 0)
