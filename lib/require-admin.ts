import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isAdminUser } from '@/lib/admin'

/**
 * Gate for admin-only routes. Returns a 401/403 `NextResponse` for the caller
 * to return directly, or `null` when the request comes from a verified admin.
 *
 * Admin is re-checked against the DB (via `isAdminUser`), never trusted from
 * the session token, so revoking admin takes effect immediately. Lives in its
 * own module rather than `lib/admin.ts` so it can be mocked independently of
 * `isAdminUser` in tests.
 *
 * Usage:
 *   const denied = await requireAdmin()
 *   if (denied) return denied
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }
  if (!(await isAdminUser(userId))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  return null
}
