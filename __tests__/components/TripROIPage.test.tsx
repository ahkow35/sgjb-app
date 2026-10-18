import { render, screen, waitFor } from '@testing-library/react'
import TripROIPage from '@/app/trip-roi/page'

let params = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useSearchParams: () => params,
}))

// Different RON95 and RON97 prices so the test shows which one the page uses.
const PETROL = { ron95: 2.05, ron97: 5.05, diesel: 2.15 }

describe('Trip ROI page (drive option)', () => {
  beforeEach(() => {
    // Fixed rate of 1 via the URL param, so MYR and SGD amounts are equal.
    params = new URLSearchParams('rate=1')
    global.fetch = jest.fn((url: string) =>
      Promise.resolve({
        json: () => Promise.resolve(url === '/api/petrol' ? PETROL : {}),
      }),
    ) as unknown as typeof fetch
  })

  it('prices the drive on RON97, the grade a Singapore car must buy', async () => {
    render(<TripROIPage />)

    expect(screen.getByText('RON97 price (RM/L)')).toBeTruthy()
    expect(screen.getByText(/must use RON97 in Malaysia/)).toBeTruthy()

    // Default route: 3 km each way, 10 L/100km => 0.6 L. Toll S$1.40 x 2 = 2.80.
    // RON97: 0.6 x 5.05 + 2.80 = 5.83. (RON95 would give 4.03.)
    await waitFor(() => expect(screen.getByText('−S$5.83')).toBeTruthy())
  })

  it('ignores an old ?ron95= link and fetches the RON97 price', async () => {
    params = new URLSearchParams('rate=1&ron95=3.87')
    render(<TripROIPage />)

    await waitFor(() => expect(screen.getByText('−S$5.83')).toBeTruthy())
    expect(global.fetch).toHaveBeenCalledWith('/api/petrol')
  })

  it('uses the ron97 URL param without fetching', () => {
    params = new URLSearchParams('rate=1&ron97=6')
    render(<TripROIPage />)

    // 0.6 x 6 + 2.80 = 6.40
    expect(screen.getByText('−S$6.40')).toBeTruthy()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
