import { pickBestPrices, type PriceRow } from '@/lib/price-ranking'

function row(overrides: Partial<PriceRow> = {}): PriceRow {
  return {
    storeId: 'store-1',
    storeName: 'FairPrice',
    currency: 'SGD',
    price: 1,
    pricePerUnit: null,
    quantity: 1,
    unit: 'g',
    dateObserved: '2026-07-01',
    createdAt: '2026-07-01T00:00:00Z',
    submitterName: null,
    ...overrides,
  }
}

describe('pickBestPrices', () => {
  it('ranks by effective per-unit price, not raw price', () => {
    // $1.50 for 250g (0.006/g) should lose to $3.00 for 1kg=1000g (0.003/g)
    const rows: PriceRow[] = [
      row({ storeId: 's1', storeName: 'Small pack', price: 1.5, quantity: 250, unit: 'g' }),
      row({ storeId: 's2', storeName: 'Big pack', price: 3.0, quantity: 1000, unit: 'g' }),
    ]

    const { sgd } = pickBestPrices(rows, 'weight')

    expect(sgd?.store).toBe('Big pack')
    expect(sgd?.pricePerUnit).toBeCloseTo(0.003)
  })

  it('lets a newer entry at the same store supersede an older cheaper one', () => {
    const rows: PriceRow[] = [
      row({ storeId: 's1', price: 1, quantity: 100, unit: 'g', dateObserved: '2026-01-01' }),
      row({ storeId: 's1', price: 5, quantity: 100, unit: 'g', dateObserved: '2026-06-01' }),
    ]

    const { sgd } = pickBestPrices(rows, 'weight')

    expect(sgd?.price).toBe(5)
    expect(sgd?.dateObserved).toBe('2026-06-01')
  })

  it('tiebreaks same date_observed by created_at', () => {
    const rows: PriceRow[] = [
      row({
        storeId: 's1',
        price: 1,
        quantity: 100,
        unit: 'g',
        dateObserved: '2026-06-01',
        createdAt: '2026-06-01T08:00:00Z',
      }),
      row({
        storeId: 's1',
        price: 5,
        quantity: 100,
        unit: 'g',
        dateObserved: '2026-06-01',
        createdAt: '2026-06-01T09:00:00Z',
      }),
    ]

    const { sgd } = pickBestPrices(rows, 'weight')

    expect(sgd?.price).toBe(5)
  })

  it('picks the cheapest per-unit price across two stores, each at its own latest entry', () => {
    const rows: PriceRow[] = [
      row({ storeId: 's1', storeName: 'FairPrice', price: 1, quantity: 100, unit: 'g', dateObserved: '2026-01-01' }),
      row({ storeId: 's1', storeName: 'FairPrice', price: 3, quantity: 100, unit: 'g', dateObserved: '2026-06-01' }),
      row({ storeId: 's2', storeName: 'ColdStorage', price: 2, quantity: 100, unit: 'g', dateObserved: '2026-06-15' }),
    ]

    const { sgd } = pickBestPrices(rows, 'weight')

    // FairPrice's latest (2026-06-01, $3/100g) loses to ColdStorage ($2/100g)
    expect(sgd?.store).toBe('ColdStorage')
    expect(sgd?.price).toBe(2)
  })

  it('ranks SGD and MYR independently; an MY-only product returns myr with sgd null', () => {
    const rows: PriceRow[] = [
      row({ storeId: 's1', currency: 'MYR', storeName: 'AEON', price: 4, quantity: 200, unit: 'g' }),
    ]

    const { sgd, myr } = pickBestPrices(rows, 'weight')

    expect(sgd).toBeNull()
    expect(myr?.store).toBe('AEON')
    expect(myr?.quantity).toBe('200')
    expect(myr?.unit).toBe('g')
  })

  it('excludes a mismatched unit family — it never wins nor blocks the match', () => {
    const rows: PriceRow[] = [
      row({ storeId: 's1', storeName: 'Cheap-each', price: 0.01, quantity: 1, unit: 'each' }),
      row({ storeId: 's2', storeName: 'Real weight', price: 5, quantity: 500, unit: 'g' }),
    ]

    const { sgd } = pickBestPrices(rows, 'weight')

    expect(sgd?.store).toBe('Real weight')
  })

  it('returns null when every row is a mismatched unit family', () => {
    const rows: PriceRow[] = [
      row({ storeId: 's1', price: 0.01, quantity: 1, unit: 'each' }),
    ]

    const { sgd, myr } = pickBestPrices(rows, 'weight')

    expect(sgd).toBeNull()
    expect(myr).toBeNull()
  })

  it('falls back to price / quantity when price_per_unit is NULL', () => {
    const rows: PriceRow[] = [
      row({ storeId: 's1', price: 2, quantity: 500, unit: 'g', pricePerUnit: null }),
    ]

    const { sgd } = pickBestPrices(rows, 'weight')

    expect(sgd?.pricePerUnit).toBeCloseTo(0.004)
  })

  it('trusts a stored price_per_unit over recomputing from price/quantity', () => {
    const rows: PriceRow[] = [
      row({ storeId: 's1', price: 2, quantity: 500, unit: 'g', pricePerUnit: 0.01 }),
    ]

    const { sgd } = pickBestPrices(rows, 'weight')

    expect(sgd?.pricePerUnit).toBe(0.01)
  })

  it('returns both null for empty input', () => {
    const { sgd, myr } = pickBestPrices([], 'weight')

    expect(sgd).toBeNull()
    expect(myr).toBeNull()
  })

  it('matches count-unit families for "each" products', () => {
    const rows: PriceRow[] = [
      row({ storeId: 's1', storeName: 'Pack of 6', price: 6, quantity: 6, unit: 'pack', pricePerUnit: 1 }),
      row({ storeId: 's2', storeName: 'Wrong family', price: 1, quantity: 100, unit: 'g' }),
    ]

    const { sgd } = pickBestPrices(rows, 'each')

    expect(sgd?.store).toBe('Pack of 6')
  })

  it('ranks volume products in ml', () => {
    const rows: PriceRow[] = [
      row({ storeId: 's1', storeName: 'Small bottle', price: 2, quantity: 250, unit: 'ml' }),
      row({ storeId: 's2', storeName: 'Big bottle', price: 6, quantity: 1000, unit: 'ml' }),
    ]

    const { sgd } = pickBestPrices(rows, 'volume')

    // 2/250 = 0.008/ml vs 6/1000 = 0.006/ml
    expect(sgd?.store).toBe('Big bottle')
  })
})
