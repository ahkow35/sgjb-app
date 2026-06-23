# SGJB Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Navy + Gold palette, Outfit font, and polished component designs across every screen of the SGJB app.

**Architecture:** Pure styling changes — CSS custom properties, Tailwind config, and component rewrites. No backend changes, no new routes. Server Components stay as Server Components; client components stay client. One new client component (`SearchBar`) extracts the sticky search + category chips from the products Server Component.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, shadcn/ui, Outfit font via `next/font/google`

---

## File Map

| File | Change |
|---|---|
| `app/globals.css` | New Navy + Gold CSS tokens, increased radius |
| `tailwind.config.ts` | Add `gold` color, increase radius to `0.75rem` |
| `app/layout.tsx` | Swap Inter → Outfit |
| `app/(dashboard)/page.tsx` | Remove plain h1, wrap with hero layout |
| `components/ExchangeWidget.tsx` | Navy gradient hero with frosted rate card |
| `components/PetrolWidget.tsx` | Three tinted grade cards |
| `components/ProductCard.tsx` | Full redesign: flags, savings pill, gold Add button |
| `components/BottomNav.tsx` | Gold dot active, cart item count badge |
| `components/SearchBar.tsx` | NEW — sticky search + category chip client component |
| `app/products/page.tsx` | Use SearchBar, remove inline form |
| `app/cart/page.tsx` | Navy totals header, gold savings pill, gold CTA button |
| `app/auth/page.tsx` | Navy top panel, white card body |
| `app/submit/page.tsx` | Gold completed step, scan button polish |
| `app/trip-roi/page.tsx` | Navy verdict header, gold positive savings |

---

### Task 1: Global tokens — colors, radius, font

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace CSS custom properties in `app/globals.css`**

Replace the entire file with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 220 30% 97%;
    --foreground: 220 46% 14%;
    --card: 0 0% 100%;
    --card-foreground: 220 46% 14%;
    --popover: 0 0% 100%;
    --popover-foreground: 220 46% 14%;
    --primary: 220 46% 19%;
    --primary-foreground: 0 0% 100%;
    --secondary: 220 30% 94%;
    --secondary-foreground: 220 46% 19%;
    --muted: 220 30% 94%;
    --muted-foreground: 220 20% 50%;
    --accent: 40 47% 55%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 220 30% 90%;
    --input: 220 30% 90%;
    --ring: 220 46% 19%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 220 46% 9%;
    --foreground: 210 40% 96%;
    --card: 220 46% 12%;
    --card-foreground: 210 40% 96%;
    --popover: 220 46% 12%;
    --popover-foreground: 210 40% 96%;
    --primary: 40 47% 55%;
    --primary-foreground: 220 46% 9%;
    --secondary: 220 30% 18%;
    --secondary-foreground: 210 40% 96%;
    --muted: 220 30% 18%;
    --muted-foreground: 220 20% 60%;
    --accent: 40 47% 55%;
    --accent-foreground: 220 46% 9%;
    --destructive: 0 62% 40%;
    --destructive-foreground: 210 40% 98%;
    --border: 220 30% 22%;
    --input: 220 30% 22%;
    --ring: 40 47% 55%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

- [ ] **Step 2: Update `tailwind.config.ts` — add gold color + scan-line animation**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        gold: {
          DEFAULT: "#C9A84C",
          light: "#F5E9C8",
          dark: "#A07830",
        },
        navy: {
          DEFAULT: "#1B2A4A",
          light: "#243B6E",
          dark: "#111D33",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "scan-line": {
          "0%, 100%": { top: "0%" },
          "50%": { top: "100%" },
        },
      },
      animation: {
        "scan-line": "scan-line 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 3: Swap Inter → Outfit in `app/layout.tsx`**

```typescript
import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { BottomNav } from '@/components/BottomNav'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { CartProvider } from '@/lib/cart-context'
import { SessionProvider } from '@/components/SessionProvider'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'SGJB — SG & JB Price Comparison',
  description: 'Compare grocery, pharmacy and petrol prices between Singapore and Johor Bahru',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'SGJB' },
}

export const viewport: Viewport = {
  themeColor: '#1B2A4A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.className} bg-background`}>
        <SessionProvider>
          <CurrencyProvider>
            <CartProvider>
              <main className="mx-auto max-w-md min-h-screen pb-20">
                {children}
              </main>
              <BottomNav />
            </CartProvider>
          </CurrencyProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/globals.css tailwind.config.ts app/layout.tsx
