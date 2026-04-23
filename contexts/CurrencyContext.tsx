'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Currency } from '@/lib/currency'

interface CurrencyContextValue {
  currency: Currency
  toggle: () => void
  rate: number
  setRate: (r: number) => void
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'SGD',
  toggle: () => {},
  rate: 3.5,
  setRate: () => {},
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('SGD')
  const [rate, setRate] = useState(3.5)

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        toggle: () => setCurrency((c) => (c === 'SGD' ? 'MYR' : 'SGD')),
        rate,
        setRate,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
