import { db, stores } from '@/lib/db'
import { and, ne, sql } from 'drizzle-orm'

/**
 * Case-insensitive existing-name check, shared by POST and PATCH so the two
 * routes can't drift. Exact `lower() =` match — `ilike` would treat `%` and
 * `_` in the submitted name as wildcards and 409 against unrelated stores.
 *
 * This is a best-effort pre-check only: two concurrent admin writes can both
 * pass it. The `stores_name_lower_unique` index in the schema is the real
 * backstop — see `isUniqueViolation` for how the routes translate it to 409.
 */
export async function storeNameExists(name: string, excludeId?: string): Promise<boolean> {
  const where = excludeId
    ? and(sql`lower(${stores.name}) = lower(${name})`, ne(stores.id, excludeId))
    : sql`lower(${stores.name}) = lower(${name})`
  const [row] = await db.select({ id: stores.id }).from(stores).where(where).limit(1)
  return !!row
}

/**
 * True when an error is a Postgres unique-constraint violation (SQLSTATE
 * 23505) — i.e. the `lower(name)` unique index rejected a write that lost the
 * race against the pre-check above. postgres-js exposes the code on the error
 * itself or on `.cause`, so check both.
 */
export function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } }
  return err?.code === '23505' || err?.cause?.code === '23505'
}
