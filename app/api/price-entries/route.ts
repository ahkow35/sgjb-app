import { NextRequest, NextResponse } from 'next/server'
import { db, priceEntries, stores, users } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'
import { auth } from '@/auth'

const USER_PRICE_SOURCES = new Set(['manual', 'barcode'])

export async function POST(req: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { product_id, store_id, price, quantity, unit, date_observed, source } = body

  if (!product_id || !store_id || price == null || !date_observed) {
    return NextResponse.json(
      { error: 'product_id, store_id, price, and date_observed are required' },
      { status: 400 },
    )
  }

  const priceNum = Number(price)
  const quantityNum = Number(quantity ?? 1)

  if (isNaN(priceNum) || priceNum <= 0) {
    return NextResponse.json({ error: 'price must be a positive number' }, { status: 400 })
  }
  if (isNaN(quantityNum) || quantityNum <= 0) {
    return NextResponse.json({ error: 'quantity must be a positive number' }, { status: 400 })
  }

  const sourceValue = typeof source === 'string' && USER_PRICE_SOURCES.has(source)
    ? source as 'manual' | 'barcode'
    : 'manual'

  // Derive currency from store country
  const [store] = await db.select({ country: stores.country }).from(stores).where(eq(stores.id, String(store_id))).limit(1)
  if (!store) {
    return NextResponse.json({ error: 'store not found' }, { status: 404 })
  }
  const currency = store.country === 'MY' ? 'MYR' : 'SGD'

  const pricePerUnit = quantityNum > 0 ? priceNum / quantityNum : null

  try {
    const [entry] = await db
      .insert(priceEntries)
      .values({
        productId: String(product_id),
        storeId: String(store_id),
        price: priceNum.toFixed(2),
        currency,
        quantity: quantityNum.toFixed(3),
        unit: String(unit ?? 'each'),
        pricePerUnit: pricePerUnit != null ? pricePerUnit.toFixed(4) : null,
        source: sourceValue,
        submittedBy: userId,
        dateObserved: String(date_observed),
      })
      .returning()

    // Increment submission count for logged-in user
    await db
      .update(users)
      .set({ submissionCount: sql`${users.submissionCount} + 1` })
      .where(eq(users.id, userId))

    return NextResponse.json(entry, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
