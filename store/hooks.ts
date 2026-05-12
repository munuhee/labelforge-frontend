import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './index'
import { selectAuthState } from './features/auth'
import { selectTasksState } from './features/tasks'
import { selectBatchesState } from './features/batches'
import { selectWorkflowsState } from './features/workflows'
import { selectUsersState } from './features/users'
import { selectClientsState } from './features/clients'
import { selectMembershipsState } from './features/memberships'
import { selectNotificationsState } from './features/notifications'
import { selectAnalyticsState } from './features/analytics'
import { selectReviewsState } from './features/reviews'
import { selectProjectsState } from './features/projects'

// ─── Core hooks ───────────────────────────────────────────────────────────────

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = <T>(selector: (state: RootState) => T) => useSelector(selector)

// ─── Feature slice hooks (return full slice state) ────────────────────────────
// For derived/computed values, import the memoized selectors from each feature
// and call useAppSelector(selectX) directly in your component.

export const useAuth = () => useAppSelector(selectAuthState)
export const useTasks = () => useAppSelector(selectTasksState)
export const useBatches = () => useAppSelector(selectBatchesState)
export const useWorkflows = () => useAppSelector(selectWorkflowsState)
export const useUsers = () => useAppSelector(selectUsersState)
export const useClients = () => useAppSelector(selectClientsState)
export const useMemberships = () => useAppSelector(selectMembershipsState)
export const useNotifications = () => useAppSelector(selectNotificationsState)
export const useAnalytics = () => useAppSelector(selectAnalyticsState)
export const useReviews = () => useAppSelector(selectReviewsState)
export const useProjects = () => useAppSelector(selectProjectsState)
