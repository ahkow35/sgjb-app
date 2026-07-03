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
    users: {
      id: 'users.id',
      isAdmin: 'users.is_admin',
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
import { DELETE as deleteProduct } from '@/app/api/products/[id]/route'

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// Each db.select(...).from(...).where(...).limit(...) resolves to `rows`.
function selectResult(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(rows),
      }),
    }),
  }
}

// db.delete(...).where(...).returning(...) resolves to `rows`.
function mockDelete(rows: unknown[] = [{ id: 'row-1' }]) {
  mockDb.delete.mockReturnValue({
    where: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue(rows),
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

  it('rejects a non-admin deleting another user price entry', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockDb.select
      .mockReturnValueOnce(selectResult([{ submittedBy: 'user-2' }])) // entry lookup
      .mockReturnValueOnce(selectResult([{ isAdmin: false }])) // admin check

    const res = await deletePriceEntry(new Request('http://localhost/api/test') as any, {
      params: { id: 'entry-1' },
    })

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'You can only delete your own price entries' })
    expect(mockDb.delete).not.toHaveBeenCalled()
  })

  it('allows deleting your own price entry', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockDb.select.mockReturnValueOnce(selectResult([{ submittedBy: 'user-1' }]))
    mockDelete()

    const res = await deletePriceEntry(new Request('http://localhost/api/test') as any, {
      params: { id: 'entry-1' },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    // Owner path short-circuits — no admin lookup needed.
    expect(mockDb.select).toHaveBeenCalledTimes(1)
  })

  it('allows an admin to delete another user price entry (incl. scraper entries)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1' } })
    mockDb.select
      .mockReturnValueOnce(selectResult([{ submittedBy: null }])) // scraper entry, no owner
      .mockReturnValueOnce(selectResult([{ isAdmin: true }])) // admin check
    mockDelete()

    const res = await deletePriceEntry(new Request('http://localhost/api/test') as any, {
      params: { id: 'entry-1' },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(mockDb.delete).toHaveBeenCalled()
  })

  it('requires sign-in to delete a product', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await deleteProduct(new Request('http://localhost/api/test') as any, {
      params: { id: 'prod-1' },
    })

    expect(res.status).toBe(401)
    expect(mockDb.delete).not.toHaveBeenCalled()
  })

  it('rejects a non-admin deleting a product', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockDb.select.mockReturnValueOnce(selectResult([{ isAdmin: false }]))

    const res = await deleteProduct(new Request('http://localhost/api/test') as any, {
      params: { id: 'prod-1' },
    })

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Admin only' })
    expect(mockDb.delete).not.toHaveBeenCalled()
  })

  it('allows an admin to delete a product', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1' } })
    mockDb.select.mockReturnValueOnce(selectResult([{ isAdmin: true }]))
    mockDelete([{ id: 'prod-1' }])

    const res = await deleteProduct(new Request('http://localhost/api/test') as any, {
      params: { id: 'prod-1' },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(mockDb.delete).toHaveBeenCalled()
  })
})
