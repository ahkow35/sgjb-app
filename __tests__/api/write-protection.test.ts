/**
 * @jest-environment node
 */

var mockAuth: jest.Mock
var mockDb: {
  select: jest.Mock
  delete: jest.Mock
}

jest.mock('@/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}))

jest.mock('@/lib/db', () => {
  mockDb = {
    select: jest.fn(),
    delete: jest.fn(),
  }
  return {
    db: mockDb,
    products: {
      id: 'products.id',
      name: 'products.name',
      brand: 'products.brand',
      category: 'products.category',
      imageUrl: 'products.imageUrl',
      unitType: 'products.unitType',
      barcode: 'products.barcode',
    },
    priceEntries: {
      id: 'price_entries.id',
      submittedBy: 'price_entries.submitted_by',
    },
  }
})

jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions) => ({ and: conditions })),
  eq: jest.fn((left, right) => ({ left, right })),
  sql: jest.fn(() => ({})),
}))

import { POST as postProduct } from '@/app/api/products/route'
import { POST as postPriceEntry } from '@/app/api/price-entries/route'
import {
  DELETE as deletePriceEntry,
  PATCH as patchPriceEntry,
} from '@/app/api/price-entries/[id]/route'

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockSelectEntry(submittedBy: string | null) {
  mockDb.select.mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([{ submittedBy }]),
      }),
    }),
  })
}

function mockDeleteEntry() {
  mockDb.delete.mockReturnValue({
    where: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([{ id: 'entry-1' }]),
    }),
  })
}

describe('write protection', () => {
  beforeEach(() => {
    mockAuth = jest.fn()
    jest.clearAllMocks()
  })

  it('requires sign-in to create products', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await postProduct(jsonRequest({ name: 'Milo', unit_type: 'each' }) as any)

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Sign in required' })
  })

  it('requires sign-in to create price entries', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await postPriceEntry(jsonRequest({}) as any)

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Sign in required' })
  })

  it('rejects price entry edits because observations are immutable', async () => {
    const res = await patchPriceEntry()

    expect(res.status).toBe(405)
    expect(await res.json()).toEqual({
      error: 'Price entries are immutable. Add a new observation instead.',
    })
  })

  it('requires sign-in to delete price entries', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await deletePriceEntry(new Request('http://localhost/api/test') as any, {
      params: { id: 'entry-1' },
    })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Sign in required' })
  })

  it('rejects deleting another user price entry', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockSelectEntry('user-2')

    const res = await deletePriceEntry(new Request('http://localhost/api/test') as any, {
      params: { id: 'entry-1' },
    })

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'You can only delete your own price entries' })
    expect(mockDb.delete).not.toHaveBeenCalled()
  })

  it('allows deleting your own price entry', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockSelectEntry('user-1')
    mockDeleteEntry()

    const res = await deletePriceEntry(new Request('http://localhost/api/test') as any, {
      params: { id: 'entry-1' },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })
})
