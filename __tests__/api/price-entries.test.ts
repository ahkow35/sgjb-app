/**
 * @jest-environment node
 */

var mockAuth: jest.Mock
var mockDb: {
  select: jest.Mock
  insert: jest.Mock
  update: jest.Mock
}

jest.mock('@/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}))

jest.mock('@/lib/db', () => {
  mockDb = { select: jest.fn(), insert: jest.fn(), update: jest.fn() }
  return {
    db: mockDb,
    priceEntries: { id: 'price_entries.id' },
    stores: { id: 'stores.id', country: 'stores.country' },
    users: { id: 'users.id', submissionCount: 'users.submission_count' },
  }
})

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((left, right) => ({ left, right })),
  sql: jest.fn(() => ({})),
}))

import { POST } from '@/app/api/price-entries/route'

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/price-entries', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// db.select(...).from(...).where(...).limit(...) resolves to `rows`.
function mockStoreLookup(rows: unknown[]) {
  mockDb.select.mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(rows),
      }),
    }),
  })
}

// db.insert(...).values(...).onConflictDoUpdate(...).returning() resolves to `rows`.
function mockInsert(rows: unknown[]) {
  mockDb.insert.mockReturnValue({
    values: jest.fn().mockReturnValue({
      onConflictDoUpdate: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue(rows),
      }),
    }),
  })
}

function mockUpdate() {
  mockDb.update.mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    }),
  })
}

const baseBody = {
  product_id: 'prod-1',
  store_id: 'store-1',
  price: 10,
  date_observed: '2026-07-27',
}

describe('POST /api/price-entries — unit normalization', () => {
  beforeEach(() => {
    mockAuth = jest.fn().mockResolvedValue({ user: { id: 'user-1' } })
    jest.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockStoreLookup([{ country: 'SG' }])
    mockUpdate()
  })

  it('rejects a unit not in the allowlist', async () => {
    const res = await POST(jsonRequest({ ...baseBody, quantity: 1, unit: 'bogus' }) as any)

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/unit must be one of/)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it('normalizes 1 kg to 1000 g before storing', async () => {
    mockInsert([{ id: 'entry-1', inserted: true }])

    const res = await POST(jsonRequest({ ...baseBody, quantity: 1, unit: 'kg' }) as any)

    expect(res.status).toBe(201)
    const insertCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0]
    expect(insertCall.quantity).toBe('1000.000')
    expect(insertCall.unit).toBe('g')
    // price_per_unit computed against the normalized (canonical) quantity.
    expect(insertCall.pricePerUnit).toBe((10 / 1000).toFixed(4))
    // New observation → submission count incremented.
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('treats a same-day resubmission as an update, not a duplicate', async () => {
    // inserted: false ⇒ the observation key matched an existing row (xmax ≠ 0).
    mockInsert([{ id: 'entry-1', inserted: false }])

    const res = await POST(jsonRequest({ ...baseBody, quantity: 1, unit: 'kg' }) as any)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.updated).toBe(true)
    const valuesChain = mockDb.insert.mock.results[0].value.values.mock.results[0].value
    expect(valuesChain.onConflictDoUpdate).toHaveBeenCalled()
    // Updates must not inflate the user's submission count.
    expect(mockDb.update).not.toHaveBeenCalled()
  })
})
