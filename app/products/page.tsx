import { db, stores } from '@/lib/db'
import { ProductCard } from '@/components/ProductCard'
import { LoadMoreProducts } from '@/components/LoadMoreProducts'
import { CurrencyToggle } from '@/components/CurrencyToggle'
import { SearchBar } from '@/components/SearchBar'
import { getEnrichedProducts, countProducts, PAGE_SIZE } from '@/lib/products-query'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

interface SearchParams { q?: string; category?: string }

async function getStoreOptions() {
  return db
    .select({ id: stores.id, name: stores.name, country: stores.country })
    .from(stores)
    .orderBy(stores.country, stores.name)
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const q = searchParams.q ?? ''
  const category = searchParams.category ?? ''
  const [productList, total, storeOptions] = await Promise.all([
    getEnrichedProducts(q, category, PAGE_SIZE, 0),
    countProducts(q, category),
    getStoreOptions(),
  ])

  return (
    <div>
      <Suspense fallback={null}>
        <SearchBar />
      </Suspense>

      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {total} product{total !== 1 ? 's' : ''}
        </p>
        <CurrencyToggle />
      </div>

      {total === 0 ? (
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
              bestSgdBy={p.best_sgd_by}
              bestMyr={p.best_myr}
              bestMyrStore={p.best_myr_store}
              bestMyrDate={p.best_myr_date}
              bestMyrBy={p.best_myr_by}
              pkgQty={p.pkg_qty}
              pkgUnit={p.pkg_unit}
              storeOptions={storeOptions}
            />
          ))}
          <LoadMoreProducts
            q={q}
            category={category}
            initialOffset={productList.length}
            total={total}
            storeOptions={storeOptions}
          />
        </div>
      )}
    </div>
  )
}
