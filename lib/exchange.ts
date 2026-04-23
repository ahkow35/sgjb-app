const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=SGD&to=MYR'
const CACHE_KEY = 'exchange_rate_sgd_myr'

export interface ExchangeRateResponse {
  base: string
  date: string
  rates: Record<string, number>
}

export interface CachedRate {
  rate: number
  date: string
  updatedAt: string
}

export function parseExchangeRate(response: ExchangeRateResponse): number {
  const rate = response.rates['MYR']
  if (!rate) throw new Error('MYR rate not found')
  return rate
}

export async function fetchExchangeRate(): Promise<CachedRate> {
  const res = await fetch(FRANKFURTER_URL, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`)
  const data: ExchangeRateResponse = await res.json()
  return {
    rate: parseExchangeRate(data),
    date: data.date,
    updatedAt: new Date().toISOString(),
  }
}

export { CACHE_KEY }
