import { normalizeToE164, isValidPin } from '@/lib/phone'

describe('normalizeToE164 — Singapore', () => {
  it('normalises a plain 8-digit mobile', () => {
    expect(normalizeToE164('SG', '91234567')).toBe('+6591234567')
    expect(normalizeToE164('SG', '81234567')).toBe('+6581234567')
  })

  it('accepts spaces and dashes', () => {
    expect(normalizeToE164('SG', '9123 4567')).toBe('+6591234567')
    expect(normalizeToE164('SG', '9123-4567')).toBe('+6591234567')
  })

  it('accepts an already-prefixed number', () => {
    expect(normalizeToE164('SG', '+65 9123 4567')).toBe('+6591234567')
    expect(normalizeToE164('SG', '6591234567')).toBe('+6591234567')
  })

  it('rejects wrong length or wrong leading digit', () => {
    expect(normalizeToE164('SG', '1234567')).toBeNull() // 7 digits
    expect(normalizeToE164('SG', '912345678')).toBeNull() // 9 digits
    expect(normalizeToE164('SG', '71234567')).toBeNull() // starts with 7
  })
})

describe('normalizeToE164 — Malaysia', () => {
  it('normalises a local number with trunk 0', () => {
    expect(normalizeToE164('MY', '0123456789')).toBe('+60123456789')
    expect(normalizeToE164('MY', '012-345 6789')).toBe('+60123456789')
  })

  it('normalises an 11-digit local number (e.g. 011x)', () => {
    expect(normalizeToE164('MY', '01123456789')).toBe('+601123456789')
  })

  it('accepts an already-prefixed number', () => {
    expect(normalizeToE164('MY', '+60123456789')).toBe('+60123456789')
    expect(normalizeToE164('MY', '60123456789')).toBe('+60123456789')
  })

  it('rejects numbers that are too short or not a mobile', () => {
    expect(normalizeToE164('MY', '0234567')).toBeNull() // not starting 1 after trunk
    expect(normalizeToE164('MY', '1')).toBeNull()
  })
})

describe('normalizeToE164 — guards', () => {
  it('returns null for empty input', () => {
    expect(normalizeToE164('SG', '')).toBeNull()
    expect(normalizeToE164('MY', '   ')).toBeNull()
  })

  it('returns null for non-numeric junk', () => {
    expect(normalizeToE164('SG', 'abcd')).toBeNull()
  })
})

describe('isValidPin', () => {
  it('accepts exactly 6 digits', () => {
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('000000')).toBe(true)
  })

  it('rejects wrong length or non-numeric', () => {
    expect(isValidPin('12345')).toBe(false)
    expect(isValidPin('1234567')).toBe(false)
    expect(isValidPin('12 456')).toBe(false)
    expect(isValidPin('abcdef')).toBe(false)
    expect(isValidPin('')).toBe(false)
  })
})
