'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, ChevronRight, ChevronLeft, CheckCircle, Plus, X, ScanLine } from 'lucide-react'
import Link from 'next/link'
import { BarcodeScanner } from '@/components/BarcodeScanner'

interface Product {
  id: string
  name: string
  brand: string
  category: string
  unit_type: 'weight' | 'each' | 'volume'
  barcode: string | null
}

interface Store {
  id: string
  name: string
  country: 'SG' | 'MY'
  city: string
  type: string
}

type Step = 'product' | 'store' | 'price' | 'done'

const UNIT_OPTIONS: Record<'weight' | 'each' | 'volume', string[]> = {
  weight: ['g', 'kg'],
  volume: ['ml', 'L'],
  each: ['each', 'pack', 'pcs', 'tablet', 'capsule', 'sachet'],
}

export default function SubmitPage() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('product')

  // Product step
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '',
    brand: '',
    category: '',
    unit_type: 'each' as 'weight' | 'each' | 'volume',
    barcode: '',
  })

  // Barcode scanner
  const [showScanner, setShowScanner] = useState(false)

  // Store step
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)

  // Price step
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('each')
  const [dateObserved, setDateObserved] = useState(
    () => new Date().toISOString().split('T')[0],
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Pre-fill product from query params (?product_id=...&product_name=...)
  useEffect(() => {
    const pid = searchParams.get('product_id')
    const pname = searchParams.get('product_name')
    if (pid && pname && !selectedProduct) {
      fetch(`/api/products/${pid}`)
        .then((r) => r.json())
        .then((p) => {
          if (p?.id) {
            setSelectedProduct({ ...p, unit_type: p.unit_type ?? 'each' })
            setQuery(p.name)
          }
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced product search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(query)}&limit=8`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Load stores when entering store step
  useEffect(() => {
    if (step !== 'store') return
    fetch('/api/stores')
      .then((r) => r.json())
      .then((data) => setStores(Array.isArray(data) ? data : []))
      .catch(() => setStores([]))
  }, [step])

  // Reset unit when unit_type changes
  useEffect(() => {
    const unitType = selectedProduct?.unit_type ?? newProduct.unit_type
    setUnit(UNIT_OPTIONS[unitType][0])
  }, [selectedProduct, newProduct.unit_type])

  async function handleProductNext() {
    if (creatingNew) {
      if (!newProduct.name.trim()) return
      // Create the product via API
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name.trim(),
          brand: newProduct.brand.trim(),
          category: newProduct.category.trim(),
          unit_type: newProduct.unit_type,
          barcode: newProduct.barcode.trim() || null,
        }),
      })
      if (!res.ok) return
      const created = await res.json()
      setSelectedProduct({ ...created, unit_type: created.unit_type ?? newProduct.unit_type })
    }
    setStep('store')
  }

  async function handleSubmit() {
    if (!selectedProduct || !selectedStore || !price) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/price-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          store_id: selectedStore.id,
          price: Number(price),
          quantity: Number(quantity),
          unit,
          date_observed: dateObserved,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setSubmitError(err.error ?? 'Submission failed')
        return
      }
      setStep('done')
    } catch (e) {
      setSubmitError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setStep('product')
    setQuery('')
    setResults([])
    setSelectedProduct(null)
    setCreatingNew(false)
    setNewProduct({ name: '', brand: '', category: '', unit_type: 'each', barcode: '' })
    setSelectedStore(null)
    setPrice('')
    setQuantity('1')
    setUnit('each')
    setDateObserved(new Date().toISOString().split('T')[0])
    setSubmitError('')
  }

  function handleScannedProduct(product: Product) {
    setShowScanner(false)
    setSelectedProduct(product)
    setQuery(product.name)
    setResults([])
    setCreatingNew(false)
  }

  function handleBarcodeNotFound(barcode: string) {
    setShowScanner(false)
    setCreatingNew(true)
    setNewProduct((prev) => ({ ...prev, barcode }))
  }

  const sgStores = stores.filter((s) => s.country === 'SG')
  const myStores = stores.filter((s) => s.country === 'MY')
  const unitType = selectedProduct?.unit_type ?? newProduct.unit_type
  const unitOptions = UNIT_OPTIONS[unitType]

  const canAdvanceProduct =
    creatingNew ? newProduct.name.trim().length > 0 : selectedProduct !== null

  return (
    <div className="pb-24 px-4 pt-4 max-w-lg mx-auto">
      {showScanner && (
        <BarcodeScanner
          onClose={() => setShowScanner(false)}
          onProduct={handleScannedProduct}
          onNotFound={handleBarcodeNotFound}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Submit a Price</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Help the community by sharing prices you spotted
        </p>
      </div>

      {/* Step indicators */}
      {step !== 'done' && (
        <div className="flex items-center gap-2 mb-6">
          {(['product', 'store', 'price'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full text-xs font-medium flex items-center justify-center ${
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : ['store', 'price'].indexOf(step) > i
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-xs ${step === s ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
              >
                {s === 'product' ? 'Product' : s === 'store' ? 'Store' : 'Price'}
              </span>
              {i < 2 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Product */}
      {step === 'product' && (
        <div className="space-y-4">
          {!creatingNew ? (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    className="w-full rounded-lg border bg-background pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Search products (e.g. Milo, Panadol)"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setSelectedProduct(null)
                    }}
                    autoFocus
                  />
                  {query && (
                    <button
                      onClick={() => { setQuery(''); setResults([]); setSelectedProduct(null) }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowScanner(true)}
                  className="shrink-0 rounded-lg border bg-background px-3 flex items-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                  title="Scan barcode"
                >
                  <ScanLine className="h-4 w-4" />
                </button>
              </div>

              {selectedProduct && (
                <div className="rounded-lg border border-primary bg-primary/5 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{selectedProduct.name}</p>
                    {selectedProduct.brand && (
                      <p className="text-xs text-muted-foreground">{selectedProduct.brand}</p>
                    )}
                  </div>
                  <button onClick={() => { setSelectedProduct(null); setQuery('') }}>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              )}

              {!selectedProduct && results.length > 0 && (
                <ul className="divide-y rounded-lg border overflow-hidden">
                  {results.map((p) => (
                    <li key={p.id}>
                      <button
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setSelectedProduct(p)
                          setQuery(p.name)
                          setResults([])
                        }}
                      >
                        <p className="text-sm font-medium">{p.name}</p>
                        {p.brand && (
                          <p className="text-xs text-muted-foreground">{p.brand}</p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!selectedProduct && searching && (
                <p className="text-sm text-muted-foreground text-center py-2">Searching…</p>
              )}

              {!selectedProduct && query.length >= 2 && !searching && results.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No products found</p>
              )}

              <button
                onClick={() => setCreatingNew(true)}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Plus className="h-4 w-4" />
                Add a new product
              </button>
            </>
          ) : (
            /* New product form */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">New product</h2>
                <button
                  onClick={() => setCreatingNew(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Search instead
                </button>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
                <input
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="e.g. Milo Chocolate Malt Powder 400g"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Brand</label>
                <input
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="e.g. Milo"
                  value={newProduct.brand}
                  onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <input
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="e.g. beverages"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Unit type</label>
                <div className="flex gap-2">
                  {(['each', 'weight', 'volume'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewProduct({ ...newProduct, unit_type: t })}
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition-colors ${
                        newProduct.unit_type === t
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Barcode (optional)
                </label>
                <input
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="EAN barcode"
                  value={newProduct.barcode}
                  onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleProductNext}
            disabled={!canAdvanceProduct}
            className="mt-2 w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-40 flex items-center justify-center gap-1"
          >
            Next: Select Store <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 2: Store */}
      {step === 'store' && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Singapore
            </p>
            <ul className="divide-y rounded-lg border overflow-hidden">
              {sgStores.map((s) => (
                <li key={s.id}>
                  <button
                    className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                      selectedStore?.id === s.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedStore(s)}
                  >
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{s.type}</p>
                    </div>
                    {selectedStore?.id === s.id && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Johor Bahru
            </p>
            <ul className="divide-y rounded-lg border overflow-hidden">
              {myStores.map((s) => (
                <li key={s.id}>
                  <button
                    className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                      selectedStore?.id === s.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedStore(s)}
                  >
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{s.type}</p>
                    </div>
                    {selectedStore?.id === s.id && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep('product')}
              className="flex-1 rounded-lg border py-3 text-sm font-medium flex items-center justify-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={() => setStep('price')}
              disabled={!selectedStore}
              className="flex-1 rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-40 flex items-center justify-center gap-1"
            >
              Next: Enter Price <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Price */}
      {step === 'price' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-lg border p-3 bg-muted/30 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Product</span>
              <span className="font-medium truncate ml-2 max-w-[65%] text-right">
                {selectedProduct?.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Store</span>
              <span className="font-medium">
                {selectedStore?.name}{' '}
                <span className="text-xs text-muted-foreground">
                  ({selectedStore?.country === 'MY' ? 'MYR' : 'SGD'})
                </span>
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Price ({selectedStore?.country === 'MY' ? 'MYR' : 'SGD'}) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {selectedStore?.country === 'MY' ? 'RM' : 'S$'}
              </span>
              <input
                className="w-full rounded-lg border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="0.00"
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                type="number"
                min="0.001"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                {unitOptions.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date observed *</label>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              type="date"
              value={dateObserved}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDateObserved(e.target.value)}
            />
          </div>

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep('store')}
              className="flex-1 rounded-lg border py-3 text-sm font-medium flex items-center justify-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!price || submitting}
              className="flex-1 rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : 'Submit Price'}
            </button>
          </div>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <div>
            <h2 className="text-lg font-semibold">Price submitted!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Thanks for helping the community.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full mt-2">
            <button
              onClick={resetForm}
              className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground"
            >
              Submit another price
            </button>
            {selectedProduct && (
              <Link
                href={`/products/${selectedProduct.id}`}
                className="w-full rounded-lg border py-3 text-sm font-medium text-center block"
              >
                View product
              </Link>
            )}
            <Link
              href="/products"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Browse all products
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
