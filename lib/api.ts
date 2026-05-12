const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// ── In-memory TTL cache + in-flight deduplication ────────────────────────────
type CacheEntry = { data: unknown; expiresAt: number }
const _cache = new Map<string, CacheEntry>()
const _inFlight = new Map<string, Promise<unknown>>()

function _get(key: string): unknown | null {
  const e = _cache.get(key)
  if (!e) return null
  if (Date.now() > e.expiresAt) { _cache.delete(key); return null }
  return e.data
}

function _set(key: string, data: unknown, ttl: number) {
  _cache.set(key, { data, expiresAt: Date.now() + ttl })
}

function _bust(prefix: string) {
  for (const k of _cache.keys()) if (k.startsWith(prefix)) _cache.delete(k)
}

const TIMEOUT_MS = 12_000

async function apiFetch(path: string, options: RequestInit = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })

    if (res.status === 401) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/' && !path.startsWith('/api/auth/')) {
        window.location.href = '/'
      }
      throw new Error('Session expired')
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || 'Request failed')
    }
    return res.json()
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out — check that the backend server is running')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function cachedGet(path: string, ttl: number): Promise<unknown> {
  const hit = _get(path)
  if (hit !== null) return hit

  const inflight = _inFlight.get(path)
  if (inflight) return inflight

  const p = apiFetch(path)
    .then(data => { _set(path, data, ttl); return data })
    .finally(() => _inFlight.delete(path))

  _inFlight.set(path, p)
  return p
}

