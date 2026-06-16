// Brute-force protection for phone + PIN login. A 6-digit PIN over guessable
// phone numbers is weak, so we lock an account after repeated failures with an
// escalating backoff. State lives in the DB (`login_attempts`) because Vercel
// serverless functions share no in-memory state.

import { db, loginAttempts } from '@/lib/db'
import { eq } from 'drizzle-orm'

export const MAX_FAILURES = 5
const BASE_LOCK_MS = 60_000 // 1 minute
const MAX_LOCK_MS = 60 * 60_000 // 1 hour

/**
 * Pure policy: given the new consecutive-failure count, how long to lock (ms).
 * Returns 0 below the threshold. At/above it: 60s, doubling per extra failure,
 * capped at 1h. Exported for unit testing.
 */
export function lockDurationMs(failedCount: number): number {
  if (failedCount < MAX_FAILURES) return 0
  return Math.min(BASE_LOCK_MS * 2 ** (failedCount - MAX_FAILURES), MAX_LOCK_MS)
}

/** True if the phone is currently locked out. */
export async function isLocked(phone: string): Promise<boolean> {
  const [row] = await db
    .select({ lockedUntil: loginAttempts.lockedUntil })
    .from(loginAttempts)
    .where(eq(loginAttempts.phoneNumber, phone))
    .limit(1)
  return !!row?.lockedUntil && row.lockedUntil.getTime() > Date.now()
}

/** Record a failed attempt and apply a lock once the threshold is crossed. */
export async function recordFailure(phone: string): Promise<void> {
  const [row] = await db
    .select({ failedCount: loginAttempts.failedCount })
    .from(loginAttempts)
    .where(eq(loginAttempts.phoneNumber, phone))
    .limit(1)

  const failedCount = (row?.failedCount ?? 0) + 1
  const lockMs = lockDurationMs(failedCount)
  const lockedUntil = lockMs > 0 ? new Date(Date.now() + lockMs) : null

  if (row) {
    await db
      .update(loginAttempts)
      .set({ failedCount, lockedUntil, updatedAt: new Date() })
      .where(eq(loginAttempts.phoneNumber, phone))
  } else {
    await db.insert(loginAttempts).values({ phoneNumber: phone, failedCount, lockedUntil })
  }
}

/** Clear all failure state for a phone (call on successful sign-in). */
export async function clearAttempts(phone: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.phoneNumber, phone))
}
