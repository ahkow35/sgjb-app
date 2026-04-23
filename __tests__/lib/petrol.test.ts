import { parsePetrolResponse, type PetrolEntry } from '@/lib/petrol'

describe('parsePetrolResponse', () => {
  it('extracts latest petrol prices from data.gov.my response', () => {
    const mockData = [
      { date: '2026-04-21', series_type: 'ron95', price: 2.05 },
      { date: '2026-04-21', series_type: 'ron97', price: 3.28 },
      { date: '2026-04-21', series_type: 'diesel', price: 2.15 },
    ]
    const result = parsePetrolResponse(mockData)
    expect(result.ron95).toBe(2.05)
    expect(result.ron97).toBe(3.28)
    expect(result.diesel).toBe(2.15)
    expect(result.date).toBe('2026-04-21')
  })

  it('throws if response is empty', () => {
    expect(() => parsePetrolResponse([])).toThrow('No petrol data')
  })
})
