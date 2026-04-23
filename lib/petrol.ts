// Trailing slash required — API returns 301 without it
const DATA_GOV_MY_URL =
  'https://api.data.gov.my/data-catalogue/?id=fuelprice&limit=10&sort=-date'
export const CACHE_KEY = 'petrol_prices_jb'

export interface PetrolPrices {
  ron95: number
  ron97: number
  diesel: number
  date: string
  updatedAt: string
}

// New API format: each row contains all fuel prices, series_type is 'level' or 'change_weekly'
export interface PetrolEntry {
  date: string
  series_type: string
  ron95: number
  ron97: number
  diesel: number
}

export function parsePetrolResponse(data: PetrolEntry[]): PetrolPrices {
  if (!data || data.length === 0) throw new Error('No petrol data')

  // Find the most recent 'level' entry (actual prices, not weekly change)
  const levelEntries = data.filter((d) => d.series_type === 'level')
  if (levelEntries.length === 0) throw new Error('No petrol level data')

  const latest = levelEntries.reduce((a, b) => (a.date >= b.date ? a : b))

  if (latest.ron95 == null) throw new Error('Missing ron95 price')
  if (latest.ron97 == null) throw new Error('Missing ron97 price')
  if (latest.diesel == null) throw new Error('Missing diesel price')

  return {
    ron95: latest.ron95,
    ron97: latest.ron97,
    diesel: latest.diesel,
    date: latest.date,
    updatedAt: new Date().toISOString(),
  }
}

export async function fetchPetrolPrices(): Promise<PetrolPrices> {
  const res = await fetch(DATA_GOV_MY_URL, { next: { revalidate: 86400 } })
  if (!res.ok) throw new Error(`data.gov.my error: ${res.status}`)
  const data: PetrolEntry[] = await res.json()
  return parsePetrolResponse(data)
}
