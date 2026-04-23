import { db, products } from '@/lib/db'
import { eq, and, sql, SQL } from 'drizzle-orm'
import { buildProductSearchQuery } from '@/app/api/products/utils'
import { ProductCard } from '@/components/ProductCard'
import { CurrencyToggle } from '@/components/CurrencyToggle'

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

  try {
    return await db.select({
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
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const q = searchParams.q ?? ''
  const category = searchParams.category ?? ''
  const productList = await getProducts(q, category)

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Products</h1>
        <CurrencyToggle />
      </div>

      <form method="GET">
        <label htmlFor="product-search" className="sr-only">Search products</label>
        <input
          id="product-search"
          name="q"
          defaultValue={q}
          placeholder="Search products..."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </form>

      {productList.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {q ? `No results for "${q}"` : 'No products yet. Be the first to submit!'}
        </p>
      ) : (
        <div className="space-y-2">
          {productList.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
