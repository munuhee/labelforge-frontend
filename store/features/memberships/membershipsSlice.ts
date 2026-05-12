import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiFetch, buildQuery } from '../../utils/apiFetch'

export interface Membership {
  id: string
  userId: string
  name: string
  email: string
  department?: string
  isActive: boolean
  role: string
  joinedAt?: string
}

export interface MembershipsState {
  items: Membership[]
  isLoading: boolean
  error: string | null
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchMemberships = createAsyncThunk(
  'memberships/fetchAll',
  async (params: Record<string, string> | undefined, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/memberships${buildQuery(params)}`) as Membership[]
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch memberships')
    }
  }
)

export const addMembership = createAsyncThunk(
  'memberships/add',
  async (
    data: { userId?: string; email?: string; role: string; clientId?: string },
    { rejectWithValue }
  ) => {
    try {
      return await apiFetch('/api/memberships', {
        method: 'POST',
        body: JSON.stringify(data),
      }) as Membership
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to add membership')
    }
  }
)

export const updateMembershipRole = createAsyncThunk(
  'memberships/updateRole',
  async ({ membershipId, role }: { membershipId: string; role: string }, { rejectWithValue }) => {
    try {
      return await apiFetch('/api/memberships', {
        method: 'PATCH',
        body: JSON.stringify({ membershipId, action: 'update-role', role }),
      })
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to update role')
    }
  }
)

export const deactivateMembership = createAsyncThunk(
  'memberships/deactivate',
  async (membershipId: string, { rejectWithValue }) => {
    try {
      return await apiFetch('/api/memberships', {
        method: 'PATCH',
        body: JSON.stringify({ membershipId, action: 'deactivate' }),
      })
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to deactivate')
    }
  }
)

export const reactivateMembership = createAsyncThunk(
  'memberships/reactivate',
  async (membershipId: string, { rejectWithValue }) => {
    try {
      return await apiFetch('/api/memberships', {
        method: 'PATCH',
        body: JSON.stringify({ membershipId, action: 'reactivate' }),
      })
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to reactivate')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const membershipsSlice = createSlice({
  name: 'memberships',
  initialState: { items: [], isLoading: false, error: null } as MembershipsState,
  reducers: {
    clearMembershipsError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMemberships.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchMemberships.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(fetchMemberships.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(addMembership.fulfilled, (state, action) => {
        state.items.push(action.payload)
      })
  },
})

export const { clearMembershipsError } = membershipsSlice.actions
export default membershipsSlice.reducer
