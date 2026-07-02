import { NextRequest, NextResponse } from 'next/server'
import { db, liveData } from '@/lib/db'
import { fetchExchangeRate, CACHE_KEY as EX_KEY } from '@/lib/exchange'
import { fetchPetrolPrices, CACHE_KEY as PETROL_KEY } from '@/lib/petrol'
import { fetchSgFuelPrices, CACHE_KEY as SG_KEY } from '@/lib/sg-fuel'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, string> = {}

  try {
    const rate = await fetchExchangeRate()
    await db.insert(liveData)
      .values({ key: EX_KEY, value: rate, updatedAt: new Date() })
      .onConflictDoUpdate({ target: liveData.key, set: { value: rate, updatedAt: new Date() } })
    results.exchange = 'ok'
  } catch (e) {
    results.exchange = String(e)
  }

  try {
    const petrol = await fetchPetrolPrices()
    await db.insert(liveData)
      .values({ key: PETROL_KEY, value: petrol, updatedAt: new Date() })
      .onConflictDoUpdate({ target: liveData.key, set: { value: petrol, updatedAt: new Date() } })
    results.petrol = 'ok'
  } catch (e) {
    results.petrol = String(e)
  }

  try {
    const sgFuel = await fetchSgFuelPrices()
    await db.insert(liveData)
      .values({ key: SG_KEY, value: sgFuel, updatedAt: new Date() })
      .onConflictDoUpdate({ target: liveData.key, set: { value: sgFuel, updatedAt: new Date() } })
    results.sgFuel = 'ok'
  } catch (e) {
    results.sgFuel = String(e)
  }

  return NextResponse.json(results)
}
