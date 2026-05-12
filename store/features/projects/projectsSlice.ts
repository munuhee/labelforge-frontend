import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiFetch, buildQuery } from '../../utils/apiFetch'

export interface Project {
  id: string
  tenantId: string
  name: string
  description?: string
  guidelines?: string
  taskTypes: string[]
  workflowStages: string[]
  isActive: boolean
  createdAt?: string
}

export interface ProjectsState {
  items: Project[]
  isLoading: boolean
  error: string | null
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async (params: Record<string, string> | undefined, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/projects${buildQuery(params)}`) as Project[]
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch projects')
    }
  }
)

export const createProject = createAsyncThunk(
  'projects/create',
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      return await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }) as Project
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to create project')
    }
  }
)

export const updateProject = createAsyncThunk(
  'projects/update',
  async ({ id, data }: { id: string; data: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to update project')
    }
  }
)

export const deleteProject = createAsyncThunk(
  'projects/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiFetch(`/api/projects/${id}`, { method: 'DELETE' })
      return id
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to delete project')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const projectsSlice = createSlice({
  name: 'projects',
  initialState: { items: [], isLoading: false, error: null } as ProjectsState,
  reducers: {
    clearProjectsError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p.id !== action.payload)
      })
  },
})

export const { clearProjectsError } = projectsSlice.actions
export default projectsSlice.reducer
