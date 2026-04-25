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

  // Fetch best SGD + MYR price per product
  const ids = productList.map((p) => p.id)
  const priceRows = await db
    .select({
      productId: priceEntries.productId,
      price: priceEntries.price,
      currency: priceEntries.currency,
      country: stores.country,
    })
    .from(priceEntries)
    .innerJoin(stores, eq(priceEntries.storeId, stores.id))
    .where(inArray(priceEntries.productId, ids))

  const priceMap = new Map<string, { sgd: number | null; myr: number | null }>()
  for (const row of priceRows) {
    const price = Number(row.price)
    const entry = priceMap.get(row.productId) ?? { sgd: null, myr: null }
    if (row.currency === 'SGD') {
      entry.sgd = entry.sgd === null ? price : Math.min(entry.sgd, price)
    } else {
      entry.myr = entry.myr === null ? price : Math.min(entry.myr, price)
    }
    priceMap.set(row.productId, entry)
  }

  return productList.map((p) => ({
    ...p,
    best_sgd: priceMap.get(p.id)?.sgd ?? null,
    best_myr: priceMap.get(p.id)?.myr ?? null,
  }))
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
            <ProductCard key={p.id} product={p} bestSgd={p.best_sgd} bestMyr={p.best_myr} />
          ))}
        </div>
      )}
    </div>
  )
}
