'use client'
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { UserRole } from '@/lib/types'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  tenantId?: string
  clientSlug?: string
  department?: string
  badges?: Array<{ type: string; name: string; description: string; awardedAt: string }>
  impersonatedBy?: string
}

export interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
}

// ─── Session cache ────────────────────────────────────────────────────────────

const CACHE_KEY = 'lf_user'
const CACHE_TS_KEY = 'lf_user_ts'
const REFRESH_THRESHOLD_MS = 30_000

function readCache(): AuthUser | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function cacheAge(): number {
  try {
    if (typeof window === 'undefined') return Infinity
    const ts = sessionStorage.getItem(CACHE_TS_KEY)
    return ts ? Date.now() - parseInt(ts, 10) : Infinity
  } catch {
    return Infinity
  }
}

function writeCache(u: AuthUser | null) {
  try {
    if (typeof window === 'undefined') return
    if (u) {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(u))
      sessionStorage.setItem(CACHE_TS_KEY, String(Date.now()))
    } else {
      sessionStorage.removeItem(CACHE_KEY)
      sessionStorage.removeItem(CACHE_TS_KEY)
    }
  } catch {}
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

const API_BASE = ''

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    const cached = readCache()
    if (cached && cacheAge() < REFRESH_THRESHOLD_MS) return cached
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      if (!res.ok) throw new Error('Not authenticated')
      const user = await res.json()
      writeCache(user)
      return user as AuthUser
    } catch (err: unknown) {
      if (cached) return cached
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch user')
    }
  }
)

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      return data
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Login failed')
    }
  }
)

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async (
    { email, otp, clientSlug }: { email: string; otp: string; clientSlug?: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, clientSlug }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'OTP verification failed')
      writeCache(data.user)
      return data.user as AuthUser
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'OTP verification failed')
    }
  }
)

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {})
  writeCache(null)
  if (typeof window !== 'undefined') window.location.href = '/'
})

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: readCache(), isLoading: false, error: null } as AuthState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload
      writeCache(action.payload)
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.isLoading = false
        state.user = null
        state.error = action.payload as string
      })
      .addCase(verifyOtp.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
      })
  },
})

export const { setUser, clearError } = authSlice.actions
export default authSlice.reducer