git commit -m "style: apply Navy+Gold tokens, Outfit font, 0.75rem radius"
```

---

### Task 2: Dashboard hero — ExchangeWidget + PetrolWidget + page

**Files:**
- Modify: `components/ExchangeWidget.tsx`
- Modify: `components/PetrolWidget.tsx`
- Modify: `app/(dashboard)/page.tsx`

- [ ] **Step 1: Rewrite `components/ExchangeWidget.tsx`**

```typescript
'use client'
import { useEffect } from 'react'
import { useCurrency } from '@/contexts/CurrencyContext'
import type { CachedRate } from '@/lib/exchange'

interface Props {
  initialData: CachedRate
}

export function ExchangeWidget({ initialData }: Props) {
  const { setRate } = useCurrency()

  useEffect(() => {
    setRate(initialData.rate)
  }, [initialData.rate, setRate])

  const sgdToMyr = initialData.rate.toFixed(4)
  const myrToSgd = (1 / initialData.rate).toFixed(4)
  const updatedTime = new Date(initialData.updatedAt).toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="bg-gradient-to-br from-navy to-navy-light px-5 pt-10 pb-8 text-white">
      {/* App header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">SGJB</h1>
        <p className="text-sm text-white/70 mt-0.5">SG & JB Price Comparison</p>
      </div>

      {/* Rate card */}
      <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-white/60 font-medium uppercase tracking-widest">
            SGD / MYR Rate
          </p>
          <span className="flex items-center gap-1.5 bg-gold/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse inline-block" />
            Live · {updatedTime}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-white/50 text-xs">1 SGD =</p>
            <p className="text-3xl font-extrabold tracking-tight">RM {sgdToMyr}</p>
          </div>
          <div>
            <p className="text-white/50 text-xs">1 MYR =</p>
            <p className="text-3xl font-extrabold tracking-tight">S$ {myrToSgd}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `components/PetrolWidget.tsx`**

```typescript
import type { PetrolPrices } from '@/lib/petrol'

interface Props {
  data: PetrolPrices
}

const grades = [
  { key: 'ron95' as const, label: 'RON 95', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  { key: 'ron97' as const, label: 'RON 97', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  { key: 'diesel' as const, label: 'Diesel', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
]

export function PetrolWidget({ data }: Props) {
  const dateLabel = new Date(data.date).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="px-4 pt-5 pb-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          JB Petrol Prices
        </p>
        <p className="text-xs text-muted-foreground">{dateLabel} · data.gov.my</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {grades.map(({ key, label, bg, border, text }) => (
          <div
            key={key}
            className={`rounded-xl ${bg} border ${border} px-3 py-3 text-center`}
          >
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-xl font-extrabold ${text}`}>
              {data[key].toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">RM/L</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `app/(dashboard)/page.tsx`** — remove the plain h1, let ExchangeWidget own the header

```typescript
import { ExchangeWidget } from '@/components/ExchangeWidget'
import { PetrolWidget } from '@/components/PetrolWidget'
import { db, liveData } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { fetchExchangeRate, CACHE_KEY as EX_KEY } from '@/lib/exchange'
import { fetchPetrolPrices, CACHE_KEY as PETROL_KEY } from '@/lib/petrol'
import type { CachedRate } from '@/lib/exchange'
import type { PetrolPrices } from '@/lib/petrol'

async function getExchangeRate(): Promise<CachedRate> {
  const [row] = await db.select().from(liveData).where(eq(liveData.key, EX_KEY)).limit(1)
  if (row?.value) return row.value as CachedRate
  const fresh = await fetchExchangeRate()
  await db.insert(liveData)
    .values({ key: EX_KEY, value: fresh, updatedAt: new Date() })
    .onConflictDoUpdate({ target: liveData.key, set: { value: fresh, updatedAt: new Date() } })
  return fresh
}

async function getPetrolPrices(): Promise<PetrolPrices> {
  const [row] = await db.select().from(liveData).where(eq(liveData.key, PETROL_KEY)).limit(1)
  if (row?.value) return row.value as PetrolPrices
  const fresh = await fetchPetrolPrices()
  await db.insert(liveData)
    .values({ key: PETROL_KEY, value: fresh, updatedAt: new Date() })
    .onConflictDoUpdate({ target: liveData.key, set: { value: fresh, updatedAt: new Date() } })
  return fresh
}

export default async function DashboardPage() {
  const [exchangeData, petrolData] = await Promise.all([
    getExchangeRate(),
    getPetrolPrices(),
  ])

  return (
    <div className="pb-4">
      <ExchangeWidget initialData={exchangeData} />
      <PetrolWidget data={petrolData} />
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add components/ExchangeWidget.tsx components/PetrolWidget.tsx "app/(dashboard)/page.tsx"
git commit -m "style: navy gradient hero, tinted petrol grade cards"
```

---

### Task 3: ProductCard redesign

**Files:**
- Modify: `components/ProductCard.tsx`

- [ ] **Step 1: Rewrite `components/ProductCard.tsx`**

```typescript
import Link from 'next/link'
import { AddToCartButton } from './AddToCartButton'
import { PriceHistoryDropdown } from './PriceHistoryDropdown'

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
}

export function ProductCard({ product }: Props) {
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
              <Link href={`/products/${product.id}`} className="min-w-0">
                <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                  {product.name}
                </p>
              </Link>
              <AddToCartButton
                productId={product.id}
                productName={product.name}
                brand={product.brand}
                className="shrink-0"
              />
            </div>
            {product.brand && (
              <p className="text-xs text-muted-foreground mt-0.5">{product.brand}</p>
            )}
            <div className="mt-1.5 flex gap-1.5 flex-wrap">
              {product.category && (
                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                  {product.category}
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs">
                {product.unit_type}
              </span>
            </div>
          </div>
        </div>
      </div>
      <PriceHistoryDropdown productId={product.id} />
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `components/AddToCartButton.tsx`** with gold styling

```typescript
'use client'

import { useCart } from '@/lib/cart-context'
import { ShoppingCart, Check } from 'lucide-react'
import { useState } from 'react'

interface Props {
  productId: string
  productName: string
  brand: string
  className?: string
}

export function AddToCartButton({ productId, productName, brand, className = '' }: Props) {
  const { add, items } = useCart()
  const [added, setAdded] = useState(false)
  const inCart = items.some((i) => i.productId === productId)

  function handleAdd() {
    add({ productId, productName, brand })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <button
      onClick={handleAdd}
      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
        inCart || added
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-gold text-white hover:bg-gold-dark'
      } ${className}`}
    >
      {inCart || added ? (
        <>
          <Check className="h-3 w-3" />
          {added ? 'Added' : 'In cart'}
        </>
      ) : (
        <>
          <ShoppingCart className="h-3 w-3" />
          Add
        </>
      )}
    </button>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/ProductCard.tsx components/AddToCartButton.tsx
git commit -m "style: redesign ProductCard with flag pills, savings callout, gold Add button"
```

---

### Task 4: BottomNav — cart badge + gold active indicator

**Files:**
- Modify: `components/BottomNav.tsx`

- [ ] **Step 1: Rewrite `components/BottomNav.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingCart, Search, PlusCircle, User } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCart } from '@/lib/cart-context'

const BASE_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Products', icon: Search },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/submit', label: 'Submit', icon: PlusCircle },
]

export function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { items } = useCart()
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)

  const navItems = [
    ...BASE_ITEMS,
    {
      href: session ? '/profile' : '/auth',
      label: session ? 'Profile' : 'Sign in',
      icon: User,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="flex h-16 items-center justify-around max-w-md mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href === '/cart' && pathname === '/trip-roi')

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors ${
                active ? 'text-navy font-semibold' : 'text-muted-foreground'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {href === '/cart' && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white text-[9px] font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              {active && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-gold" />
              )}
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/BottomNav.tsx
git commit -m "style: gold dot active indicator, cart item count badge on nav"
```

---

### Task 5: Products page — sticky search + category chips

**Files:**
- Create: `components/SearchBar.tsx`
- Modify: `app/products/page.tsx`

- [ ] **Step 1: Create `components/SearchBar.tsx`** — client component for search + chips

```typescript
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
```

- [ ] **Step 2: Update `app/products/page.tsx`** to use SearchBar and remove inline form

```typescript
import { db, products } from '@/lib/db'
import { eq, and, sql, SQL } from 'drizzle-orm'
import { buildProductSearchQuery } from '@/app/api/products/utils'
import { ProductCard } from '@/components/ProductCard'
import { CurrencyToggle } from '@/components/CurrencyToggle'
import { SearchBar } from '@/components/SearchBar'
import { Suspense } from 'react'

interface SearchParams { q?: string; category?: string }

async function getProducts(q: string, category: string) {
  const conditions: SQL[] = []
  const tsQuery = buildProductSearchQuery(q)
  if (tsQuery) {
    conditions.push(sql`to_tsvector('english', ${products.name}) @@ to_tsquery('english', ${tsQuery})`)
  }
  if (category) {
    conditions.push(eq(products.category, category))
  }
  try {
    return await db.select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      category: products.category,
      image_url: products.imageUrl,
      unit_type: products.unitType,
    })
      .from(products)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(30)
  } catch (e) {
    console.error('[products] DB query error:', String(e))
    return []
  }
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const q = searchParams.q ?? ''
  const category = searchParams.category ?? ''
  const productList = await getProducts(q, category)

  return (
    <div>
      <Suspense>
        <SearchBar />
      </Suspense>

      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {productList.length} product{productList.length !== 1 ? 's' : ''}
        </p>
        <CurrencyToggle />
      </div>

      {productList.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground px-4">
          {q ? `No results for "${q}"` : 'No products yet. Be the first to submit!'}
        </p>
      ) : (
        <div className="px-4 space-y-3 pb-4">
          {productList.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add `no-scrollbar` utility to `globals.css`**

Append to the `@layer utilities` block:

```css
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}
```

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add components/SearchBar.tsx app/products/page.tsx app/globals.css
git commit -m "style: sticky search bar, category chips, product count on products page"
```

---

### Task 6: Cart page polish

**Files:**
- Modify: `app/cart/page.tsx`

- [ ] **Step 1: Polish the cart totals card and CTA button**

Replace the totals section `{!loading && (totalSGD > 0 || totalMYR > 0) && (` block with:

```typescript
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
```

- [ ] **Step 2: Update the Trip ROI CTA button** (at bottom of cart page):

```typescript
      <Link
        href={`/trip-roi?sgd=${totalSGD.toFixed(2)}&myr=${totalMYR.toFixed(2)}`}
        className="flex items-center justify-between w-full rounded-xl bg-gold px-4 py-3.5 text-sm font-bold text-white shadow-sm"
      >
        <span>Calculate trip ROI</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/cart/page.tsx
git commit -m "style: navy gradient cart totals header, gold Trip ROI CTA"
```

---

### Task 7: Auth, Submit, Trip ROI polish

**Files:**
- Modify: `app/auth/page.tsx`
- Modify: `app/trip-roi/page.tsx`
- Modify: `app/submit/page.tsx`

- [ ] **Step 1: Polish `app/auth/page.tsx`** — add navy top panel

Replace the outer `<div className="min-h-screen flex flex-col items-center justify-center ...">` and logo section:

```typescript
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navy top panel */}
      <div className="bg-gradient-to-br from-navy to-navy-light px-6 pt-14 pb-16 text-white text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">SGJB</h1>
        <p className="text-sm text-white/70 mt-1">SG & JB Price Comparison</p>
      </div>

      {/* White card overlapping the panel */}
      <div className="-mt-8 mx-4 bg-card rounded-2xl shadow-lg border border-border p-6 flex-1">
        {/* Tabs */}
        <div className="flex rounded-xl border border-border overflow-hidden mb-5">
          {(['signin', 'signup'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                tab === t
                  ? 'bg-navy text-white'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={tab === 'signin' ? handleSignIn : handleSignUp} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Password</label>
            <input
              type="password"
              required
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={tab === 'signup' ? 'At least 8 characters' : '••••••••'}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-navy py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading
              ? tab === 'signin' ? 'Signing in…' : 'Creating account…'
              : tab === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-5">
          {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setTab(tab === 'signin' ? 'signup' : 'signin'); setError('') }}
            className="text-navy font-semibold hover:underline"
          >
            {tab === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
```

- [ ] **Step 2: Polish `app/trip-roi/page.tsx`** — navy verdict card header

Replace the results `<section className="rounded-lg border p-4 space-y-3">` with:

```typescript
      <section className="rounded-2xl overflow-hidden border border-border shadow-sm">
        <div className="bg-gradient-to-r from-navy to-navy-light px-4 py-3">
          <h2 className="text-sm font-bold text-white">Trip Verdict</h2>
        </div>
        <div className="bg-card p-4 space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Grocery savings (before trip)</span>
              <span className={grocerySavings > 0 ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>
                {grocerySavings > 0 ? `S$${grocerySavings.toFixed(2)}` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Transport cost ({transport === 'drive' ? 'round trip' : 'per person × 2'}, total)
              </span>
              <span className="text-destructive font-semibold">−S${transportCostSGDTotal.toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span>Net savings per trip</span>
              <span className={
                netSavings > 0 ? 'text-emerald-600' : netSavings < 0 ? 'text-destructive' : 'text-muted-foreground'
              }>
                {netSavings > 0 ? '+' : ''}S${netSavings.toFixed(2)}
              </span>
            </div>
          </div>

          {hasTotals && (
            <div className={`rounded-xl px-4 py-3 text-sm text-center font-semibold ${
              netSavings > 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-destructive border border-red-200'
            }`}>
              {netSavings > 0
                ? `✓ Worth it — you save S$${netSavings.toFixed(2)} per person`
                : `✗ Not worth it yet`}
            </div>
          )}

          {breakEvenSGD > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Break-even: spend at least{' '}
              <strong className="text-foreground">S${Math.ceil(breakEvenSGD)}</strong> in JB to cover trip costs
            </p>
          )}

          {rate && (
            <p className="text-xs text-muted-foreground text-right">
              Rate: 1 SGD = {rate.toFixed(4)} MYR
            </p>
          )}
        </div>
      </section>
```

- [ ] **Step 3: Polish `app/submit/page.tsx`** step indicators — navy active, gold completed

Replace the step indicators map:

```typescript
          {(['product', 'store', 'price'] as const).map((s, i) => {
            const stepOrder = ['product', 'store', 'price']
            const currentIdx = stepOrder.indexOf(step as string)
            const isCompleted = i < currentIdx
            const isActive = step === s
            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-navy text-white'
                      : isCompleted
                        ? 'bg-gold text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-navy' : 'text-muted-foreground'}`}>
                  {s === 'product' ? 'Product' : s === 'store' ? 'Store' : 'Price'}
                </span>
                {i < 2 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            )
          })}
```

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/auth/page.tsx app/trip-roi/page.tsx app/submit/page.tsx
git commit -m "style: navy top panel on auth, verdict card polish, gold completed steps"
```

---

### Task 8: Final verification + push

- [ ] **Step 1: Full TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 2: Start dev server and visually verify each screen**

Run: `npm run dev`

Check:
- `/` — Navy gradient hero, live rate, tinted petrol cards
- `/products` — Sticky search + category chips, redesigned product cards, gold Add button
- `/cart` — Navy totals header, gold Trip ROI button
- `/auth` — Navy top panel, white card
- `/submit` — Gold completed step indicators
- `/trip-roi` — Navy verdict header

- [ ] **Step 3: Push**

```bash
git push origin main
```
