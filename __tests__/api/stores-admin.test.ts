/**
 * @jest-environment node
 */

var mockAuth: jest.Mock
var mockIsAdminUser: jest.Mock
var mockDb: {
  select: jest.Mock
  insert: jest.Mock
  update: jest.Mock
}

jest.mock('@/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}))

jest.mock('@/lib/admin', () => ({
  isAdminUser: (...args: unknown[]) => mockIsAdminUser(...args),
}))

jest.mock('@/lib/db', () => {
  mockDb = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  }
  return {
    db: mockDb,
    stores: {
      id: 'stores.id',
      name: 'stores.name',
      country: 'stores.country',
      city: 'stores.city',
      type: 'stores.type',
      url: 'stores.url',
    },
  }
})

jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions) => ({ and: conditions })),
  eq: jest.fn((left, right) => ({ left, right })),
  ilike: jest.fn((left, right) => ({ ilike: left, value: right })),
  ne: jest.fn((left, right) => ({ ne: left, value: right })),
  sql: jest.fn(() => ({})),
}))

import { POST as postStore } from '@/app/api/stores/route'
import { PATCH as patchStore } from '@/app/api/stores/[id]/route'

function jsonRequest(body: unknown, method = 'POST'): Request {
  return new Request('http://localhost/api/test', {
    method,
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

// db.insert(...).values(...).returning(...) resolves to `rows`. Returns the
// `values` mock so tests can assert on what was actually inserted.
function mockInsert(rows: unknown[]) {
  const valuesMock = jest.fn().mockReturnValue({
    returning: jest.fn().mockResolvedValue(rows),
  })
  mockDb.insert.mockReturnValue({ values: valuesMock })
  return valuesMock
}

// db.update(...).set(...).where(...).returning(...) resolves to `rows`.
function mockUpdate(rows: unknown[]) {
  mockDb.update.mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue(rows),
      }),
    }),
  })
}

describe('stores admin API', () => {
  beforeEach(() => {
    mockAuth = jest.fn()
    mockIsAdminUser = jest.fn()
    jest.clearAllMocks()
  })

  describe('POST /api/stores', () => {
    it('requires sign-in', async () => {
      mockAuth.mockResolvedValue(null)

      const res = await postStore(
        jsonRequest({ name: 'X', country: 'SG', type: 'supermarket' }) as any,
      )

      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'Sign in required' })
    })

    it('rejects a non-admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
      mockIsAdminUser.mockResolvedValue(false)

      const res = await postStore(
        jsonRequest({ name: 'X', country: 'SG', type: 'supermarket' }) as any,
      )

      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ error: 'Admin only' })
      expect(mockDb.insert).not.toHaveBeenCalled()
    })

    it('rejects an invalid country', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1' } })
      mockIsAdminUser.mockResolvedValue(true)

      const res = await postStore(
        jsonRequest({ name: 'X', country: 'US', type: 'supermarket' }) as any,
      )

      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/country/)
      expect(mockDb.insert).not.toHaveBeenCalled()
    })

    it('rejects a case-insensitive duplicate name', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1' } })
      mockIsAdminUser.mockResolvedValue(true)
      mockDb.select.mockReturnValueOnce(selectResult([{ id: 'store-1' }]))

      const res = await postStore(
        jsonRequest({ name: 'fairprice', country: 'SG', type: 'supermarket' }) as any,
      )

      expect(res.status).toBe(409)
      expect(await res.json()).toEqual({ error: 'A store with this name already exists' })
      expect(mockDb.insert).not.toHaveBeenCalled()
    })

    it('creates a store, trimming name and city', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1' } })
      mockIsAdminUser.mockResolvedValue(true)
      mockDb.select.mockReturnValueOnce(selectResult([]))
      const valuesMock = mockInsert([
        { id: 'store-1', name: 'FairPrice', country: 'SG', type: 'supermarket', city: 'Tampines', url: '' },
      ])

      const res = await postStore(
        jsonRequest({
          name: '  FairPrice  ',
          country: 'SG',
          type: 'supermarket',
          city: '  Tampines  ',
        }) as any,
      )

      expect(res.status).toBe(201)
      expect(await res.json()).toEqual({
        id: 'store-1',
        name: 'FairPrice',
        country: 'SG',
        type: 'supermarket',
        city: 'Tampines',
        url: '',
      })
      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'FairPrice', city: 'Tampines' }),
      )
    })
  })

  describe('PATCH /api/stores/[id]', () => {
    it('returns 404 for an unknown id — before any duplicate check', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1' } })
      mockIsAdminUser.mockResolvedValue(true)
      // Existence check finds nothing → 404, even though the new name would
      // collide with a real store (409 must not mask a missing resource).
      mockDb.select.mockReturnValueOnce(selectResult([]))

      const res = await patchStore(jsonRequest({ name: 'FairPrice' }, 'PATCH') as any, {
        params: { id: 'nope' },
      })

      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ error: 'Not found' })
      expect(mockDb.update).not.toHaveBeenCalled()
    })

    it('renames a store', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1' } })
      mockIsAdminUser.mockResolvedValue(true)
      mockDb.select
        .mockReturnValueOnce(selectResult([{ id: 'store-1' }])) // store exists
        .mockReturnValueOnce(selectResult([])) // no rename collision
      mockUpdate([
        { id: 'store-1', name: 'New Name', country: 'SG', type: 'supermarket', city: '', url: '' },
      ])

      const res = await patchStore(jsonRequest({ name: 'New Name' }, 'PATCH') as any, {
        params: { id: 'store-1' },
      })

      expect(res.status).toBe(200)
      expect((await res.json()).name).toBe('New Name')
    })

    it('rejects a rename that collides with another store', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1' } })
      mockIsAdminUser.mockResolvedValue(true)
      mockDb.select
        .mockReturnValueOnce(selectResult([{ id: 'store-1' }])) // store exists
        .mockReturnValueOnce(selectResult([{ id: 'store-2' }])) // collision
      mockUpdate([])

      const res = await patchStore(jsonRequest({ name: 'Sheng Siong' }, 'PATCH') as any, {
        params: { id: 'store-1' },
      })

      expect(res.status).toBe(409)
      expect(mockDb.update).not.toHaveBeenCalled()
    })
  })
})
