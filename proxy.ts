import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

const PUBLIC_PATHS = [
  '/',
  '/login',         // Super Admin login
  '/verify-otp',
  '/api/auth/login',
  '/api/auth/verify-otp',
]

// /[clientSlug]/login is publicly accessible
const CLIENT_LOGIN_RE = /^\/[a-z0-9-]+\/login$/

// Matches /[clientSlug]/dashboard/... — rewritten to /dashboard/...
const CLIENT_DASHBOARD_RE = /^\/([a-z0-9-]+)(\/dashboard(?:\/.*)?)?$/

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths and auth sub-routes
  const isPublic =
    PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith('/api/auth/')) ||
    CLIENT_LOGIN_RE.test(pathname) ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/public/')

  if (isPublic) return NextResponse.next()

  // ── Token validation ─────────────────────────────────────────────────────
  const token = request.cookies.get('lf_token')?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  const payload = await verifyToken(token)
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.delete('lf_token')
    return response
  }

  const isSuperAdmin = payload.role === 'super_admin'

  // ── Client-slug dashboard rewriting ─────────────────────────────────────
  // Only rewrite /[clientSlug]/dashboard/... → /dashboard/...
  // Other slug paths (like /[clientSlug]/login) are served by their own page files.
  const dashMatch = CLIENT_DASHBOARD_RE.exec(pathname)
  const urlSlug = dashMatch?.[1]
  const dashboardPart = dashMatch?.[2]

  if (urlSlug && dashboardPart && !pathname.startsWith('/api/')) {
    // Non-super_admin must have a matching token clientSlug
    if (!isSuperAdmin && payload.clientSlug && payload.clientSlug !== urlSlug) {
      return NextResponse.redirect(
        new URL(`/${payload.clientSlug}/dashboard`, request.url)
      )
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-user-email', payload.email)
    requestHeaders.set('x-user-role', payload.role)
    if (payload.tenantId) requestHeaders.set('x-tenant-id', payload.tenantId)
    requestHeaders.set('x-client-slug', payload.clientSlug ?? urlSlug)
    if (payload.impersonatedBy) requestHeaders.set('x-impersonated-by', payload.impersonatedBy)

    // Rewrite /[slug]/dashboard/... → /dashboard/...
    const rewrittenUrl = new URL(dashboardPart, request.url)
    return NextResponse.rewrite(rewrittenUrl, { request: { headers: requestHeaders } })
  }

  // ── All other authenticated paths (API routes, /dashboard/..., etc.) ────
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.userId)
  requestHeaders.set('x-user-email', payload.email)
  requestHeaders.set('x-user-role', payload.role)
  if (payload.tenantId) requestHeaders.set('x-tenant-id', payload.tenantId)
  if (payload.clientSlug) requestHeaders.set('x-client-slug', payload.clientSlug)
  if (payload.impersonatedBy) requestHeaders.set('x-impersonated-by', payload.impersonatedBy)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
