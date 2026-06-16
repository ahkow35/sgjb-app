/**
 * @jest-environment node
 */

var mockDb: {
  select: jest.Mock
  insert: jest.Mock
}

jest.mock('@/lib/db', () => {
  mockDb = { select: jest.fn(), insert: jest.fn() }
  return {
    db: mockDb,
    users: {
      id: 'users.id',
      phoneNumber: 'users.phone_number',
      passwordHash: 'users.password_hash',
      displayName: 'users.display_name',
    },
    loginAttempts: { phoneNumber: 'login_attempts.phone_number' },
  }
})

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((left, right) => ({ left, right })),
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-pin'),
}))

import { POST as signup } from '@/app/api/auth/signup/route'
import { lockDurationMs, MAX_FAILURES } from '@/lib/login-attempts'

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Mock the phone-uniqueness lookup to return [] (free) or a row (taken). */
function mockExistingLookup(taken: boolean) {
  mockDb.select.mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(taken ? [{ id: 'u1' }] : []),
      }),
    }),
  })
}

function mockInsert() {
  mockDb.insert.mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([{ id: 'new-user', phoneNumber: '+6591234567' }]),
    }),
  })
}

describe('signup — phone + PIN', () => {
  beforeEach(() => jest.clearAllMocks())

  it('rejects an invalid country', async () => {
    const res = await signup(jsonRequest({ country: 'US', phone: '91234567', pin: '123456' }) as any)
    expect(res.status).toBe(400)
  })

  it('rejects missing phone or pin', async () => {
    const res = await signup(jsonRequest({ country: 'SG' }) as any)
    expect(res.status).toBe(400)
  })

  it('rejects an invalid mobile number', async () => {
    const res = await signup(jsonRequest({ country: 'SG', phone: '12345', pin: '123456' }) as any)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/valid mobile/i)
  })

  it('rejects a PIN that is not 6 digits', async () => {
    const res = await signup(jsonRequest({ country: 'SG', phone: '91234567', pin: '12345' }) as any)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/6 digits/i)
  })

  it('rejects an already-registered number', async () => {
    mockExistingLookup(true)
    const res = await signup(jsonRequest({ country: 'SG', phone: '91234567', pin: '123456' }) as any)
    expect(res.status).toBe(409)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it('creates a user for a valid, free number', async () => {
    mockExistingLookup(false)
    mockInsert()
    const res = await signup(
      jsonRequest({ country: 'SG', phone: '9123 4567', pin: '123456', display_name: 'Nyan' }) as any,
    )
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: 'new-user', phone_number: '+6591234567' })
  })
})

describe('lockout policy (lockDurationMs)', () => {
  it('does not lock below the threshold', () => {
    expect(lockDurationMs(0)).toBe(0)
    expect(lockDurationMs(MAX_FAILURES - 1)).toBe(0)
  })

  it('locks for 1 minute at the threshold and doubles thereafter', () => {
    expect(lockDurationMs(MAX_FAILURES)).toBe(60_000)
    expect(lockDurationMs(MAX_FAILURES + 1)).toBe(120_000)
    expect(lockDurationMs(MAX_FAILURES + 2)).toBe(240_000)
  })

  it('caps the lock at 1 hour', () => {
    expect(lockDurationMs(MAX_FAILURES + 100)).toBe(60 * 60_000)
  })
})
