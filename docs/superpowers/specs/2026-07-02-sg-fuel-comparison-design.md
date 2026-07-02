# SG fuel comparison + SGD captions — design

Date: 2026-07-02
Status: approved

## Goal

On the dashboard's "JB Petrol Prices" widget:

1. Add **Singapore** fuel prices as a point of comparison alongside the existing
   Malaysia (data.gov.my) prices.
2. Show the **SGD-converted** value of each Malaysia price as a small caption
   directly below it.

## Decisions (locked)

- **SG price source:** scrape `https://www.motorist.sg/petrol-prices` (static
  HTML table; no official free SG API exists).
- **SG price basis:** the **cheapest** retailer per grade, plus the retailer name.
- **Grade mapping:** MY RON95 ↔ SG 95, MY RON97 ↔ SG 98, diesel ↔ diesel
  (SG has no "97"; 98 is its nearest higher grade).
- **Layout:** keep the MY 3-card row (add an SGD caption under each price), then a
  separate "SG Petrol Prices" row of 3 cards below, column-aligned to the MY grades.

## Conversion math

The exchange rate (`exchangeData.rate`, from Frankfurter `from=SGD&to=MYR`) is
**MYR per 1 SGD** (e.g. 3.30). To convert a Malaysia price:

    SGD = MYR_price / rate

Guard: only render the caption when `rate > 0`.

## Components

### 1. `lib/sg-fuel.ts` (new — mirrors `lib/petrol.ts`)

- `SG_FUEL_URL = 'https://www.motorist.sg/petrol-prices'`
- `CACHE_KEY = 'petrol_prices_sg'` (reuses the existing `live_data` table)
- Motorist HTML shape (stable anchors): each grade is a `<tr>` whose first cell is
  the grade label (`95`, `98`, `Diesel`) and whose price cells carry the retailer
  in the class attribute, e.g. `<td class="shell">$3.37</td>`; a missing price is
  `-`. This is parseable with a dependency-free regex — **no new library**.
- Types:

  ```ts
  export interface SgGradePrice { price: number; retailer: string }
  export interface SgFuelPrices {
    grade95: SgGradePrice
    grade98: SgGradePrice
    diesel:  SgGradePrice
    source: string      // 'motorist.sg'
    updatedAt: string   // ISO fetch time (page has no timestamp)
  }
  ```

- `parseMotoristHtml(html: string): SgFuelPrices` — for each target grade, extract
  all `<td class="RETAILER">$PRICE|-</td>` cells, drop `-`, take the minimum price
  and its retailer. Throw if a target grade has no numeric price.
  - Retailer class → display label: esso→Esso, shell→Shell, spc→SPC,
    caltex→Caltex, sinopec→Sinopec.
  - Tie-break (multiple retailers at the min): first in fixed order
    [esso, shell, spc, caltex, sinopec] — deterministic.
- `fetchSgFuelPrices(): Promise<SgFuelPrices>` — fetch with a `User-Agent` header
  and `next: { revalidate: 86400 }`, then `parseMotoristHtml`.

### 2. `app/(dashboard)/page.tsx`

- Add `getSgFuelPrices(): Promise<SgFuelPrices | null>`:
  read the `petrol_prices_sg` cache; if absent, `fetchSgFuelPrices()` + upsert.
  **On any error, log and return `null`** — never throw. Rationale: scraping is
  fragile; an SG failure must degrade gracefully (hide the SG row), not 500 the
  whole dashboard (which the current `getPetrolPrices` would do).
- Add it to the existing `Promise.all`, and pass to the widget:
  `<PetrolWidget data={petrolData} sgData={sgFuelData} rate={exchangeData.rate} />`.

### 3. `components/PetrolWidget.tsx`

- New props: `sgData: SgFuelPrices | null`, `rate: number`.
- MY row: unchanged cards, **plus** an SGD caption under each price:
  `≈ S$${(data[key] / rate).toFixed(2)}` (only when `rate > 0`).
- New SG row (only when `sgData` is non-null): 3 cards aligned to the MY grade
  columns — 95→`grade95`, 97-column→`grade98`, diesel→`diesel` — each showing
  `S$X.XX` and a tiny cheapest-retailer label. Section header:
  `SG Petrol Prices · cheapest · motorist.sg`.
- If `sgData` is null: SG row omitted; MY row + captions still render.

### 4. `app/api/cron/refresh/route.ts`

- Add a third `try/catch` block (mirroring the petrol/exchange blocks) that calls
  `fetchSgFuelPrices()` and upserts `petrol_prices_sg`; record `results.sgFuel`.

### 5. Tests — `__tests__/lib/sg-fuel.test.ts` (TDD, written first)

- Cheapest-per-grade selection from a representative HTML fixture.
- `$` stripping and `-` (missing) cells ignored.
- Deterministic tie-break when retailers share the min.
- Missing grade (all `-`) → throws.

## Edge cases

- All retailers `-` for a target grade → `parseMotoristHtml` throws → caught in
  `getSgFuelPrices`/cron → SG row hidden.
- `rate` missing or ≤ 0 → SGD caption suppressed (MY price still shown).
- motorist.sg layout change → parser throws → graceful degradation, logged.

## Deliberately out of scope (YAGNI)

- Standalone `app/api/sg-fuel/route.ts` — SG prices are only shown on the
  dashboard (server-rendered). Add the route later if a client consumer needs it.
- Any change to MY prices, the exchange widget, or the conversion source.
