import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { db, priceEntries, stores, users } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'
import { auth } from '@/auth'
import { normalizeQuantityUnit, ALLOWED_UNITS } from '@/lib/units'

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

  const normalized = normalizeQuantityUnit(quantityNum, String(unit ?? 'each'))
  if (!normalized) {
    return NextResponse.json(
      { error: `unit must be one of: ${ALLOWED_UNITS.join(', ')}` },
      { status: 400 },
    )
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

  const pricePerUnit = normalized.quantity > 0 ? priceNum / normalized.quantity : null

  try {
    // The observation key (product + store + user + date) makes a same-day
    // resubmission an in-place update — the user's correction path — instead
    // of a unique-violation 500.
    const [entry] = await db
      .insert(priceEntries)
      .values({
        productId: String(product_id),
        storeId: String(store_id),
        price: priceNum.toFixed(2),
        currency,
        quantity: normalized.quantity.toFixed(3),
        unit: normalized.unit,
        pricePerUnit: pricePerUnit != null ? pricePerUnit.toFixed(4) : null,
        source: sourceValue,
        submittedBy: userId,
        dateObserved: String(date_observed),
      })
      .onConflictDoUpdate({
        target: [
          priceEntries.productId,
          priceEntries.storeId,
          priceEntries.submittedBy,
          priceEntries.dateObserved,
        ],
        set: {
          price: priceNum.toFixed(2),
          currency,
          quantity: normalized.quantity.toFixed(3),
          unit: normalized.unit,
          pricePerUnit: pricePerUnit != null ? pricePerUnit.toFixed(4) : null,
          source: sourceValue,
        },
      })
      .returning({
        id: priceEntries.id,
        // xmax = 0 only on freshly inserted rows — distinguishes insert from update.
        inserted: sql<boolean>`(xmax = 0)`,
      })

    // Count only genuinely new observations toward the user's submission tally.
    if (entry.inserted) {
      await db
        .update(users)
        .set({ submissionCount: sql`${users.submissionCount} + 1` })
        .where(eq(users.id, userId))
    }

    return NextResponse.json(
      { id: entry.id, updated: !entry.inserted },
      { status: entry.inserted ? 201 : 200 },
    )
  } catch (e) {
    return serverError(e, 'POST /api/price-entries')
  }
}
