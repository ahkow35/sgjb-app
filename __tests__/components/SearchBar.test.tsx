import { render, screen, fireEvent, act } from '@testing-library/react'
import { SearchBar } from '@/components/SearchBar'

const push = jest.fn()
let params = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => params,
}))

describe('SearchBar', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    push.mockClear()
    params = new URLSearchParams()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('does not navigate immediately and keeps the typed value while debouncing', () => {
    render(<SearchBar />)
    const input = screen.getByRole('textbox', { name: 'Search products' }) as HTMLInputElement

    fireEvent.change(input, { target: { value: 'milo' } })

    // Input keeps focus/value immediately — no remount, no lost keystrokes.
    expect(input.value).toBe('milo')
    expect(push).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(300)
    })
    expect(push).not.toHaveBeenCalled()
  })

  it('navigates exactly once after the debounce pause', () => {
    render(<SearchBar />)
    const input = screen.getByRole('textbox', { name: 'Search products' }) as HTMLInputElement

    fireEvent.change(input, { target: { value: 'm' } })
    fireEvent.change(input, { target: { value: 'mi' } })
    fireEvent.change(input, { target: { value: 'milo' } })

    act(() => {
      jest.advanceTimersByTime(350)
    })

    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/products?q=milo')
    expect(input.value).toBe('milo')
  })

  it('never loses focus while typing (no remount)', () => {
    render(<SearchBar />)
    const input = screen.getByRole('textbox', { name: 'Search products' }) as HTMLInputElement
    input.focus()

    fireEvent.change(input, { target: { value: 'a' } })
    act(() => {
      jest.advanceTimersByTime(350)
    })
    fireEvent.change(input, { target: { value: 'ab' } })

    expect(document.activeElement).toBe(input)
  })
})
