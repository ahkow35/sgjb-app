import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { db, priceEntries, stores } from '@/lib/db'
import { eq, inArray } from 'drizzle-orm'

interface BestPrice {
  price: number
  currency: 'SGD' | 'MYR'
  storeName: string
  storeId: string
}

interface ProductPrices {
  productId: string
  sgd: BestPrice | null
  myr: BestPrice | null
}

export async function POST(req: NextRequest) {
  let productIds: string[]
  try {
    const body = await req.json()
    productIds = Array.isArray(body.productIds) ? body.productIds : []
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (productIds.length === 0) return NextResponse.json([])
  if (productIds.length > 50) {
    return NextResponse.json({ error: 'Max 50 products per request' }, { status: 400 })
  }

  try {
    const rows = await db
      .select({
        productId: priceEntries.productId,
        price: priceEntries.price,
        currency: priceEntries.currency,
        storeId: stores.id,
        storeName: stores.name,
        country: stores.country,
      })
      .from(priceEntries)
      .innerJoin(stores, eq(priceEntries.storeId, stores.id))
      .where(inArray(priceEntries.productId, productIds))

    // Group and find cheapest per (productId, currency)
    const map = new Map<string, ProductPrices>()
    for (const id of productIds) {
      map.set(id, { productId: id, sgd: null, myr: null })
    }

    for (const row of rows) {
      const entry = map.get(row.productId)
      if (!entry) continue

      const price = Number(row.price)
      const key = row.currency === 'MYR' ? 'myr' : 'sgd'
      const current = entry[key]

      if (!current || price < current.price) {
        entry[key] = {
          price,
          currency: row.currency,
          storeName: row.storeName,
          storeId: row.storeId,
        }
      }
    }

    return NextResponse.json(Array.from(map.values()))
  } catch (e) {
    return serverError(e, 'POST /api/cart/prices')
  }
}
