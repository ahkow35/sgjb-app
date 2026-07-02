import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { db, priceEntries, stores } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'

// Prices change when users submit them, so this must never be cached — the Neon
// HTTP driver fetches over `fetch()`, which Next caches by default otherwise,
// causing newly-added prices to not appear (stale price history).
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await db.select({
      id: priceEntries.id,
      price: priceEntries.price,
      currency: priceEntries.currency,
      quantity: priceEntries.quantity,
      unit: priceEntries.unit,
      price_per_unit: priceEntries.pricePerUnit,
      source: priceEntries.source,
      submitted_by: priceEntries.submittedBy,
      date_observed: priceEntries.dateObserved,
      created_at: priceEntries.createdAt,
      stores: {
        id: stores.id,
        name: stores.name,
        country: stores.country,
        city: stores.city,
        type: stores.type,
      },
    })
      .from(priceEntries)
      .innerJoin(stores, eq(priceEntries.storeId, stores.id))
      .where(eq(priceEntries.productId, params.id))
      .orderBy(desc(priceEntries.dateObserved))
      .limit(50)

    return NextResponse.json(data)
  } catch (e) {
    return serverError(e, 'GET /api/products/[id]/prices')
  }
}
