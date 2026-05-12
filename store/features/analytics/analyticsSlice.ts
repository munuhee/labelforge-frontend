import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiFetch, buildQuery } from '../../utils/apiFetch'

export interface AnalyticsData {
  tasksCompletedByDay: { date: string; count: number }[]
  tasksByType: { type: string; count: number }[]
  qualityScoresTrend: { date: string; score: number }[]
  annotatorPerformance: {
    id: string
    name: string
    email: string
    tasksCompleted: number
    averageQuality: number
    averageTimeMinutes: number
    totalToolUsageHours: number
  }[]
  reviewerActivity: {
    id: string
    name: string
    email: string
    reviewsCompleted: number
    approvalRate: number
    averageReviewTime: number
  }[]
  batchProgress: {
    id: string
    title: string
    tasksTotal: number
    tasksCompleted: number
    status: string
  }[]
  summary: {
    totalUsers: number
    totalAnnotators: number
    totalReviewers: number
    activeTasks: number
    completedTasks: number
    pendingReviews: number
    averageQualityScore: number
  }
}

export interface AnalyticsState {
  data: AnalyticsData | null
  isLoading: boolean
  error: string | null
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchAnalytics = createAsyncThunk(
  'analytics/fetch',
  async (params: Record<string, string> | undefined, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/analytics${buildQuery(params)}`) as AnalyticsData
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch analytics')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: { data: null, isLoading: false, error: null } as AnalyticsState,
  reducers: {
    clearAnalyticsError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalytics.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.isLoading = false
        state.data = action.payload
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { clearAnalyticsError } = analyticsSlice.actions
export default analyticsSlice.reducer
