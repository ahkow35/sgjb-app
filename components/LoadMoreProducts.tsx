'use client'
import { useState } from 'react'
import { ProductCard } from './ProductCard'
import { type StoreOption } from './AddPriceInline'
import type { EnrichedProduct } from '@/lib/products-query'

interface Props {
  q: string
  category: string
  // How many products the server already rendered above this component.
  initialOffset: number
  total: number
  storeOptions: StoreOption[]
}

export function LoadMoreProducts({ q, category, initialOffset, total, storeOptions }: Props) {
  const [items, setItems] = useState<EnrichedProduct[]>([])
  const [offset, setOffset] = useState(initialOffset)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remaining = total - offset

  async function loadMore() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (category) params.set('category', category)
      params.set('offset', String(offset))
      const res = await fetch(`/api/products/list?${params.toString()}`)
      if (!res.ok) throw new Error(`Failed to load more (${res.status})`)
      const data: EnrichedProduct[] = await res.json()
      setItems((prev) => [...prev, ...data])
      setOffset((o) => o + data.length)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {items.map((p) => (
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

      {error && <p className="text-center text-xs text-destructive">{error}</p>}

      {remaining > 0 && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full rounded-lg border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          {loading ? 'Loading…' : `Load more (${remaining} more)`}
        </button>
      )}
    </>
  )
}
