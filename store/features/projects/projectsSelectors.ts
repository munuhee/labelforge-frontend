import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../index'

export const selectProjectsState = (state: RootState) => state.projects

export const selectProjects = createSelector(selectProjectsState, (s) => s.items)
export const selectProjectsIsLoading = createSelector(selectProjectsState, (s) => s.isLoading)
export const selectProjectsError = createSelector(selectProjectsState, (s) => s.error)

export const selectActiveProjects = createSelector(selectProjects, (projects) =>
  projects.filter((p) => p.isActive)
)

export const selectProjectById = (id: string) =>
  createSelector(selectProjects, (projects) => projects.find((p) => p.id === id) ?? null)
