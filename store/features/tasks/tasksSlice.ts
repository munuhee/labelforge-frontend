import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { apiFetch, buildQuery } from '../../utils/apiFetch'

export interface Task {
  id: string
  tenantId?: string
  projectId?: string
  batchId: string
  batchTitle: string
  workflowId: string
  workflowName: string
  title: string
  description: string
  taskType: string
  status: string
  isLocked: boolean
  priority: number
  difficulty?: 'easy' | 'medium' | 'hard'
  languageTags?: string[]
  sla?: string
  externalUrl?: string
  estimatedDuration: number
  actualDuration?: number
  annotatorId?: string | null
  annotatorEmail?: string
  reviewerId?: string | null
  reviewerEmail?: string
  feedback?: string
  qualityScore?: number
  notes?: string
  errorTags: unknown[]
  activityLog: unknown[]
  startedAt?: string
  completedAt?: string
  submittedAt?: string
  signedOffAt?: string
  createdAt?: string
  review?: unknown
}

export interface TasksState {
  items: Task[]
  current: Task | null
  isLoading: boolean
  error: string | null
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchTasks = createAsyncThunk(
  'tasks/fetchAll',
  async (params: Record<string, string> | undefined, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/tasks${buildQuery(params)}`) as Task[]
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch tasks')
    }
  }
)

export const fetchTask = createAsyncThunk(
  'tasks/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/tasks/${id}`) as Task
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch task')
    }
  }
)

export const createTask = createAsyncThunk(
  'tasks/create',
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      return await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(data) }) as Task
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to create task')
    }
  }
)

export const taskAction = createAsyncThunk(
  'tasks/action',
  async (
    { id, action, extras }: { id: string; action: string; extras?: Record<string, unknown> },
    { rejectWithValue }
  ) => {
    try {
      return await apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, ...extras }),
      }) as Task
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Task action failed')
    }
  }
)

export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' })
      return id
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to delete task')
    }
  }
)

export const bulkImportTasks = createAsyncThunk(
  'tasks/bulkImport',
  async (
    {
      batchId,
      tasks,
      metadata,
    }: { batchId: string; tasks: Record<string, unknown>[]; metadata?: Record<string, unknown> },
    { rejectWithValue }
  ) => {
    try {
      return await apiFetch('/api/tasks/bulk', {
        method: 'POST',
        body: JSON.stringify({ batchId, tasks, metadata }),
      })
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Bulk import failed')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: { items: [], current: null, isLoading: false, error: null } as TasksState,
  reducers: {
    clearCurrentTask(state) {
      state.current = null
    },
    clearTasksError(state) {
      state.error = null
    },
    updateTaskInList(state, action: PayloadAction<Task>) {
      const idx = state.items.findIndex((t) => t.id === action.payload.id)
      if (idx !== -1) state.items[idx] = action.payload
      if (state.current?.id === action.payload.id) state.current = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchTask.fulfilled, (state, action) => {
        state.current = action.payload
        const idx = state.items.findIndex((t) => t.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
      })
      .addCase(taskAction.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
        if (state.current?.id === action.payload.id) state.current = action.payload
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t.id !== action.payload)
      })
  },
})

export const { clearCurrentTask, clearTasksError, updateTaskInList } = tasksSlice.actions
export default tasksSlice.reducer
