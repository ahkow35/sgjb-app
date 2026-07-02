import { ExchangeWidget } from '@/components/ExchangeWidget'
import { PetrolWidget } from '@/components/PetrolWidget'
import { db, liveData } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { fetchExchangeRate, CACHE_KEY as EX_KEY } from '@/lib/exchange'
import { fetchPetrolPrices, CACHE_KEY as PETROL_KEY } from '@/lib/petrol'
import { fetchSgFuelPrices, CACHE_KEY as SG_KEY } from '@/lib/sg-fuel'
import type { CachedRate } from '@/lib/exchange'
import type { PetrolPrices } from '@/lib/petrol'
import type { SgFuelPrices } from '@/lib/sg-fuel'

export const dynamic = 'force-dynamic'

async function getExchangeRate(): Promise<CachedRate> {
  const [row] = await db.select().from(liveData).where(eq(liveData.key, EX_KEY)).limit(1)
  if (row?.value) return row.value as CachedRate
  const fresh = await fetchExchangeRate()
  await db.insert(liveData)
    .values({ key: EX_KEY, value: fresh, updatedAt: new Date() })
    .onConflictDoUpdate({ target: liveData.key, set: { value: fresh, updatedAt: new Date() } })
  return fresh
}

async function getPetrolPrices(): Promise<PetrolPrices> {
  const [row] = await db.select().from(liveData).where(eq(liveData.key, PETROL_KEY)).limit(1)
  if (row?.value) return row.value as PetrolPrices
  const fresh = await fetchPetrolPrices()
  await db.insert(liveData)
    .values({ key: PETROL_KEY, value: fresh, updatedAt: new Date() })
    .onConflictDoUpdate({ target: liveData.key, set: { value: fresh, updatedAt: new Date() } })
  return fresh
}

// Scraping motorist.sg is more fragile than the MY gov API, so a failure here
// must degrade gracefully (hide the SG row) rather than break the dashboard.
async function getSgFuelPrices(): Promise<SgFuelPrices | null> {
  try {
    const [row] = await db.select().from(liveData).where(eq(liveData.key, SG_KEY)).limit(1)
    if (row?.value) return row.value as SgFuelPrices
    const fresh = await fetchSgFuelPrices()
    await db.insert(liveData)
      .values({ key: SG_KEY, value: fresh, updatedAt: new Date() })
      .onConflictDoUpdate({ target: liveData.key, set: { value: fresh, updatedAt: new Date() } })
    return fresh
  } catch (e) {
    console.error('[dashboard] SG fuel prices unavailable:', e)
    return null
  }
}

export default async function DashboardPage() {
  const [exchangeData, petrolData, sgFuelData] = await Promise.all([
    getExchangeRate(),
    getPetrolPrices(),
    getSgFuelPrices(),
  ])

  return (
    <div className="pb-4">
      <ExchangeWidget initialData={exchangeData} />
      <PetrolWidget data={petrolData} sgData={sgFuelData} rate={exchangeData.rate} />
    </div>
  )
}
