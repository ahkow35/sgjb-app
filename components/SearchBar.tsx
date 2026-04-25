'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useRef, useTransition } from 'react'

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Beverages', value: 'beverages' },
  { label: 'Snacks', value: 'snacks' },
  { label: 'Health', value: 'health' },
  { label: 'Beauty', value: 'beauty' },
  { label: 'Household', value: 'household' },
]

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''

  function navigate(newQ: string, newCat: string) {
    const params = new URLSearchParams()
    if (newQ) params.set('q', newQ)
    if (newCat) params.set('category', newCat)
    startTransition(() => {
      router.push(`/products?${params.toString()}`)
    })
  }

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pt-4 pb-3 px-4 border-b border-border">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          defaultValue={q}
          placeholder="Search products…"
          className="w-full rounded-xl border border-border bg-card pl-9 pr-9 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
          onChange={(e) => navigate(e.target.value, category)}
        />
        {q && (
          <button
            onClick={() => {
              if (inputRef.current) inputRef.current.value = ''
              navigate('', category)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 mt-2.5 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => navigate(q, cat.value)}
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
