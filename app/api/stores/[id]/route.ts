import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { requireAdmin } from '@/lib/require-admin'
import { db, stores } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { validateStoreFields } from '../validation'
import { storeNameExists, isUniqueViolation } from '../collision'

// Admin-only. Partial update of a store's fields. Admin is re-checked
// against the DB, never trusted from the session token. No DELETE — stores
// cascade-delete price entries, too dangerous to expose here.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin()
  if (denied) return denied

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

    if (values.name && (await storeNameExists(values.name, params.id))) {
      return NextResponse.json({ error: 'A store with this name already exists' }, { status: 409 })
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
    // The pre-check can lose a race to a concurrent write; the unique index
    // is the authoritative guard, so a 23505 here is still a duplicate name.
    if (isUniqueViolation(e)) {
      return NextResponse.json({ error: 'A store with this name already exists' }, { status: 409 })
    }
    return serverError(e, 'PATCH /api/stores/[id]')
  }
}
