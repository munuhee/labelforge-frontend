import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiFetch, buildQuery } from '../../utils/apiFetch'

export interface Batch {
  id: string
  tenantId: string
  projectId?: string
  workflowId: string
  workflowName: string
  title: string
  description: string
  taskType: string
  priority: number
  workloadEstimate: number
  status: string
  tasksTotal: number
  tasksCompleted: number
  deadline?: string
  createdAt?: string
  tasks?: unknown[]
}

export interface BatchesState {
  items: Batch[]
  current: Batch | null
  isLoading: boolean
  error: string | null
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchBatches = createAsyncThunk(
  'batches/fetchAll',
  async (params: Record<string, string> | undefined, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/batches${buildQuery(params)}`) as Batch[]
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch batches')
    }
  }
)

export const fetchBatch = createAsyncThunk(
  'batches/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/batches/${id}`) as Batch
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch batch')
    }
  }
)

export const createBatch = createAsyncThunk(
  'batches/create',
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      return await apiFetch('/api/batches', { method: 'POST', body: JSON.stringify(data) }) as Batch
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to create batch')
    }
  }
)

export const updateBatch = createAsyncThunk(
  'batches/update',
  async ({ id, data }: { id: string; data: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/batches/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }) as Batch
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to update batch')
    }
  }
)

export const deleteBatch = createAsyncThunk(
  'batches/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiFetch(`/api/batches/${id}`, { method: 'DELETE' })
      return id
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to delete batch')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const batchesSlice = createSlice({
  name: 'batches',
  initialState: { items: [], current: null, isLoading: false, error: null } as BatchesState,
  reducers: {
    clearBatchesError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBatches.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchBatches.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(fetchBatches.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchBatch.fulfilled, (state, action) => {
        state.current = action.payload
      })
      .addCase(createBatch.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
      })
      .addCase(updateBatch.fulfilled, (state, action) => {
        const idx = state.items.findIndex((b) => b.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(deleteBatch.fulfilled, (state, action) => {
        state.items = state.items.filter((b) => b.id !== action.payload)
      })
  },
})

export const { clearBatchesError } = batchesSlice.actions
export default batchesSlice.reducer
