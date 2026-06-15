import { render, screen } from '@testing-library/react'
import { PriceHistoryDropdown } from '@/components/PriceHistoryDropdown'

// Mock CurrencyContext
jest.mock('@/contexts/CurrencyContext', () => ({
  useCurrency: () => ({ currency: 'SGD', rate: 3.5 }),
}))

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
}))

describe('PriceHistoryDropdown', () => {
  it('renders toggle button', () => {
    render(<PriceHistoryDropdown productId="test-id" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows entry count when initialEntries provided', () => {
    const entries = [
      {
        id: '1',
        price: 5.5,
        currency: 'SGD' as const,
        quantity: 1,
        unit: 'each',
        price_per_unit: 5.5,
        date_observed: '2026-04-01',
        stores: { id: 's1', name: 'FairPrice', country: 'SG', city: 'Singapore', type: 'supermarket' },
      },
    ]
    render(<PriceHistoryDropdown productId="test-id" initialEntries={entries} />)
    expect(screen.getByText('1 price entry')).toBeInTheDocument()
  })
})
