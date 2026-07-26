import { db, products, priceEntries, stores } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, and, inArray, sql, SQL, desc, gte, count } from 'drizzle-orm'
import { buildProductSearchQuery } from '@/app/api/products/utils'
import { FRESHNESS_DAYS, pickBestPrices, type PriceRow, type ProductUnitType } from '@/lib/price-ranking'

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
  best_sgd_qty: string | null
  best_sgd_unit: string | null
  best_sgd_per_unit: number | null
  best_myr: number | null
  best_myr_store: string | null
  best_myr_date: string | null
  best_myr_by: string | null
  best_myr_qty: string | null
  best_myr_unit: string | null
  best_myr_per_unit: number | null
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

export function toHandle(name: string | null): string | null {
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

  const productList: {
    id: string
    name: string
    brand: string
    category: string
    image_url: string
    unit_type: string
  }[] = await db
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

  if (productList.length === 0) return []

  // "Current" price rows for the page's products: one row per (product, store)
  // — that store's single most recent entry within the freshness window —
  // via DISTINCT ON, leveraging price_entries_product_date_idx. Ranking to a
  // per-product "best price" happens in pickBestPrices below.
  const ids = productList.map((p) => p.id)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - FRESHNESS_DAYS)
  const cutoffDate = cutoff.toISOString().slice(0, 10)

  const priceRows = await db
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
    .where(and(inArray(priceEntries.productId, ids), gte(priceEntries.dateObserved, cutoffDate)))
    .orderBy(
      priceEntries.productId,
      priceEntries.storeId,
      desc(priceEntries.dateObserved),
      desc(priceEntries.createdAt),
    )

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

  return productList.map((p) => {
    const { sgd, myr } = pickBestPrices(rowsByProduct.get(p.id) ?? [], p.unit_type as ProductUnitType)
    return {
      ...p,
      best_sgd: sgd?.price ?? null,
      best_sgd_store: sgd?.store ?? null,
      best_sgd_date: sgd?.dateObserved ?? null,
      best_sgd_by: sgd?.submitterName ?? null,
      best_sgd_qty: sgd?.quantity ?? null,
      best_sgd_unit: sgd?.unit ?? null,
      best_sgd_per_unit: sgd?.pricePerUnit ?? null,
      best_myr: myr?.price ?? null,
      best_myr_store: myr?.store ?? null,
      best_myr_date: myr?.dateObserved ?? null,
      best_myr_by: myr?.submitterName ?? null,
      best_myr_qty: myr?.quantity ?? null,
      best_myr_unit: myr?.unit ?? null,
      best_myr_per_unit: myr?.pricePerUnit ?? null,
    }
  })
}
