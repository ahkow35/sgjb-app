import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/ProductCard'
import { CurrencyToggle } from '@/components/CurrencyToggle'
import { buildProductSearchQuery } from '@/app/api/products/utils'

interface SearchParams { q?: string; category?: string }

async function getProducts(q: string, category: string) {
  const supabase = createClient()
  let builder = supabase
    .from('products')
    .select('id, name, brand, category, image_url, unit_type')
    .limit(30)

  if (q.trim()) {
    const tsQuery = buildProductSearchQuery(q)
    if (tsQuery) {
      builder = builder.textSearch('name', tsQuery, { config: 'english' })
    }
  }
  if (category) builder = builder.eq('category', category)

  const { data, error } = await builder
  if (error) {
    console.error('[products] Supabase query error:', error.message)
  }
  return data ?? []
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const q = searchParams.q ?? ''
  const category = searchParams.category ?? ''
  const products = await getProducts(q, category)

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

      {products.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {q ? `No results for "${q}"` : 'No products yet. Be the first to submit!'}
        </p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
