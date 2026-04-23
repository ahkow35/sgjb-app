import { parsePetrolResponse } from '@/lib/petrol'

describe('parsePetrolResponse', () => {
  it('extracts latest level prices from data.gov.my response', () => {
    const mockData = [
      { date: '2026-04-23', series_type: 'change_weekly', ron95: -0.15, ron97: -0.25, diesel: -0.85 },
      { date: '2026-04-23', series_type: 'level', ron95: 3.87, ron97: 4.85, diesel: 5.12 },
      { date: '2026-04-16', series_type: 'level', ron95: 4.02, ron97: 5.10, diesel: 5.97 },
    ]
    const result = parsePetrolResponse(mockData)
    expect(result.ron95).toBe(3.87)
    expect(result.ron97).toBe(4.85)
    expect(result.diesel).toBe(5.12)
    expect(result.date).toBe('2026-04-23')
  })

  it('throws if response is empty', () => {
    expect(() => parsePetrolResponse([])).toThrow('No petrol data')
  })

  it('throws if no level entries exist', () => {
    const mockData = [
      { date: '2026-04-23', series_type: 'change_weekly', ron95: -0.15, ron97: -0.25, diesel: -0.85 },
    ]
    expect(() => parsePetrolResponse(mockData)).toThrow('No petrol level data')
  })
})
