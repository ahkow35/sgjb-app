import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'

/**
 * Authoritative admin check. Reads `is_admin` straight from the database rather
 * than trusting the session JWT, so revoking admin takes effect immediately and
 * a stale/forged token can't grant delete rights. Use this to gate any
 * destructive admin-only action on the server.
 */
export async function isAdminUser(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return user?.isAdmin ?? false
}
