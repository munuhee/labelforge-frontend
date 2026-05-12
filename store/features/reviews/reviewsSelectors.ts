import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../index'

export const selectReviewsState = (state: RootState) => state.reviews

export const selectReviews = createSelector(selectReviewsState, (s) => s.items)
export const selectCurrentReview = createSelector(selectReviewsState, (s) => s.current)
export const selectReviewsIsLoading = createSelector(selectReviewsState, (s) => s.isLoading)
export const selectReviewsError = createSelector(selectReviewsState, (s) => s.error)

export const selectPendingReviews = createSelector(selectReviews, (reviews) =>
  reviews.filter((r) => r.status === 'pending')
)

export const selectReviewsByAnnotator = (annotatorId: string) =>
  createSelector(selectReviews, (reviews) =>
    reviews.filter((r) => r.annotatorId === annotatorId)
  )

export const selectReviewById = (id: string) =>
  createSelector(selectReviews, (reviews) => reviews.find((r) => r.id === id) ?? null)
