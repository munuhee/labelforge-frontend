import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../index'

export const selectTasksState = (state: RootState) => state.tasks

export const selectTasks = createSelector(selectTasksState, (s) => s.items)
export const selectCurrentTask = createSelector(selectTasksState, (s) => s.current)
export const selectTasksIsLoading = createSelector(selectTasksState, (s) => s.isLoading)
export const selectTasksError = createSelector(selectTasksState, (s) => s.error)

export const selectTaskById = (id: string) =>
  createSelector(selectTasks, (tasks) => tasks.find((t) => t.id === id) ?? null)

export const selectTasksByStatus = (status: string) =>
  createSelector(selectTasks, (tasks) => tasks.filter((t) => t.status === status))

export const selectTasksByAnnotator = (annotatorId: string) =>
  createSelector(selectTasks, (tasks) => tasks.filter((t) => t.annotatorId === annotatorId))
