import { NextRequest, NextResponse } from 'next/server'
import { db, priceEntries, stores } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'

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
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