const TTL = {
  clients:       60_000,
  users:         30_000,
  analytics:     30_000,
  workflows:     30_000,
  batches:       20_000,
  memberships:   30_000,
  notifications: 15_000,
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    verifyOtp: (email: string, otp: string, clientSlug?: string) =>
      apiFetch('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp, clientSlug }) }),
    logout: () => apiFetch('/api/auth/logout', { method: 'POST' }),
    me: () => apiFetch('/api/auth/me'),
    impersonate: (targetUserId: string, clientSlug: string) =>
      apiFetch('/api/auth/impersonate', { method: 'POST', body: JSON.stringify({ targetUserId, clientSlug }) }),
  },

  clients: {
    list: () => cachedGet('/api/clients', TTL.clients),
    get: (id: string) => apiFetch(`/api/clients/${id}`),
    create: (data: Record<string, unknown>) =>
      apiFetch('/api/clients', { method: 'POST', body: JSON.stringify(data) })
        .then(r => { _bust('/api/clients'); return r }),
    update: (id: string, data: Record<string, unknown>) =>
      apiFetch(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) })
        .then(r => { _bust('/api/clients'); return r }),
    deactivate: (id: string) =>
      apiFetch(`/api/clients/${id}`, { method: 'DELETE' })
        .then(r => { _bust('/api/clients'); return r }),
    activate: (id: string) =>
      apiFetch(`/api/clients/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'activate' }) })
        .then(r => { _bust('/api/clients'); return r }),
  },

  projects: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : ''
      return apiFetch(`/api/projects${q}`)
    },
    get: (id: string) => apiFetch(`/api/projects/${id}`),
    create: (data: Record<string, unknown>) =>
      apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      apiFetch(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/api/projects/${id}`, { method: 'DELETE' }),
  },

  memberships: {
    list: () => cachedGet('/api/memberships', TTL.memberships),
    listForClient: (clientId: string) =>
      cachedGet(`/api/memberships?clientId=${clientId}`, TTL.memberships),
    listForClientSlug: (clientSlug: string) =>
      cachedGet(`/api/memberships?clientSlug=${clientSlug}`, TTL.memberships),
    add: (data: { userId?: string; email?: string; role: string }) =>
      apiFetch('/api/memberships', { method: 'POST', body: JSON.stringify(data) })
        .then(r => { _bust('/api/memberships'); _bust('/api/users'); return r }),
    addToClient: (clientId: string, data: { email: string; role: string }) =>
      apiFetch('/api/memberships', { method: 'POST', body: JSON.stringify({ ...data, clientId }) })
        .then(r => { _bust('/api/memberships'); _bust('/api/users'); return r }),
    updateRole: (membershipId: string, role: string) =>
      apiFetch('/api/memberships', { method: 'PATCH', body: JSON.stringify({ membershipId, action: 'update-role', role }) })
        .then(r => { _bust('/api/memberships'); _bust('/api/users'); return r }),
    deactivate: (membershipId: string) =>
      apiFetch('/api/memberships', { method: 'PATCH', body: JSON.stringify({ membershipId, action: 'deactivate' }) })
        .then(r => { _bust('/api/memberships'); _bust('/api/users'); return r }),
    reactivate: (membershipId: string) =>
      apiFetch('/api/memberships', { method: 'PATCH', body: JSON.stringify({ membershipId, action: 'reactivate' }) })
        .then(r => { _bust('/api/memberships'); _bust('/api/users'); return r }),
  },

  workflows: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : ''
      return cachedGet(`/api/workflows${q}`, TTL.workflows)
    },
    get: (id: string) => apiFetch(`/api/workflows/${id}`),
    create: (data: Record<string, unknown>) =>
      apiFetch('/api/workflows', { method: 'POST', body: JSON.stringify(data) })
        .then(r => { _bust('/api/workflows'); return r }),
    update: (id: string, data: Record<string, unknown>) =>
      apiFetch(`/api/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) })
        .then(r => { _bust('/api/workflows'); return r }),
    delete: (id: string) =>
      apiFetch(`/api/workflows/${id}`, { method: 'DELETE' })
        .then(r => { _bust('/api/workflows'); return r }),
    assign: (id: string, userId: string) =>
      apiFetch(`/api/workflows/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'assign', userId }) })
        .then(r => { _bust('/api/workflows'); return r }),
    unassign: (id: string, userId: string) =>
      apiFetch(`/api/workflows/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'unassign', userId }) })
        .then(r => { _bust('/api/workflows'); return r }),
  },

  batches: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : ''
      return cachedGet(`/api/batches${q}`, TTL.batches)
    },
    get: (id: string) => apiFetch(`/api/batches/${id}`),
    create: (data: Record<string, unknown>) =>
      apiFetch('/api/batches', { method: 'POST', body: JSON.stringify(data) })
        .then(r => { _bust('/api/batches'); return r }),
    update: (id: string, data: Record<string, unknown>) =>
      apiFetch(`/api/batches/${id}`, { method: 'PUT', body: JSON.stringify(data) })
        .then(r => { _bust('/api/batches'); return r }),
    delete: (id: string) =>
      apiFetch(`/api/batches/${id}`, { method: 'DELETE' })
        .then(r => { _bust('/api/batches'); return r }),
  },

  tasks: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : ''
      return apiFetch(`/api/tasks${q}`)
    },
    get: (id: string) => apiFetch(`/api/tasks/${id}`),
    create: (data: Record<string, unknown>) =>
      apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(data) })
        .then(r => { _bust('/api/batches'); _bust('/api/analytics'); return r }),
    action: (id: string, action: string, extras?: Record<string, unknown>) =>
      apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ action, ...extras }) })
        .then(r => { _bust('/api/analytics'); return r }),
    signOff: (id: string, qualityScore: number, comments?: string) =>
      apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'sign-off', qualityScore, comments }) })
        .then(r => { _bust('/api/analytics'); return r }),
    requestRework: (id: string, comment: string) =>
      apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'request-rework', comment }) })
        .then(r => { _bust('/api/analytics'); return r }),
    addErrorTag: (id: string, tag: Record<string, unknown>) =>
      apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'add-error-tag', tag }) }),
    removeErrorTag: (id: string, tagId: string) =>
      apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'remove-error-tag', tagId }) }),
    resolveErrorTag: (id: string, tagId: string) =>
      apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'resolve-error-tag', tagId }) }),
    bulkImport: (batchId: string, tasks: Record<string, unknown>[], metadata?: Record<string, unknown>) =>
      apiFetch('/api/tasks/bulk', { method: 'POST', body: JSON.stringify({ batchId, tasks, metadata }) })
        .then(r => { _bust('/api/batches'); _bust('/api/analytics'); return r }),
    delete: (id: string) =>
      apiFetch(`/api/tasks/${id}`, { method: 'DELETE' })
        .then(r => { _bust('/api/batches'); _bust('/api/analytics'); return r }),
  },

  reviews: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : ''
      return apiFetch(`/api/reviews${q}`)
    },
    get: (id: string) => apiFetch(`/api/reviews/${id}`),
    claim: (id: string) =>
      apiFetch(`/api/reviews/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'claim' }) })
        .then(r => { _bust('/api/analytics'); return r }),
    decide: (id: string, data: Record<string, unknown>) =>
      apiFetch(`/api/reviews/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'decide', ...data }) })
        .then(r => { _bust('/api/analytics'); return r }),
  },

  notifications: {
    list: () => cachedGet('/api/notifications', TTL.notifications),
    markRead: (id: string) =>
      apiFetch(`/api/notifications/${id}`, { method: 'PATCH' })
        .then(r => { _bust('/api/notifications'); return r }),
    markAllRead: () =>
      apiFetch('/api/notifications', { method: 'PUT', body: JSON.stringify({ markAllRead: true }) })
        .then(r => { _bust('/api/notifications'); return r }),
  },

  analytics: {
    get: (params?: Record<string, string>) => {
      const q = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''
      return cachedGet(`/api/analytics${q}`, TTL.analytics)
    },
  },

  users: {
    list: (params?: Record<string, string>) => {
      const q = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''
      return cachedGet(`/api/users${q}`, TTL.users)
    },
    create: (data: Record<string, unknown>) =>
      apiFetch('/api/users', { method: 'POST', body: JSON.stringify(data) })
        .then(r => { _bust('/api/users'); return r }),
    update: (id: string, data: Record<string, unknown>) =>
      apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })
        .then(r => { _bust('/api/users'); return r }),
    awardBadge: (id: string, badge: Record<string, unknown>) =>
      apiFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'award-badge', badge }) })
        .then(r => { _bust('/api/users'); return r }),
    removeBadge: (id: string, badge: Record<string, unknown>) =>
      apiFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'remove-badge', badge }) })
        .then(r => { _bust('/api/users'); return r }),
  },
}
