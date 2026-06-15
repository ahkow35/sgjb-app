import { ExchangeWidget } from '@/components/ExchangeWidget'
import { PetrolWidget } from '@/components/PetrolWidget'
import { db, liveData } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { fetchExchangeRate, CACHE_KEY as EX_KEY } from '@/lib/exchange'
import { fetchPetrolPrices, CACHE_KEY as PETROL_KEY } from '@/lib/petrol'
import type { CachedRate } from '@/lib/exchange'
import type { PetrolPrices } from '@/lib/petrol'

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

export default async function DashboardPage() {
  const [exchangeData, petrolData] = await Promise.all([
    getExchangeRate(),
    getPetrolPrices(),
  ])

  return (
    <div className="pb-4">
      <ExchangeWidget initialData={exchangeData} />
      <PetrolWidget data={petrolData} />
    </div>
  )
}
