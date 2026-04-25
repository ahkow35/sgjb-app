import { db, products, priceEntries, stores } from '@/lib/db'
import { eq, and, inArray, sql, SQL } from 'drizzle-orm'
import { buildProductSearchQuery } from '@/app/api/products/utils'
import { ProductCard } from '@/components/ProductCard'
import { CurrencyToggle } from '@/components/CurrencyToggle'
import { SearchBar } from '@/components/SearchBar'
import { Suspense } from 'react'

interface SearchParams { q?: string; category?: string }

async function getProducts(q: string, category: string) {
  const conditions: SQL[] = []
  const tsQuery = buildProductSearchQuery(q)
  if (tsQuery) {
    conditions.push(sql`to_tsvector('english', ${products.name}) @@ to_tsquery('english', ${tsQuery})`)
  }
  if (category) {
    conditions.push(eq(products.category, category))
  }

  let productList: {
    id: string
    name: string
    brand: string
    category: string
    image_url: string
    unit_type: string
  }[]

  try {
    productList = await db.select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      category: products.category,
      image_url: products.imageUrl,
      unit_type: products.unitType,
    })
      .from(products)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(30)
  } catch (e) {
    console.error('[products] DB query error:', String(e))
    return []
  }

  if (productList.length === 0) return []

  // Fetch best SGD + MYR price (with store, date, package size) per product
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
    })
    .from(priceEntries)
    .innerJoin(stores, eq(priceEntries.storeId, stores.id))
    .where(inArray(priceEntries.productId, ids))

  const priceMap = new Map<string, {
    sgd: number | null; sgdStore: string | null; sgdDate: string | null
    sgdQty: string | null; sgdUnit: string | null
    myr: number | null; myrStore: string | null; myrDate: string | null
  }>()

  for (const row of priceRows) {
    const price = Number(row.price)
    const entry = priceMap.get(row.productId) ?? {
      sgd: null, sgdStore: null, sgdDate: null, sgdQty: null, sgdUnit: null,
      myr: null, myrStore: null, myrDate: null,
    }
    if (row.currency === 'SGD') {
      if (entry.sgd === null || price < entry.sgd) {
        entry.sgd = price
        entry.sgdStore = row.storeName
        entry.sgdDate = String(row.dateObserved)
        entry.sgdQty = String(row.quantity)
        entry.sgdUnit = row.unit
      }
    } else {
      if (entry.myr === null || price < entry.myr) {
        entry.myr = price
        entry.myrStore = row.storeName
        entry.myrDate = String(row.dateObserved)
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
      best_myr: px?.myr ?? null,
      best_myr_store: px?.myrStore ?? null,
      best_myr_date: px?.myrDate ?? null,
      // Package size from cheapest SGD entry (fallback: skip)
      pkg_qty: px?.sgdQty ?? null,
      pkg_unit: px?.sgdUnit ?? null,
    }
  })
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const q = searchParams.q ?? ''
  const category = searchParams.category ?? ''
  const productList = await getProducts(q, category)

  return (
    <div>
      <Suspense fallback={null}>
        <SearchBar />
      </Suspense>

      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {productList.length} product{productList.length !== 1 ? 's' : ''}
        </p>
        <CurrencyToggle />
      </div>

      {productList.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground px-4">
          {q ? `No results for "${q}"` : 'No products yet. Be the first to submit!'}
        </p>
      ) : (
        <div className="px-4 space-y-3 pb-4">
          {productList.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              bestSgd={p.best_sgd}
              bestSgdStore={p.best_sgd_store}
              bestSgdDate={p.best_sgd_date}
              bestMyr={p.best_myr}
              bestMyrStore={p.best_myr_store}
              bestMyrDate={p.best_myr_date}
              pkgQty={p.pkg_qty}
              pkgUnit={p.pkg_unit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
