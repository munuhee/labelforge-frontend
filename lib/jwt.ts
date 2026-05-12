import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'labelforge-super-secret-jwt-key-change-in-production'
)

export interface TokenPayload extends JWTPayload {
  userId: string
  email: string
  role: string
  /** MongoDB ObjectId of the active client (absent for super_admin acting globally) */
  tenantId?: string
  /** URL slug of the active client, e.g. "acme-corp" */
  clientSlug?: string
  /** Set during super_admin impersonation — userId of the admin who initiated it */
  impersonatedBy?: string
}

export async function signToken(payload: Omit<TokenPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as TokenPayload
  } catch {
    return null
  }
}
