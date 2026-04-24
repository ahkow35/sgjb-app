'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Car, Bus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Transport = 'drive' | 'bus' | 'grab'

// Pre-set routes: [label, distance km, default toll SGD]
const ROUTES = [
  { label: 'Woodlands Causeway → CW', distanceKm: 3, tollSGD: 1.4 },
  { label: 'Tuas Second Link → Bukit Indah', distanceKm: 30, tollSGD: 2.6 },
  { label: 'Custom distance', distanceKm: 0, tollSGD: 0 },
] as const

// Bus/Grab one-way costs SGD (per person)
const BUS_COST_SGD = 2.5
const GRAB_COST_SGD = 15

function TripROIPageInner() {
  const searchParams = useSearchParams()

  // Cart totals from URL params (passed from cart page)
  const [sgdTotal, setSgdTotal] = useState(
    () => Number(searchParams.get('sgd') ?? 0) || 0,
  )
  const [myrTotal, setMyrTotal] = useState(
    () => Number(searchParams.get('myr') ?? 0) || 0,
  )

  // Transport inputs
  const [transport, setTransport] = useState<Transport>('drive')
  const [routeIdx, setRouteIdx] = useState(0)
  const [customDist, setCustomDist] = useState('10')
  const [fuelEfficiency, setFuelEfficiency] = useState('10') // L/100km
  const [ron95Price, setRon95Price] = useState('3.87') // MYR, auto-filled
  const [people, setPeople] = useState('2')
  const [tollSGD, setTollSGD] = useState('1.40')
  const [grabCost, setGrabCost] = useState(String(GRAB_COST_SGD))

  // Exchange rate
  const [rate, setRate] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/exchange-rate')
      .then((r) => r.json())
      .then((d) => { if (d?.rate) setRate(d.rate) })
      .catch(() => {})
    fetch('/api/petrol')
      .then((r) => r.json())
      .then((d) => { if (d?.ron95) setRon95Price(String(d.ron95)) })
      .catch(() => {})
  }, [])

  // Sync toll when route changes
  useEffect(() => {
    const route = ROUTES[routeIdx]
    if (route.tollSGD > 0) setTollSGD(String(route.tollSGD))
  }, [routeIdx])

  // Compute trip cost in SGD
  const numPeople = Math.max(1, Number(people) || 1)
  const rate1 = rate ?? 3.35 // fallback

  let transportCostSGDTotal = 0
  let transportCostSGDPerPerson = 0

  if (transport === 'drive') {
    const dist = routeIdx < ROUTES.length - 1 ? ROUTES[routeIdx].distanceKm : Number(customDist) || 0
    const fuelL = (dist * 2 * Number(fuelEfficiency || 10)) / 100 // round trip
    const fuelMYR = fuelL * Number(ron95Price || 3.87)
    const fuelSGD = fuelMYR / rate1
    const toll = Number(tollSGD || 0) * 2 // round trip (simplified: same toll both ways)
    transportCostSGDTotal = fuelSGD + toll
    transportCostSGDPerPerson = transportCostSGDTotal / numPeople
  } else if (transport === 'bus') {
    transportCostSGDPerPerson = BUS_COST_SGD * 2 // round trip
    transportCostSGDTotal = transportCostSGDPerPerson * numPeople
  } else {
    transportCostSGDPerPerson = Number(grabCost || GRAB_COST_SGD) * 2
    transportCostSGDTotal = transportCostSGDPerPerson * numPeople
  }

  // Savings = SG total - JB total in SGD
  const myrInSGD = myrTotal / rate1
  const grocerySavings = sgdTotal > 0 && myrTotal > 0 ? sgdTotal - myrInSGD : 0
  const netSavings = grocerySavings - transportCostSGDTotal
  const breakEvenSGD = transportCostSGDTotal > 0 && rate1 > 0
    ? transportCostSGDTotal / (1 - 1 / rate1) // approximate: savings≈ sgdVal*(1-1/rate)
    : 0

  const hasTotals = sgdTotal > 0 || myrTotal > 0

  return (
    <div className="pb-24 px-4 pt-4 max-w-lg mx-auto">
      <Link
        href="/cart"
        className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Cart
      </Link>

      <h1 className="text-xl font-semibold mb-1">Is my JB trip worth it?</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Calculate whether the trip savings outweigh the travel costs
      </p>

      {/* Cart totals */}
      <section className="mb-5">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Shopping Cart Totals
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">SG Total (SGD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">S$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={sgdTotal || ''}
                onChange={(e) => setSgdTotal(Number(e.target.value))}
                className="w-full rounded-lg border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">JB Total (MYR)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">RM</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={myrTotal || ''}
                onChange={(e) => setMyrTotal(Number(e.target.value))}
                className="w-full rounded-lg border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        {!hasTotals && (
          <p className="text-xs text-muted-foreground mt-2">
            ← Enter totals above, or{' '}
            <Link href="/cart" className="text-primary hover:underline">add items to your cart</Link>{' '}
            first
          </p>
        )}
      </section>

      {/* Transport */}
      <section className="mb-5">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Transport Mode
        </h2>
        <div className="flex gap-2 mb-4">
          {(['drive', 'bus', 'grab'] as Transport[]).map((t) => (
            <button
              key={t}
              onClick={() => setTransport(t)}
              className={`flex-1 flex flex-col items-center gap-1 rounded-lg border py-3 text-xs font-medium capitalize transition-colors ${
                transport === t
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {t === 'drive' ? <Car className="h-4 w-4" /> : <Bus className="h-4 w-4" />}
              {t === 'grab' ? 'Grab/Taxi' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {transport === 'drive' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Route</label>
              <div className="space-y-1.5">
                {ROUTES.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => setRouteIdx(i)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                      routeIdx === i
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="font-medium">{r.label}</span>
                    {r.distanceKm > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">~{r.distanceKm}km</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {routeIdx === ROUTES.length - 1 && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">One-way distance (km)</label>
                <input
                  type="number"
                  min="1"
                  value={customDist}
                  onChange={(e) => setCustomDist(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Fuel use (L/100km)</label>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={fuelEfficiency}
                  onChange={(e) => setFuelEfficiency(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">RON95 price (RM/L)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ron95Price}
                  onChange={(e) => setRon95Price(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Toll one-way (SGD) — enter for each direction you pay
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">S$</span>
                <input
                  type="number"
                  min="0"
                  step="0.10"
                  value={tollSGD}
                  onChange={(e) => setTollSGD(e.target.value)}
                  className="w-full rounded-lg border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>
        )}

        {transport === 'grab' && (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Estimated one-way fare (SGD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">S$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={grabCost}
                onChange={(e) => setGrabCost(e.target.value)}
                className="w-full rounded-lg border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        )}

        <div className="mt-3">
          <label className="text-xs text-muted-foreground block mb-1">Number of people sharing costs</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setPeople(String(n))}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  Number(people) === n
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Trip Verdict</h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Grocery savings (before trip)</span>
            <span className={grocerySavings > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
              {grocerySavings > 0 ? `S$${grocerySavings.toFixed(2)}` : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Transport cost ({transport === 'drive' ? 'round trip' : 'per person × 2'}, total)
            </span>
            <span className="text-red-500 font-medium">−S${transportCostSGDTotal.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Net savings per trip</span>
            <span
              className={
                netSavings > 0
                  ? 'text-green-600'
                  : netSavings < 0
                    ? 'text-red-500'
                    : 'text-muted-foreground'
              }
            >
              {netSavings > 0 ? '+' : ''}S${netSavings.toFixed(2)}
            </span>
          </div>
        </div>

        {hasTotals && (
          <div
            className={`rounded-md px-3 py-2.5 text-sm text-center font-medium ${
              netSavings > 0
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
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
      </section>
    </div>
  )
}

export default function TripROIPage() {
  return (
    <Suspense>
      <TripROIPageInner />
    </Suspense>
  )
}
