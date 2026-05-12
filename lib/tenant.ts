import { NextRequest, NextResponse } from 'next/server'

/**
 * Reads tenant context injected by the middleware from request headers.
 */
export function getTenantContext(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    clientSlug: req.headers.get('x-client-slug') ?? '',
    userId: req.headers.get('x-user-id') ?? '',
    email: req.headers.get('x-user-email') ?? '',
    role: req.headers.get('x-user-role') ?? '',
  }
}

/**
 * Enforces tenant context on an API route handler.
 * - super_admin: always passes through (tenantId may be empty — they act globally)
 * - all other roles: must have a tenantId or receive a 403
 */
export function requireTenant(req: NextRequest): {
  tenantId: string
  userId: string
  email: string
  role: string
} | NextResponse {
  const role    = req.headers.get('x-user-role')   ?? ''
  const tenantId = req.headers.get('x-tenant-id')  ?? ''
  const userId  = req.headers.get('x-user-id')     ?? ''
  const email   = req.headers.get('x-user-email')  ?? ''

  // super_admin operates globally — no tenant binding required
  if (role === 'super_admin') {
    return { tenantId, userId, email, role }
  }

  if (!tenantId) {
    return NextResponse.json({ error: 'Client context required' }, { status: 403 })
  }

  return { tenantId, userId, email, role }
}

export function isSuperAdmin(role: string)        { return role === 'super_admin' }
export function isClientAdmin(role: string)       { return role === 'client_admin' || role === 'super_admin' }
export function isQaOrAbove(role: string)         { return role === 'qa_lead' || isClientAdmin(role) }
export function isReviewerOrAbove(role: string)   { return role === 'reviewer' || role === 'reviewer_annotator' || isQaOrAbove(role) }
export function isFieldWorker(role: string)        { return role === 'annotator' || role === 'reviewer' || role === 'reviewer_annotator' }

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 })
}

/** Returns true if the string is a valid 24-char hex MongoDB ObjectId. */
export function isValidObjectId(id: string): boolean {
  return !!id && /^[0-9a-f]{24}$/i.test(id)
}
