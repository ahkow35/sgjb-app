import { parseExchangeRate } from '@/lib/exchange'

describe('parseExchangeRate', () => {
  it('extracts MYR rate from frankfurter response', () => {
    const mockResponse = {
      base: 'SGD',
      date: '2026-04-24',
      rates: { MYR: 3.4821 },
    }
    expect(parseExchangeRate(mockResponse)).toBeCloseTo(3.4821, 4)
  })

  it('throws if MYR rate is missing', () => {
    expect(() => parseExchangeRate({ base: 'SGD', date: '2026-04-24', rates: {} }))
      .toThrow('MYR rate not found')
  })
})
