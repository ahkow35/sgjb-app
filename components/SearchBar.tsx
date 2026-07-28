'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState, useTransition } from 'react'

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Beverages', value: 'beverages' },
  { label: 'Snacks', value: 'snacks' },
  { label: 'Health', value: 'health' },
  { label: 'Beauty', value: 'beauty' },
  { label: 'Household', value: 'household' },
]

const DEBOUNCE_MS = 350

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''

  const [value, setValue] = useState(q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep the input in sync when the URL changes from elsewhere (category chip,
  // clear button, browser back/forward) — but not while our own debounce is
  // still pending, or the field would appear to "revert" mid-type.
  useEffect(() => {
    if (debounceRef.current) return
    setValue(q)
  }, [q])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function navigate(newQ: string, newCat: string) {
    const params = new URLSearchParams()
    if (newQ) params.set('q', newQ)
    if (newCat) params.set('category', newCat)
    startTransition(() => {
      router.push(`/products?${params.toString()}`)
    })
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value
    setValue(newValue)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      navigate(newValue, category)
    }, DEBOUNCE_MS)
  }

  function handleClear() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setValue('')
    navigate('', category)
  }

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pt-4 pb-3 px-4 border-b border-border">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={value}
          placeholder="Search products…"
          aria-label="Search products"
          className="w-full rounded-xl border border-border bg-card pl-9 pr-9 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
          onChange={handleChange}
        />
        {value && (
          <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 mt-2.5 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => navigate(value, cat.value)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              category === cat.value
                ? 'bg-navy text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  )
}
