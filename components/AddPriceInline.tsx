'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check } from 'lucide-react'

export interface StoreOption {
  id: string
  name: string
  country: 'SG' | 'MY'
}

interface Props {
  productId: string
  unitType: string
  stores: StoreOption[]
  onClose: () => void
}

const UNIT_BY_TYPE: Record<string, string[]> = {
  weight: ['g', 'kg'],
  volume: ['ml', 'L'],
  each: ['each', 'pack', 'pcs', 'tablet', 'capsule', 'sachet'],
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function AddPriceInline({ productId, unitType, stores, onClose }: Props) {
  const router = useRouter()
  const units = UNIT_BY_TYPE[unitType] ?? UNIT_BY_TYPE.each
  const [storeId, setStoreId] = useState(stores[0]?.id ?? '')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState(units[0])
  const [dateObserved, setDateObserved] = useState(todayISO())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedStore = stores.find((s) => s.id === storeId)
  const currency = selectedStore?.country === 'MY' ? 'MYR' : 'SGD'

  async function submit() {
    setError(null)
    if (!storeId) { setError('Pick a store'); return }
    const priceNum = Number(price)
    if (!priceNum || priceNum <= 0) { setError('Enter a valid price'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/price-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          store_id: storeId,
          price: priceNum,
          quantity: Number(quantity) || 1,
          unit,
          date_observed: dateObserved,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save')
      }
      onClose()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border-t border-border bg-muted/30 px-3 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Add latest price
        </p>
        <button
          onClick={onClose}
          className="p-1 rounded text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div>
        <label className="text-[11px] text-muted-foreground mb-0.5 block">Store</label>
        <select
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/30"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.country === 'SG' ? 'SG' : 'JB'} · {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] text-muted-foreground mb-0.5 block">
            Price ({currency})
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="flex-1">
          <label className="text-[11px] text-muted-foreground mb-0.5 block">Package size</label>
          <div className="flex gap-1">
            <input
              type="number"
              min="0.001"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-16 rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/30"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="flex-1 rounded-md border bg-background px-1 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/30"
            >
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="text-[11px] text-muted-foreground mb-0.5 block">Date observed</label>
        <input
          type="date"
          value={dateObserved}
          max={todayISO()}
          onChange={(e) => setDateObserved(e.target.value)}
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end pt-1">
        <button
          onClick={submit}
          disabled={submitting}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
        >
          <Check className="h-3 w-3" /> {submitting ? 'Saving…' : 'Save price'}
        </button>
      </div>
    </div>
  )
}
