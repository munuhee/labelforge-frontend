import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiFetch, buildQuery } from '../../utils/apiFetch'

export interface Workflow {
  id: string
  tenantId: string
  projectId?: string
  name: string
  description: string
  type: string
  isActive: boolean
  assignedUsers: string[]
  batchCount: number
  taskCount: number
  createdAt?: string
  batches?: unknown[]
}

export interface WorkflowsState {
  items: Workflow[]
  current: Workflow | null
  isLoading: boolean
  error: string | null
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchWorkflows = createAsyncThunk(
  'workflows/fetchAll',
  async (params: Record<string, string> | undefined, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/workflows${buildQuery(params)}`) as Workflow[]
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch workflows')
    }
  }
)

export const fetchWorkflow = createAsyncThunk(
  'workflows/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/workflows/${id}`) as Workflow
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch workflow')
    }
  }
)

export const createWorkflow = createAsyncThunk(
  'workflows/create',
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      return await apiFetch('/api/workflows', {
        method: 'POST',
        body: JSON.stringify(data),
      }) as Workflow
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to create workflow')
    }
  }
)

export const updateWorkflow = createAsyncThunk(
  'workflows/update',
  async ({ id, data }: { id: string; data: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/workflows/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }) as Workflow
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to update workflow')
    }
  }
)

export const patchWorkflow = createAsyncThunk(
  'workflows/patch',
  async (
    { id, action, userId }: { id: string; action: string; userId: string },
    { rejectWithValue }
  ) => {
    try {
      return await apiFetch(`/api/workflows/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, userId }),
      })
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Workflow patch failed')
    }
  }
)

export const deleteWorkflow = createAsyncThunk(
  'workflows/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiFetch(`/api/workflows/${id}`, { method: 'DELETE' })
      return id
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to delete workflow')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const workflowsSlice = createSlice({
  name: 'workflows',
  initialState: { items: [], current: null, isLoading: false, error: null } as WorkflowsState,
  reducers: {
    clearWorkflowsError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkflows.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchWorkflows.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(fetchWorkflows.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchWorkflow.fulfilled, (state, action) => {
        state.current = action.payload
      })
      .addCase(createWorkflow.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
      })
      .addCase(updateWorkflow.fulfilled, (state, action) => {
        const idx = state.items.findIndex((w) => w.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(deleteWorkflow.fulfilled, (state, action) => {
        state.items = state.items.filter((w) => w.id !== action.payload)
      })
  },
})

export const { clearWorkflowsError } = workflowsSlice.actions
export default workflowsSlice.reducer
