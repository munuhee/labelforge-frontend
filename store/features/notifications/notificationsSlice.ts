import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiFetch } from '../../utils/apiFetch'

export interface Notification {
  id: string
  tenantId?: string
  userId: string
  type: string
  title: string
  message: string
  read: boolean
  actionUrl?: string
  createdAt?: string
}

export interface NotificationsState {
  items: Notification[]
  isLoading: boolean
  error: string | null
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await apiFetch('/api/notifications') as Notification[]
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch notifications')
    }
  }
)

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id: string, { rejectWithValue }) => {
    try {
      const result = await apiFetch(`/api/notifications/${id}`, { method: 'PATCH' })
      return { id, ...result }
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to mark as read')
    }
  }
)

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await apiFetch('/api/notifications', {
        method: 'PUT',
        body: JSON.stringify({ markAllRead: true }),
      })
      return true
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to mark all as read')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], isLoading: false, error: null } as NotificationsState,
  reducers: {
    clearNotificationsError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const n = state.items.find((n) => n.id === action.payload.id)
        if (n) n.read = true
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items.forEach((n) => { n.read = true })
      })
  },
})

export const { clearNotificationsError } = notificationsSlice.actions
export default notificationsSlice.reducer
