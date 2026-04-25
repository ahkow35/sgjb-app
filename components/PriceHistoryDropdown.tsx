'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp, Pencil, Check, X as XIcon, Trash2 } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convert, format, formatPerUnit } from '@/lib/currency'
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

interface EditForm {
  price: string
  quantity: string
  unit: string
  date_observed: string
}

interface Props {
  productId: string
  initialEntries?: PriceEntry[]
}

const ALL_UNITS = ['g', 'kg', 'ml', 'L', 'each', 'pack', 'pcs', 'tablet', 'capsule', 'sachet']

export function PriceHistoryDropdown({ productId, initialEntries }: Props) {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<PriceEntry[]>(initialEntries ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(!!initialEntries)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ price: '', quantity: '', unit: '', date_observed: '' })
  const [saving, setSaving] = useState(false)
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

  function startEdit(entry: PriceEntry) {
    setEditingId(entry.id)
    setEditForm({
      price: String(Number(entry.price).toFixed(2)),
      quantity: String(Number(entry.quantity)),
      unit: entry.unit,
      date_observed: entry.date_observed,
    })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/price-entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: Number(editForm.price),
          quantity: Number(editForm.quantity),
          unit: editForm.unit,
          date_observed: editForm.date_observed,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')

      const priceNum = Number(editForm.price)
      const quantityNum = Number(editForm.quantity)
      setEntries((prev) =>
        prev.map((e) =>
          e.id !== id
            ? e
            : {
                ...e,
                price: priceNum,
                quantity: quantityNum,
                unit: editForm.unit,
                date_observed: editForm.date_observed,
                price_per_unit: quantityNum > 0 ? priceNum / quantityNum : 0,
              },
        ),
      )
      setEditingId(null)
    } catch {
      // keep form open on error
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/price-entries/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id))
      if (editingId === id) setEditingId(null)
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
        <span>
          {loading
            ? 'Loading...'
            : loaded
              ? `${entries.length} price ${entries.length === 1 ? 'entry' : 'entries'}`
              : '? price entries'}
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {error && <p className="px-2 py-1.5 text-xs text-destructive">{error}</p>}

      {open && entries.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-md border">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-muted-foreground">Price trend</span>
            <PriceTrendSparkline prices={sparklineData} />
          </div>
          <div className="divide-y">
            {entries.map((entry) =>
              editingId === entry.id ? (
                /* ── Inline edit form ── */
                <div key={entry.id} className="bg-muted/30 px-3 py-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-0.5 block">
                        Price ({entry.currency})
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editForm.price}
                        onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                        autoFocus
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-0.5 block">Package size</label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={editForm.quantity}
                          onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
                          className="w-16 rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        <select
                          value={editForm.unit}
                          onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
                          className="flex-1 rounded-md border bg-background px-1 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                        >
                          {ALL_UNITS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-0.5 block">Date observed</label>
                    <input
                      type="date"
                      value={editForm.date_observed}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEditForm((f) => ({ ...f, date_observed: e.target.value }))}
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <XIcon className="h-3 w-3" /> Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(entry.id)}
                        disabled={saving}
                        className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" /> {saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Normal row ── */
                <div key={entry.id} className="flex items-center justify-between px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{entry.stores.name}</p>
                    <p className="text-muted-foreground">
                      {entry.stores.country} ·{' '}
                      {new Date(entry.date_observed).toLocaleDateString('en-SG', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="font-semibold">{displayPrice(entry)}</p>
                      {entry.price_per_unit != null && (
                        <p className="text-muted-foreground">
                          {formatPerUnit(
                            convert(entry.price_per_unit, entry.currency, currency, rate),
                            currency,
                          )}
                          /{entry.unit}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => startEdit(entry)}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Edit this entry"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
