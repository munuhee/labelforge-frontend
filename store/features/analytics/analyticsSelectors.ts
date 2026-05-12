import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../index'

export const selectAnalyticsState = (state: RootState) => state.analytics

export const selectAnalyticsData = createSelector(selectAnalyticsState, (s) => s.data)
export const selectAnalyticsSummary = createSelector(selectAnalyticsState, (s) => s.data?.summary ?? null)
export const selectAnnotatorPerformance = createSelector(selectAnalyticsState, (s) => s.data?.annotatorPerformance ?? [])
export const selectReviewerActivity = createSelector(selectAnalyticsState, (s) => s.data?.reviewerActivity ?? [])
export const selectBatchProgress = createSelector(selectAnalyticsState, (s) => s.data?.batchProgress ?? [])
export const selectTasksCompletedByDay = createSelector(selectAnalyticsState, (s) => s.data?.tasksCompletedByDay ?? [])
export const selectQualityScoresTrend = createSelector(selectAnalyticsState, (s) => s.data?.qualityScoresTrend ?? [])
export const selectAnalyticsIsLoading = createSelector(selectAnalyticsState, (s) => s.isLoading)
export const selectAnalyticsError = createSelector(selectAnalyticsState, (s) => s.error)
