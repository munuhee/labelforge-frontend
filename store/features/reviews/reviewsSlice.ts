import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiFetch, buildQuery } from '../../utils/apiFetch'

export interface Review {
  id: string
  tenantId?: string
  taskId: string
  taskTitle: string
  batchId: string
  batchTitle: string
  workflowId: string
  annotatorId: string
  annotatorEmail: string
  annotatorName: string
  reviewerId?: string | null
  reviewerEmail?: string
  reviewerName?: string
  status: string
  decision?: string
  comments?: string
  qualityScore?: number
  submittedAt?: string
  reviewedAt?: string
  createdAt?: string
}

export interface ReviewsState {
  items: Review[]
  current: Review | null
  isLoading: boolean
  error: string | null
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchReviews = createAsyncThunk(
  'reviews/fetchAll',
  async (params: Record<string, string> | undefined, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/reviews${buildQuery(params)}`) as Review[]
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch reviews')
    }
  }
)

export const fetchReview = createAsyncThunk(
  'reviews/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/reviews/${id}`) as Review
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch review')
    }
  }
)

export const claimReview = createAsyncThunk(
  'reviews/claim',
  async (id: string, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/reviews/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'claim' }),
      }) as Review
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to claim review')
    }
  }
)

export const decideReview = createAsyncThunk(
  'reviews/decide',
  async ({ id, data }: { id: string; data: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/reviews/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'decide', ...data }),
      }) as Review
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Review decision failed')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState: { items: [], current: null, isLoading: false, error: null } as ReviewsState,
  reducers: {
    clearReviewsError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchReview.fulfilled, (state, action) => {
        state.current = action.payload
      })
      .addCase(claimReview.fulfilled, (state, action) => {
        const idx = state.items.findIndex((r) => r.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(decideReview.fulfilled, (state, action) => {
        const idx = state.items.findIndex((r) => r.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
        if (state.current?.id === action.payload.id) state.current = action.payload
      })
  },
})

export const { clearReviewsError } = reviewsSlice.actions
export default reviewsSlice.reducer
