import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { isAdminUser } from '@/lib/admin'
import { db, stores } from '@/lib/db'
import { and, eq, ne, sql } from 'drizzle-orm'
import { auth } from '@/auth'
import { validateStoreFields } from '../validation'

// Admin-only. Partial update of a store's fields. Admin is re-checked
// against the DB, never trusted from the session token. No DELETE — stores
// cascade-delete price entries, too dangerous to expose here.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }
  if (!(await isAdminUser(userId))) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = validateStoreFields(body, false)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  const values = result.values

  if (Object.keys(values).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    // 404 before 409 — a rename collision on a store that doesn't exist
    // should read as Not Found, not Conflict.
    const [target] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.id, params.id))
      .limit(1)
    if (!target) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (values.name) {
      // Exact case-insensitive match — ilike would treat % and _ in the
      // submitted name as wildcards and 409 against unrelated stores.
      const [dup] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(and(sql`lower(${stores.name}) = lower(${values.name})`, ne(stores.id, params.id)))
        .limit(1)
      if (dup) {
        return NextResponse.json({ error: 'A store with this name already exists' }, { status: 409 })
      }
    }

    const [updated] = await db
      .update(stores)
      .set(values)
      .where(eq(stores.id, params.id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (e) {
    return serverError(e, 'PATCH /api/stores/[id]')
  }
}
