'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convert, format } from '@/lib/currency'
import { PriceTrendSparkline } from './PriceTrendSparkline'

interface PriceEntry {
  id: string
  price: number
  currency: 'SGD' | 'MYR'
  quantity: number
  unit: string
  price_per_unit: number
  date_observed: string
  stores: { id: string; name: string; country: string; city: string; type: string }
}

interface Props {
  productId: string
  initialEntries?: PriceEntry[]
}

export function PriceHistoryDropdown({ productId, initialEntries }: Props) {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<PriceEntry[]>(initialEntries ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(!!initialEntries)
  const { currency, rate } = useCurrency()

  async function load() {
    if (loaded) { setOpen((o) => !o); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/products/${productId}/prices`)
      if (!res.ok) throw new Error(`Failed to load prices (${res.status})`)
      const data: PriceEntry[] = await res.json()
      setEntries(data)
      setLoaded(true)
      setOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load prices')
    } finally {
      setLoading(false)
    }
  }

  const displayPrice = (entry: PriceEntry) => {
    const converted = convert(entry.price, entry.currency, currency, rate)
    return format(converted, currency)
  }

  const sparklineData = entries
    .slice()
    .sort((a, b) => a.date_observed.localeCompare(b.date_observed))
    .map((e) => convert(e.price, e.currency, currency, rate))

  return (
    <div className="mt-1">
      <button
        onClick={load}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
      >
        <span>{loading ? 'Loading...' : loaded ? `${entries.length} price ${entries.length === 1 ? 'entry' : 'entries'}` : '? price entries'}</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {error && (
        <p className="px-2 py-1.5 text-xs text-destructive">{error}</p>
      )}

      {open && entries.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-md border">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-muted-foreground">Price trend</span>
            <PriceTrendSparkline prices={sparklineData} />
          </div>
          <div className="divide-y">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-3 py-2 text-xs">
                <div>
                  <p className="font-medium">{entry.stores.name}</p>
                  <p className="text-muted-foreground">
                    {entry.stores.country} · {new Date(entry.date_observed).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{displayPrice(entry)}</p>
                  <p className="text-muted-foreground">
                    {format(convert(entry.price_per_unit, entry.currency, currency, rate), currency)}/{entry.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
