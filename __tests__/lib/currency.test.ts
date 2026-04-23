import { formatSGD, formatMYR, convert } from '@/lib/currency'

describe('formatSGD', () => {
  it('formats a number as SGD', () => {
    expect(formatSGD(3.5)).toBe('S$3.50')
    expect(formatSGD(100)).toBe('S$100.00')
  })
})

describe('formatMYR', () => {
  it('formats a number as MYR', () => {
    expect(formatMYR(10.5)).toBe('RM10.50')
  })
})

describe('convert', () => {
  it('converts SGD to MYR', () => {
    expect(convert(10, 'SGD', 'MYR', 3.5)).toBeCloseTo(35, 1)
  })

  it('converts MYR to SGD', () => {
    expect(convert(35, 'MYR', 'SGD', 3.5)).toBeCloseTo(10, 1)
  })

  it('returns same amount when from === to', () => {
    expect(convert(10, 'SGD', 'SGD', 3.5)).toBe(10)
  })
})
