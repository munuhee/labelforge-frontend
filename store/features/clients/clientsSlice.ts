import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiFetch } from '../../utils/apiFetch'

export interface Client {
  id: string
  name: string
  slug: string
  description?: string
  logoUrl?: string
  isActive: boolean
  plan: string
  settings?: Record<string, unknown>
  createdAt?: string
}

export interface ClientsState {
  items: Client[]
  isLoading: boolean
  error: string | null
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchClients = createAsyncThunk(
  'clients/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await apiFetch('/api/clients') as Client[]
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch clients')
    }
  }
)

export const createClient = createAsyncThunk(
  'clients/create',
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      return await apiFetch('/api/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      }) as Client
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to create client')
    }
  }
)

export const updateClient = createAsyncThunk(
  'clients/update',
  async ({ id, data }: { id: string; data: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to update client')
    }
  }
)

export const deactivateClient = createAsyncThunk(
  'clients/deactivate',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiFetch(`/api/clients/${id}`, { method: 'DELETE' })
      return id
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to deactivate client')
    }
  }
)

export const activateClient = createAsyncThunk(
  'clients/activate',
  async (id: string, { rejectWithValue }) => {
    try {
      return await apiFetch(`/api/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'activate' }),
      })
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to activate client')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const clientsSlice = createSlice({
  name: 'clients',
  initialState: { items: [], isLoading: false, error: null } as ClientsState,
  reducers: {
    clearClientsError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
      })
      .addCase(deactivateClient.fulfilled, (state, action) => {
        const idx = state.items.findIndex((c) => c.id === action.payload)
        if (idx !== -1) state.items[idx].isActive = false
      })
  },
})

export const { clearClientsError } = clientsSlice.actions
export default clientsSlice.reducer
