import { NextResponse } from 'next/server'
import { db, liveData } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { fetchPetrolPrices, CACHE_KEY } from '@/lib/petrol'

export const revalidate = 86400

export async function GET() {
  try {
    const [cached] = await db.select().from(liveData).where(eq(liveData.key, CACHE_KEY)).limit(1)

    if (cached) {
      const ageMs = Date.now() - cached.updatedAt.getTime()
      if (ageMs < 86400_000) {
        return NextResponse.json(cached.value)
      }
    }

    const prices = await fetchPetrolPrices()

    await db.insert(liveData)
      .values({ key: CACHE_KEY, value: prices, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: liveData.key,
        set: { value: prices, updatedAt: new Date() },
      })

    return NextResponse.json(prices)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch petrol prices' }, { status: 500 })
  }
}
