import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../index'

export const selectWorkflowsState = (state: RootState) => state.workflows

export const selectWorkflows = createSelector(selectWorkflowsState, (s) => s.items)
export const selectCurrentWorkflow = createSelector(selectWorkflowsState, (s) => s.current)
export const selectWorkflowsIsLoading = createSelector(selectWorkflowsState, (s) => s.isLoading)
export const selectWorkflowsError = createSelector(selectWorkflowsState, (s) => s.error)

export const selectActiveWorkflows = createSelector(selectWorkflows, (workflows) =>
  workflows.filter((w) => w.isActive)
)

export const selectWorkflowById = (id: string) =>
  createSelector(selectWorkflows, (workflows) => workflows.find((w) => w.id === id) ?? null)
