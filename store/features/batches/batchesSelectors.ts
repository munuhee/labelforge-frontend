import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../index'

export const selectBatchesState = (state: RootState) => state.batches

export const selectBatches = createSelector(selectBatchesState, (s) => s.items)
export const selectCurrentBatch = createSelector(selectBatchesState, (s) => s.current)
export const selectBatchesIsLoading = createSelector(selectBatchesState, (s) => s.isLoading)
export const selectBatchesError = createSelector(selectBatchesState, (s) => s.error)

export const selectBatchById = (id: string) =>
  createSelector(selectBatches, (batches) => batches.find((b) => b.id === id) ?? null)

export const selectBatchesByStatus = (status: string) =>
  createSelector(selectBatches, (batches) => batches.filter((b) => b.status === status))
