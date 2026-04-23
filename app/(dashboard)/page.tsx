import { ExchangeWidget } from '@/components/ExchangeWidget'
import { PetrolWidget } from '@/components/PetrolWidget'
import { createClient } from '@supabase/supabase-js'
import { fetchExchangeRate, CACHE_KEY as EX_KEY } from '@/lib/exchange'
import { fetchPetrolPrices, CACHE_KEY as PETROL_KEY } from '@/lib/petrol'
import type { CachedRate } from '@/lib/exchange'
import type { PetrolPrices } from '@/lib/petrol'

async function getExchangeRate(): Promise<CachedRate> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: cached } = await supabase
    .from('live_data')
    .select('value')
    .eq('key', EX_KEY)
    .single()

  if (cached?.value) return cached.value as CachedRate

  const fresh = await fetchExchangeRate()
  await supabase.from('live_data').upsert({
    key: EX_KEY, value: fresh, updated_at: new Date().toISOString()
  })
  return fresh
}

async function getPetrolPrices(): Promise<PetrolPrices> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: cached } = await supabase
    .from('live_data')
    .select('value')
    .eq('key', PETROL_KEY)
    .single()

  if (cached?.value) return cached.value as PetrolPrices

  const fresh = await fetchPetrolPrices()
  await supabase.from('live_data').upsert({
    key: PETROL_KEY, value: fresh, updated_at: new Date().toISOString()
  })
  return fresh
}

export default async function DashboardPage() {
  const [exchangeData, petrolData] = await Promise.all([
    getExchangeRate(),
    getPetrolPrices(),
  ])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">SGJB Dashboard</h1>
      <ExchangeWidget initialData={exchangeData} />
      <PetrolWidget data={petrolData} />
    </div>
  )
}
