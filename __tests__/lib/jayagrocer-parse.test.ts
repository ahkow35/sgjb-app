import { parseTitleUnit } from '../../scripts/scraper/jayagrocer'

describe('parseTitleUnit (Jaya Grocer titles)', () => {
  it('reads a trailing weight', () => {
    expect(parseTitleUnit('Winter Dates Fresh (China) 250g')).toEqual({ quantity: 250, unit: 'g' })
  })

  it('reads a trailing volume with L', () => {
    expect(parseTitleUnit('Farm Fresh UHT Milk 1L')).toEqual({ quantity: 1, unit: 'l' })
  })

  it('handles multipacks', () => {
    expect(parseTitleUnit('Farm Fresh UHT Milk 6 x 200ml')).toEqual({ quantity: 1200, unit: 'ml' })
  })

  it('takes the LAST size token when several appear', () => {
    // "600mg" style claims earlier in a name must not win over the pack size.
    expect(parseTitleUnit('Vitamin C 100 Tablets Bottle 90g')).toEqual({ quantity: 90, unit: 'g' })
  })

  it('maps piece-style units to canonical count units', () => {
    expect(parseTitleUnit('Envy Apple (New Zealand) 2pcs')).toEqual({ quantity: 2, unit: 'pcs' })
  })

  it('falls back to 1 each when no size is present', () => {
    expect(parseTitleUnit('Fresh Coconut')).toEqual({ quantity: 1, unit: 'each' })
  })
})
