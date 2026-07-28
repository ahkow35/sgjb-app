import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and } from 'drizzle-orm'
import * as schema from '../../lib/db/schema'
import { normalizeQuantityUnit } from '../../lib/units'
import type { ScrapedProduct } from './types'

const sql = neon(process.env.POSTGRES_URL!)
const db = drizzle(sql, { schema })

export async function upsertScrapedProduct(
  item: ScrapedProduct,
  source: 'scraper' | 'admin' = 'scraper'
): Promise<void> {
  // 1. Find store by name
  const [store] = await db.select()
    .from(schema.stores)
    .where(eq(schema.stores.name, item.storeName))
    .limit(1)

  if (!store) {
    throw new Error(`Store not found: ${item.storeName}`)
  }

  // 2. Find or create product (match by barcode if available, else by name+brand)
  let product: typeof schema.products.$inferSelect | undefined

  if (item.barcode) {
    const [existing] = await db.select()
      .from(schema.products)
      .where(eq(schema.products.barcode, item.barcode))
      .limit(1)
    product = existing
  }

  if (!product) {
    const [existing] = await db.select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.name, item.name),
          eq(schema.products.brand, item.brand)
        )
      )
      .limit(1)
    product = existing
  }

  if (!product) {
    const [created] = await db.insert(schema.products)
      .values({
        name: item.name,
        brand: item.brand,
        category: item.category,
        imageUrl: item.imageUrl,
        unitType: item.unitType,
        barcode: item.barcode ?? null,
      })
      .returning()
    product = created
  }

  // 3. Insert price entry — normalize to canonical units first so
  // price_per_unit is comparable across stores/scrapers (single chokepoint;
  // the individual scrapers are not responsible for this).
  const normalized = normalizeQuantityUnit(item.quantity, item.unit)
  if (!normalized) {
    throw new Error(`Unrecognized unit "${item.unit}" for ${item.name} — skipping insert`)
  }

  const pricePerUnit = normalized.quantity > 0 ? item.price / normalized.quantity : null

  const price = String(item.price)
  const quantity = String(normalized.quantity)
  const unit = normalized.unit
  const pricePerUnitStr = pricePerUnit != null ? String(pricePerUnit) : null

  await db.insert(schema.priceEntries)
    .values({
      productId: product.id,
      storeId: store.id,
      price,
      currency: item.currency,
      quantity,
      unit,
      pricePerUnit: pricePerUnitStr,
      source,
      dateObserved: item.dateObserved,
    })
    .onConflictDoUpdate({
      target: [
        schema.priceEntries.productId,
        schema.priceEntries.storeId,
        schema.priceEntries.submittedBy,
        schema.priceEntries.dateObserved,
      ],
      set: { price, quantity, unit, pricePerUnit: pricePerUnitStr, source },
    })
}
