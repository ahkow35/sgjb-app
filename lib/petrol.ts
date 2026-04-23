const DATA_GOV_MY_URL =
  'https://api.data.gov.my/data-catalogue?id=fuelprice&limit=10&sort=-date'
export const CACHE_KEY = 'petrol_prices_jb'

export interface PetrolPrices {
  ron95: number
  ron97: number
  diesel: number
  date: string
  updatedAt: string
}

export interface PetrolEntry {
  date: string
  series_type: string
  price: number
}

export function parsePetrolResponse(data: PetrolEntry[]): PetrolPrices {
  if (!data || data.length === 0) throw new Error('No petrol data')

  const latest = data.reduce((a, b) => (a.date >= b.date ? a : b))
  const latestDate = latest.date
  const entries = data.filter((d) => d.date === latestDate)

  const get = (type: string) => {
    const entry = entries.find((e) => e.series_type === type)
    if (!entry) throw new Error(`Missing ${type} price`)
    return entry.price
  }

  return {
    ron95: get('ron95'),
    ron97: get('ron97'),
    diesel: get('diesel'),
    date: latestDate,
    updatedAt: new Date().toISOString(),
  }
}

export async function fetchPetrolPrices(): Promise<PetrolPrices> {
  const res = await fetch(DATA_GOV_MY_URL, { next: { revalidate: 86400 } })
  if (!res.ok) throw new Error(`data.gov.my error: ${res.status}`)
  const data: PetrolEntry[] = await res.json()
  return parsePetrolResponse(data)
}
