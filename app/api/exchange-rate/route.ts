import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchExchangeRate, CACHE_KEY } from '@/lib/exchange'

export const revalidate = 3600

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: cached } = await supabase
      .from('live_data')
      .select('value, updated_at')
      .eq('key', CACHE_KEY)
      .single()

    if (cached) {
      const ageMs = Date.now() - new Date(cached.updated_at).getTime()
      if (ageMs < 3600_000) {
        return NextResponse.json(cached.value)
      }
    }

    const rateData = await fetchExchangeRate()

    await supabase.from('live_data').upsert({
      key: CACHE_KEY,
      value: rateData,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json(rateData)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch exchange rate' }, { status: 500 })
  }
}
