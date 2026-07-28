'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Pencil, Check, X } from 'lucide-react'

interface Store {
  id: string
  name: string
  country: 'SG' | 'MY'
  city: string
  type: 'supermarket' | 'pharmacy' | 'petrol'
  url?: string
}

const TYPE_LABEL: Record<Store['type'], string> = {
  supermarket: 'Supermarket',
  pharmacy: 'Pharmacy',
  petrol: 'Petrol',
}

// Scrapers match stores by exact name — renaming one of these breaks its
// scraper until the scraper code is updated to match the new name.
const SCRAPER_STORE_NAMES = new Set(['fairprice', 'guardian sg', 'watson jb', 'sheng siong', 'jaya grocer (kl)'])

function isScraperStore(name: string): boolean {
  return SCRAPER_STORE_NAMES.has(name.trim().toLowerCase())
}

function StoreRow({ store, onUpdated }: { store: Store; onUpdated: (s: Store) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(store.name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === store.name) {
      setEditing(false)
      setName(store.name)
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to save')
        return
      }
      onUpdated(data)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="px-4 py-3">
      {!editing ? (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{store.name}</p>
            {store.city && <p className="text-xs text-muted-foreground">{store.city}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-full bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5">
              {TYPE_LABEL[store.type]}
            </span>
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label={`Rename ${store.name}`}
              title="Rename store"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {isScraperStore(store.name) && (
            <p className="text-xs text-destructive">
              Scrapers match stores by exact name — renaming this store will break its scraper
              until the scraper code is updated.
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <button
              onClick={save}
              disabled={saving}
              className="p-2 rounded-md text-primary hover:bg-primary/10 disabled:opacity-50"
              aria-label="Save"
              title="Save"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setName(store.name)
                setError('')
              }}
              className="p-2 rounded-md text-muted-foreground hover:bg-muted"
              aria-label="Cancel"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </li>
  )
}

function AddStoreForm({ onCreated }: { onCreated: (s: Store) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [country, setCountry] = useState<'SG' | 'MY'>('SG')
  const [type, setType] = useState<Store['type']>('supermarket')
  const [city, setCity] = useState('')
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          country,
          type,
          city: city.trim(),
          url: url.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create store')
        return
      }
      onCreated(data)
      setName('')
      setCity('')
      setUrl('')
      setType('supermarket')
      setCountry('SG')
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create store')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <Plus className="h-4 w-4" />
        Add store
      </button>
    )
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">New store</h2>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
        <input
          className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="e.g. FairPrice"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Country</label>
        <div className="flex gap-2">
          {(['SG', 'MY'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCountry(c)}
              className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                country === c
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {c === 'SG' ? 'Singapore' : 'Malaysia'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Type</label>
        <select
          className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          value={type}
          onChange={(e) => setType(e.target.value as Store['type'])}
        >
          <option value="supermarket">Supermarket</option>
          <option value="pharmacy">Pharmacy</option>
          <option value="petrol">Petrol</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">City</label>
        <input
          className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">URL (optional)</label>
        <input
          className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
      >
        {submitting ? 'Adding…' : 'Add store'}
      </button>
    </div>
  )
}

export default function AdminStoresPage() {
  const { data: session, status } = useSession()
  const isAdmin = Boolean(session?.user?.isAdmin)
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/stores')
      .then((r) => r.json())
      .then((data) => setStores(Array.isArray(data) ? data : []))
      .catch(() => setListError('Failed to load stores'))
      .finally(() => setLoading(false))
  }, [isAdmin])

  if (status === 'loading') {
    return (
      <div className="pb-24 px-4 pt-4 max-w-lg mx-auto">
        <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="pb-24 px-4 pt-4 max-w-lg mx-auto">
        <p className="text-sm text-muted-foreground text-center py-12">Not authorized</p>
      </div>
    )
  }

  function handleUpdated(updated: Store) {
    setStores((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))
  }

  function handleCreated(created: Store) {
    setStores((prev) => [...prev, created])
  }

  const sgStores = stores.filter((s) => s.country === 'SG')
  const myStores = stores.filter((s) => s.country === 'MY')

  return (
    <div className="pb-24 px-4 pt-4 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Manage Stores</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Add stores and fix names — admin only</p>
      </div>

      {listError && <p className="text-sm text-destructive mb-4">{listError}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
      ) : (
        <div className="space-y-6 mb-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Singapore
            </p>
            {sgStores.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stores yet.</p>
            ) : (
              <ul className="divide-y rounded-lg border overflow-hidden">
                {sgStores.map((s) => (
                  <StoreRow key={s.id} store={s} onUpdated={handleUpdated} />
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Malaysia
            </p>
            {myStores.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stores yet.</p>
            ) : (
              <ul className="divide-y rounded-lg border overflow-hidden">
                {myStores.map((s) => (
                  <StoreRow key={s.id} store={s} onUpdated={handleUpdated} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <AddStoreForm onCreated={handleCreated} />
    </div>
  )
}
