import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { db, stores } from '@/lib/db'
import { eq } from 'drizzle-orm'

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
