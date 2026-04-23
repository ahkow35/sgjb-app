import { buildProductSearchQuery } from '@/app/api/products/utils'

describe('buildProductSearchQuery', () => {
  it('returns a tsquery for multi-word input', () => {
    expect(buildProductSearchQuery('nestle milo')).toBe('nestle & milo')
  })

  it('handles single word', () => {
    expect(buildProductSearchQuery('milo')).toBe('milo')
  })

  it('strips special characters', () => {
    expect(buildProductSearchQuery("milo's")).toBe('milos')
  })
})
