import { normalizeQuantityUnit, formatQuantityUnit, ALLOWED_UNITS, CANONICAL_UNITS } from '@/lib/units'

describe('normalizeQuantityUnit', () => {
  it('normalizes 1 kg and 1000 g identically', () => {
    expect(normalizeQuantityUnit(1, 'kg')).toEqual({ quantity: 1000, unit: 'g' })
    expect(normalizeQuantityUnit(1000, 'g')).toEqual({ quantity: 1000, unit: 'g' })
  })

  it('normalizes 1.5 L to 1500 ml', () => {
    expect(normalizeQuantityUnit(1.5, 'L')).toEqual({ quantity: 1500, unit: 'ml' })
  })

  it('converts mg to g', () => {
    expect(normalizeQuantityUnit(500, 'mg')).toEqual({ quantity: 0.5, unit: 'g' })
  })

  it('converts cl to ml', () => {
    expect(normalizeQuantityUnit(5, 'cl')).toEqual({ quantity: 50, unit: 'ml' })
  })

  it('is case-insensitive', () => {
    expect(normalizeQuantityUnit(1, 'KG')).toEqual({ quantity: 1000, unit: 'g' })
    expect(normalizeQuantityUnit(1, 'L')).toEqual({ quantity: 1000, unit: 'ml' })
    expect(normalizeQuantityUnit(1, 'l')).toEqual({ quantity: 1000, unit: 'ml' })
  })

  it('passes count units through unchanged', () => {
    expect(normalizeQuantityUnit(6, 'pack')).toEqual({ quantity: 6, unit: 'pack' })
    expect(normalizeQuantityUnit(1, 'each')).toEqual({ quantity: 1, unit: 'each' })
  })

  it('returns null for a unit not in the allowlist', () => {
    expect(normalizeQuantityUnit(1, 'lb')).toBeNull()
    expect(normalizeQuantityUnit(1, 'bogus')).toBeNull()
  })
})

describe('formatQuantityUnit', () => {
  it('renders large gram quantities as kg, trimming trailing zeros', () => {
    expect(formatQuantityUnit(1500, 'g')).toBe('1.5 kg')
    expect(formatQuantityUnit(2000, 'g')).toBe('2 kg')
  })

  it('renders sub-1000 gram quantities as g', () => {
    expect(formatQuantityUnit(425, 'g')).toBe('425 g')
  })

  it('renders large ml quantities as L', () => {
    expect(formatQuantityUnit(1500, 'ml')).toBe('1.5 L')
  })

  it('renders sub-1000 ml quantities as ml', () => {
    expect(formatQuantityUnit(250, 'ml')).toBe('250 ml')
  })

  it('renders count units as-is', () => {
    expect(formatQuantityUnit(6, 'pack')).toBe('6 pack')
    expect(formatQuantityUnit(1, 'each')).toBe('1 each')
  })

  it('accepts string quantities (as stored numeric columns come back)', () => {
    expect(formatQuantityUnit('1500', 'g')).toBe('1.5 kg')
  })
})

describe('constants', () => {
  it('exposes the canonical unit for each dimension', () => {
    expect(CANONICAL_UNITS.weight).toBe('g')
    expect(CANONICAL_UNITS.volume).toBe('ml')
  })

  it('exposes the input allowlist', () => {
    expect(ALLOWED_UNITS).toEqual(
      expect.arrayContaining(['g', 'kg', 'mg', 'ml', 'L', 'l', 'cl', 'each', 'pack', 'pcs', 'tablet', 'capsule', 'sachet']),
    )
  })
})
