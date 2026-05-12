import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiFetch, buildQuery } from '../../utils/apiFetch'

export interface User {
  id: string
  name: string
  email: string
  role: string
  department?: string
  isActive: boolean
  badges: unknown[]
  createdAt?: string
}

export interface UsersState {
  items: User[]
  isLoading: boolean
  error: string | null
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (params: Record<string, string> | undefined, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/users${buildQuery(params)}`) as User[]
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch users')
    }
  }
)

export const createUser = createAsyncThunk(
  'users/create',
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      return await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(data) }) as User
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to create user')
    }
  }
)

export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, data }: { id: string; data: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }) as User
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to update user')
    }
  }
)

export const awardBadge = createAsyncThunk(
  'users/awardBadge',
  async ({ id, badge }: { id: string; badge: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'award-badge', badge }),
      })
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to award badge')
    }
  }
)

export const removeBadge = createAsyncThunk(
  'users/removeBadge',
  async ({ id, badge }: { id: string; badge: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'remove-badge', badge }),
      })
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to remove badge')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const usersSlice = createSlice({
  name: 'users',
  initialState: { items: [], isLoading: false, error: null } as UsersState,
  reducers: {
    clearUsersError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.items.push(action.payload)
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        const idx = state.items.findIndex((u) => u.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
  },
})

export const { clearUsersError } = usersSlice.actions
export default usersSlice.reducer
