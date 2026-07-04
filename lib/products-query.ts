import { db, products, priceEntries, stores } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, and, inArray, sql, SQL, desc, count } from 'drizzle-orm'
import { buildProductSearchQuery } from '@/app/api/products/utils'

export const PAGE_SIZE = 30

export interface EnrichedProduct {
  id: string
  name: string
  brand: string
  category: string
  image_url: string
  unit_type: string
  best_sgd: number | null
  best_sgd_store: string | null
  best_sgd_date: string | null
  best_sgd_by: string | null
  best_myr: number | null
  best_myr_store: string | null
  best_myr_date: string | null
  best_myr_by: string | null
  pkg_qty: string | null
  pkg_unit: string | null
}

function searchConditions(q: string, category: string): SQL[] {
  const conditions: SQL[] = []
  const tsQuery = buildProductSearchQuery(q)
  if (tsQuery) {
    conditions.push(sql`to_tsvector('english', ${products.name}) @@ to_tsquery('english', ${tsQuery})`)
  }
  if (category) {
    conditions.push(eq(products.category, category))
  }
  return conditions
}

function toHandle(name: string | null): string | null {
  const trimmed = name?.trim()
  return trimmed ? trimmed : null
}

/** Total number of products matching the current search/category filters. */
export async function countProducts(q: string, category: string): Promise<number> {
  const conditions = searchConditions(q, category)
  const [row] = await db
    .select({ n: count() })
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
  return row?.n ?? 0
}

/**
 * A page of products (newest first) enriched with the cheapest SGD and MYR price
 * per product, plus store/date/submitter/package-size for each side.
 */
export async function getEnrichedProducts(
  q: string,
  category: string,
  limit: number,
  offset: number,
): Promise<EnrichedProduct[]> {
  const conditions = searchConditions(q, category)

  let productList: {
    id: string
    name: string
    brand: string
    category: string
    image_url: string
    unit_type: string
  }[]

  try {
    productList = await db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        category: products.category,
        image_url: products.imageUrl,
        unit_type: products.unitType,
      })
      .from(products)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset)
  } catch (e) {
    console.error('[products] DB query error:', String(e))
    return []
  }

  if (productList.length === 0) return []

  // Cheapest SGD + MYR price (with store, date, package size, submitter) per product
  const ids = productList.map((p) => p.id)
  const priceRows = await db
    .select({
      productId: priceEntries.productId,
      price: priceEntries.price,
      currency: priceEntries.currency,
      storeName: stores.name,
      dateObserved: priceEntries.dateObserved,
      quantity: priceEntries.quantity,
      unit: priceEntries.unit,
      submitterName: users.displayName,
    })
    .from(priceEntries)
    .innerJoin(stores, eq(priceEntries.storeId, stores.id))
    .leftJoin(users, eq(priceEntries.submittedBy, users.id))
    .where(inArray(priceEntries.productId, ids))

  const priceMap = new Map<string, {
    sgd: number | null; sgdStore: string | null; sgdDate: string | null
    sgdQty: string | null; sgdUnit: string | null; sgdBy: string | null
    myr: number | null; myrStore: string | null; myrDate: string | null
    myrBy: string | null
  }>()

  for (const row of priceRows) {
    const price = Number(row.price)
    const entry = priceMap.get(row.productId) ?? {
      sgd: null, sgdStore: null, sgdDate: null, sgdQty: null, sgdUnit: null, sgdBy: null,
      myr: null, myrStore: null, myrDate: null, myrBy: null,
    }
    if (row.currency === 'SGD') {
      if (entry.sgd === null || price < entry.sgd) {
        entry.sgd = price
        entry.sgdStore = row.storeName
        entry.sgdDate = String(row.dateObserved)
        entry.sgdQty = String(row.quantity)
        entry.sgdUnit = row.unit
        entry.sgdBy = toHandle(row.submitterName)
      }
    } else {
      if (entry.myr === null || price < entry.myr) {
        entry.myr = price
        entry.myrStore = row.storeName
        entry.myrDate = String(row.dateObserved)
        entry.myrBy = toHandle(row.submitterName)
      }
    }
    priceMap.set(row.productId, entry)
  }

  return productList.map((p) => {
    const px = priceMap.get(p.id)
    return {
      ...p,
      best_sgd: px?.sgd ?? null,
      best_sgd_store: px?.sgdStore ?? null,
      best_sgd_date: px?.sgdDate ?? null,
      best_sgd_by: px?.sgdBy ?? null,
      best_myr: px?.myr ?? null,
      best_myr_store: px?.myrStore ?? null,
      best_myr_date: px?.myrDate ?? null,
      best_myr_by: px?.myrBy ?? null,
      pkg_qty: px?.sgdQty ?? null,
      pkg_unit: px?.sgdUnit ?? null,
    }
  })
}
