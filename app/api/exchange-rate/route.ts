import { NextResponse } from 'next/server'
import { db, liveData } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { fetchExchangeRate, CACHE_KEY } from '@/lib/exchange'

export const revalidate = 3600

export async function GET() {
  try {
    const [cached] = await db.select().from(liveData).where(eq(liveData.key, CACHE_KEY)).limit(1)

    if (cached) {
      const ageMs = Date.now() - cached.updatedAt.getTime()
      if (ageMs < 3600_000) {
        return NextResponse.json(cached.value)
      }
    }

    const rateData = await fetchExchangeRate()

    await db.insert(liveData)
      .values({ key: CACHE_KEY, value: rateData, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: liveData.key,
        set: { value: rateData, updatedAt: new Date() },
      })

    return NextResponse.json(rateData)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch exchange rate' }, { status: 500 })
  }
}
