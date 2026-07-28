import { CANONICAL_UNITS, COUNT_UNITS, normalizeQuantityUnit } from './units'

/**
 * Entries with a date_observed older than this many days are excluded from
 * "current best price" ranking, but remain visible in a product's full price
 * history. Single source of truth — the SQL freshness filter in the query
 * layer (lib/products-query.ts, app/api/cart/prices/route.ts) must use this
 * same value.
 */
export const FRESHNESS_DAYS = 90

export type ProductUnitType = 'weight' | 'each' | 'volume'

/** A single price observation, already scoped to one product. */
export interface PriceRow {
  storeId: string
  storeName: string
  currency: 'SGD' | 'MYR'
  price: number | string
  pricePerUnit: number | string | null
  quantity: number | string
  unit: string
  dateObserved: string
  createdAt: string | Date
  submitterName: string | null
}

/** The winning price for one currency side, with everything the UI shows. */
export interface BestPrice {
  price: number
  pricePerUnit: number
  store: string
  dateObserved: string
  quantity: string
  unit: string
  submitterName: string | null
}

/**
 * Classifies a unit (canonical or legacy, e.g. 'kg') into the product-level
 * family it belongs to. Returns null for anything unrecognized, which callers
 * must treat as "exclude this row from ranking" rather than guessing.
 */
function unitFamily(unit: string): ProductUnitType | null {
  const normalized = normalizeQuantityUnit(1, unit)
  if (!normalized) return null
  if (normalized.unit === CANONICAL_UNITS.weight) return 'weight'
  if (normalized.unit === CANONICAL_UNITS.volume) return 'volume'
  if ((COUNT_UNITS as readonly string[]).includes(normalized.unit)) return 'each'
  return null
}

/** Keeps only the most recent entry per store: max date_observed, tiebreak max created_at. */
function latestPerStore(rows: PriceRow[]): PriceRow[] {
  const byStore = new Map<string, PriceRow>()
  for (const row of rows) {
    const current = byStore.get(row.storeId)
    if (!current) {
      byStore.set(row.storeId, row)
      continue
    }
    const rowDate = String(row.dateObserved)
    const curDate = String(current.dateObserved)
    if (rowDate > curDate) {
      byStore.set(row.storeId, row)
    } else if (rowDate === curDate && new Date(row.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      byStore.set(row.storeId, row)
    }
  }
  return Array.from(byStore.values())
}

/**
 * Effective per-unit price for ranking: trusts the stored price_per_unit when
 * present, otherwise falls back to price / (canonically normalized quantity)
 * so a legacy row stored in a non-canonical unit (e.g. 'kg') doesn't get
 * compared against canonical-unit rows using the wrong denominator.
 */
function effectivePerUnit(row: PriceRow): number | null {
  if (row.pricePerUnit != null) {
    const n = Number(row.pricePerUnit)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const normalized = normalizeQuantityUnit(Number(row.quantity), row.unit)
  if (!normalized || normalized.quantity <= 0) return null
  const price = Number(row.price)
  return price / normalized.quantity
}

function toBestPrice(row: PriceRow, pricePerUnit: number): BestPrice {
  return {
    price: Number(row.price),
    pricePerUnit,
    store: row.storeName,
    dateObserved: String(row.dateObserved),
    quantity: String(row.quantity),
    unit: row.unit,
    submitterName: row.submitterName,
  }
}

/** Cheapest per-unit price among rows already scoped to one currency, family-matched to productUnitType. */
function pickCheapest(rows: PriceRow[], productUnitType: ProductUnitType): BestPrice | null {
  let best: BestPrice | null = null
  for (const row of rows) {
    if (unitFamily(row.unit) !== productUnitType) continue
    const pricePerUnit = effectivePerUnit(row)
    if (pricePerUnit == null) continue
    if (best === null || pricePerUnit < best.pricePerUnit) {
      best = toBestPrice(row, pricePerUnit)
    }
  }
  return best
}

/**
 * Picks the "best price" per currency for one product: the lowest effective
 * per-unit price among each store's single most recent entry.
 *
 * Pure — takes rows already scoped to one product; the freshness window
 * (FRESHNESS_DAYS) must be applied by the caller in SQL before calling this.
 */
export function pickBestPrices(
  rows: PriceRow[],
  productUnitType: ProductUnitType,
): { sgd: BestPrice | null; myr: BestPrice | null } {
  const current = latestPerStore(rows)
  return {
    sgd: pickCheapest(current.filter((r) => r.currency === 'SGD'), productUnitType),
    myr: pickCheapest(current.filter((r) => r.currency === 'MYR'), productUnitType),
  }
}
