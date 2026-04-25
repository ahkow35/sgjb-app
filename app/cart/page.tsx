'use client'

import { useEffect, useState } from 'react'
import { useCart } from '@/lib/cart-context'
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface BestPrice {
  price: number
  currency: 'SGD' | 'MYR'
  storeName: string
  storeId: string
}

interface ProductPrices {
  productId: string
  sgd: BestPrice | null
  myr: BestPrice | null
}

interface ExchangeRate {
  rate: number
  date: string
}

export default function CartPage() {
  const { items, remove, updateQty, clear } = useCart()
  const [prices, setPrices] = useState<Map<string, ProductPrices>>(new Map())
  const [rate, setRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (items.length === 0) {
      setPrices(new Map())
      return
    }

    setLoading(true)
    const productIds = items.map((i) => i.productId)

    Promise.all([
      fetch('/api/cart/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds }),
      }).then((r) => r.json()),
      fetch('/api/exchange-rate').then((r) => r.json()),
    ])
      .then(([pricesData, rateData]: [ProductPrices[], ExchangeRate]) => {
        const map = new Map<string, ProductPrices>()
        for (const p of pricesData) map.set(p.productId, p)
        setPrices(map)
        if (rateData?.rate) setRate(rateData.rate)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [items])

  // Totals
  let totalSGD = 0
  let totalMYR = 0

  for (const item of items) {
    const p = prices.get(item.productId)
    if (!p) continue
    if (p.sgd) totalSGD += p.sgd.price * item.quantity
    if (p.myr) totalMYR += p.myr.price * item.quantity
  }

  // Savings: JB cost in SGD vs SG cost
  const myrInSGD = rate ? totalMYR / rate : null
  const savings = myrInSGD != null ? totalSGD - myrInSGD : null

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
        <ShoppingCart className="h-16 w-16 text-muted-foreground/40" />
        <div>
          <h1 className="text-lg font-semibold">Your cart is empty</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse products and tap &quot;Add&quot; to build your comparison cart
          </p>
        </div>
        <Link
          href="/products"
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
        >
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="pb-24 px-4 pt-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">
          Cart{' '}
          <span className="text-sm font-normal text-muted-foreground">
            ({items.length} item{items.length !== 1 ? 's' : ''})
          </span>
        </h1>
        <button onClick={clear} className="text-xs text-muted-foreground hover:text-destructive">
          Clear all
        </button>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground text-center py-2">Loading prices…</p>
      )}

      {/* Item list */}
      <ul className="space-y-2 mb-4">
        {items.map((item) => {
          const p = prices.get(item.productId)
          return (
            <li key={item.productId} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{item.productName}</p>
                  {item.brand && (
                    <p className="text-xs text-muted-foreground">{item.brand}</p>
                  )}
                </div>
                <button
                  onClick={() => remove(item.productId)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Prices row */}
              {p && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1.5">
                    <p className="text-xs text-muted-foreground">Best SG</p>
                    {p.sgd ? (
                      <>
                        <p className="text-sm font-semibold">
                          S${(p.sgd.price * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{p.sgd.storeName}</p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">No price</p>
                    )}
                  </div>
                  <div className="rounded-md bg-green-50 dark:bg-green-950/30 px-2.5 py-1.5">
                    <p className="text-xs text-muted-foreground">Best JB</p>
                    {p.myr ? (
                      <>
                        <p className="text-sm font-semibold">
                          RM{(p.myr.price * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{p.myr.storeName}</p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">No price</p>
                    )}
                  </div>
                </div>
              )}

              {/* Qty controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(item.productId, item.quantity - 1)}
                  className="rounded-md border h-7 w-7 flex items-center justify-center hover:bg-muted"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val) && val > 0) updateQty(item.productId, val)
                  }}
                  className="w-12 text-center text-sm font-medium rounded-md border border-border bg-background py-0.5 outline-none focus:ring-1 focus:ring-primary/30"
                />
                <button
                  onClick={() => updateQty(item.productId, item.quantity + 1)}
                  className="rounded-md border h-7 w-7 flex items-center justify-center hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Totals summary */}
      {!loading && (totalSGD > 0 || totalMYR > 0) && (
        <div className="rounded-2xl overflow-hidden border border-border shadow-sm mb-4">
          {/* Navy header */}
          <div className="bg-gradient-to-r from-navy to-navy-light px-4 py-3">
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Cart Total</p>
          </div>
          <div className="bg-card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#EEF2FF] border border-[#C7D7F5] px-3 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">🇸🇬 SG Total</p>
                <p className="text-xl font-extrabold text-navy">S${totalSGD.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-3 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">🇲🇾 JB Total</p>
                <p className="text-xl font-extrabold text-gold">RM{totalMYR.toFixed(2)}</p>
                {myrInSGD != null && (
                  <p className="text-xs text-muted-foreground">≈ S${myrInSGD.toFixed(2)}</p>
                )}
              </div>
            </div>

            {savings != null && savings > 0 && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Savings before trip costs</p>
                  <p className="text-xl font-extrabold text-emerald-700">S${savings.toFixed(2)}</p>
                </div>
                <span className="text-2xl">🎉</span>
              </div>
            )}

            {rate && (
              <p className="text-xs text-muted-foreground text-right">
                1 SGD = {rate.toFixed(4)} MYR
              </p>
            )}
          </div>
        </div>
      )}

      {/* Trip ROI CTA */}
      <Link
        href={`/trip-roi?sgd=${totalSGD.toFixed(2)}&myr=${totalMYR.toFixed(2)}`}
        className="flex items-center justify-between w-full rounded-xl bg-gold px-4 py-3.5 text-sm font-bold text-white shadow-sm"
      >
        <span>Calculate trip ROI</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
