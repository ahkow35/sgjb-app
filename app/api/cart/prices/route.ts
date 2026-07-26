import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { db, priceEntries, products, stores, users } from '@/lib/db'
import { and, desc, eq, gte, inArray } from 'drizzle-orm'
import { FRESHNESS_DAYS, pickBestPrices, type PriceRow, type ProductUnitType } from '@/lib/price-ranking'
import { toHandle } from '@/lib/products-query'

interface BestPrice {
  price: number
  pricePerUnit: number
  currency: 'SGD' | 'MYR'
  storeName: string
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
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - FRESHNESS_DAYS)
    const cutoffDate = cutoff.toISOString().slice(0, 10)

    const [productRows, priceRows] = await Promise.all([
      db
        .select({ id: products.id, unitType: products.unitType })
        .from(products)
        .where(inArray(products.id, productIds)),
      // "Current" price rows: one row per (product, store) — that store's
      // single most recent entry within the freshness window — via DISTINCT
      // ON, same shape as lib/products-query.ts. Ranking uses the same
      // pickBestPrices, so cart totals and the product list never disagree.
      db
        .selectDistinctOn(
          [priceEntries.productId, priceEntries.storeId],
          {
            productId: priceEntries.productId,
            storeId: priceEntries.storeId,
            storeName: stores.name,
            currency: priceEntries.currency,
            price: priceEntries.price,
            pricePerUnit: priceEntries.pricePerUnit,
            quantity: priceEntries.quantity,
            unit: priceEntries.unit,
            dateObserved: priceEntries.dateObserved,
            createdAt: priceEntries.createdAt,
            submitterName: users.displayName,
          },
        )
        .from(priceEntries)
        .innerJoin(stores, eq(priceEntries.storeId, stores.id))
        .leftJoin(users, eq(priceEntries.submittedBy, users.id))
        .where(and(inArray(priceEntries.productId, productIds), gte(priceEntries.dateObserved, cutoffDate)))
        .orderBy(
          priceEntries.productId,
          priceEntries.storeId,
          desc(priceEntries.dateObserved),
          desc(priceEntries.createdAt),
        ),
    ])

    const unitTypeById = new Map(productRows.map((p) => [p.id, p.unitType as ProductUnitType]))

    const rowsByProduct = new Map<string, PriceRow[]>()
    for (const row of priceRows) {
      const list = rowsByProduct.get(row.productId) ?? []
      list.push({
        storeId: row.storeId,
        storeName: row.storeName,
        currency: row.currency,
        price: row.price,
        pricePerUnit: row.pricePerUnit,
        quantity: row.quantity,
        unit: row.unit,
        dateObserved: String(row.dateObserved),
        createdAt: row.createdAt,
        submitterName: toHandle(row.submitterName),
      })
      rowsByProduct.set(row.productId, list)
    }

    const result: ProductPrices[] = productIds.map((id) => {
      const unitType = unitTypeById.get(id)
      if (!unitType) return { productId: id, sgd: null, myr: null }

      const { sgd, myr } = pickBestPrices(rowsByProduct.get(id) ?? [], unitType)
      return {
        productId: id,
        sgd: sgd ? { price: sgd.price, pricePerUnit: sgd.pricePerUnit, currency: 'SGD', storeName: sgd.store } : null,
        myr: myr ? { price: myr.price, pricePerUnit: myr.pricePerUnit, currency: 'MYR', storeName: myr.store } : null,
      }
    })

    return NextResponse.json(result)
  } catch (e) {
    return serverError(e, 'POST /api/cart/prices')
  }
}
