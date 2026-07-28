import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { isAdminUser } from '@/lib/admin'
import { db, stores } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'
import { auth } from '@/auth'
import { validateStoreFields } from './validation'

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country') as 'SG' | 'MY' | null

  try {
    const data = await db
      .select({
        id: stores.id,
        name: stores.name,
        country: stores.country,
        city: stores.city,
        type: stores.type,
      })
      .from(stores)
      .where(country ? eq(stores.country, country) : undefined)
      .orderBy(stores.country, stores.name)

    return NextResponse.json(data)
  } catch (e) {
    return serverError(e, 'GET /api/stores')
  }
}

// Admin-only. New stores previously required hand-written SQL. Admin is
// re-checked against the DB, never trusted from the session token.
export async function POST(req: NextRequest) {
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

  const result = validateStoreFields(body, true)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  const { name, country, type, city, url } = result.values

  try {
    // Exact case-insensitive match — ilike would treat % and _ in the
    // submitted name as wildcards and 409 against unrelated stores.
    const [existing] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(sql`lower(${stores.name}) = lower(${name!})`)
      .limit(1)
    if (existing) {
      return NextResponse.json({ error: 'A store with this name already exists' }, { status: 409 })
    }

    const [created] = await db
      .insert(stores)
      .values({
        name: name!,
        country: country!,
        type: type!,
        city: city ?? '',
        url: url ?? '',
      })
      .returning()

    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return serverError(e, 'POST /api/stores')
  }
}
