const API_BASE = ''

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(e.error || 'Request failed')
  }
  return res.json()
}

export function buildQuery(params?: Record<string, string>) {
  return params ? '?' + new URLSearchParams(params).toString() : ''
}
