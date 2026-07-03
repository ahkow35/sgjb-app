'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus, Trash2 } from 'lucide-react'
import { AddToCartButton } from './AddToCartButton'
import { PriceHistoryDropdown } from './PriceHistoryDropdown'
import { ProductPriceRow } from './ProductPriceRow'
import { AddPriceInline, type StoreOption } from './AddPriceInline'

interface Product {
  id: string
  name: string
  brand: string
  category: string
  unit_type: string
  image_url: string
}

interface Props {
  product: Product
  bestSgd?: number | null
  bestSgdStore?: string | null
  bestSgdDate?: string | null
  bestSgdBy?: string | null
  bestMyr?: number | null
  bestMyrStore?: string | null
  bestMyrDate?: string | null
  bestMyrBy?: string | null
  pkgQty?: string | null
  pkgUnit?: string | null
  storeOptions?: StoreOption[]
}

export function ProductCard({
  product,
  bestSgd, bestSgdStore, bestSgdDate, bestSgdBy,
  bestMyr, bestMyrStore, bestMyrDate, bestMyrBy,
  pkgQty, pkgUnit,
  storeOptions = [],
}: Props) {
  const [showAddPrice, setShowAddPrice] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = Boolean(session?.user?.isAdmin)

  async function deleteProduct() {
    if (!window.confirm(`Delete "${product.name}" and all its prices? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to delete product')
      }
      router.refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to delete product')
      setDeleting(false)
    }
  }

  // "425g · Groceries" — skip trivial "1 each"
  const hasSize = pkgQty && pkgUnit && !(Number(pkgQty) === 1 && pkgUnit === 'each')
  const subtitle = [
    hasSize ? `${Number(pkgQty)}${pkgUnit}` : null,
    product.category || null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          {product.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="h-14 w-14 rounded-xl object-contain flex-shrink-0 bg-muted p-1"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/products/${product.id}`} className="min-w-0 hover:underline">
                <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                  {product.name}
                </p>
              </Link>
              <div className="flex items-center gap-1 shrink-0">
                {isAdmin && (
                  <button
                    onClick={deleteProduct}
                    disabled={deleting}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted disabled:opacity-50"
                    aria-label="Delete product (admin)"
                    title="Delete product (admin)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowAddPrice((v) => !v)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Add latest price"
                  title="Add latest price"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <AddToCartButton
                  productId={product.id}
                  productName={product.name}
                  brand={product.brand}
                  unitType={product.unit_type}
                />
              </div>
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Side-by-side SG vs JB prices — immediately visible */}
      <ProductPriceRow
        bestSgd={bestSgd ?? null}
        bestSgdStore={bestSgdStore ?? null}
        bestSgdDate={bestSgdDate ?? null}
        bestSgdBy={bestSgdBy ?? null}
        bestMyr={bestMyr ?? null}
        bestMyrStore={bestMyrStore ?? null}
        bestMyrDate={bestMyrDate ?? null}
        bestMyrBy={bestMyrBy ?? null}
      />

      {/* Inline add-price form */}
      {showAddPrice && (
        <AddPriceInline
          productId={product.id}
          unitType={product.unit_type}
          stores={storeOptions}
          onClose={() => setShowAddPrice(false)}
        />
      )}

      {/* Full price history */}
      <PriceHistoryDropdown productId={product.id} />
    </div>
  )
}
