import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchPetrolPrices, CACHE_KEY } from '@/lib/petrol'

export const revalidate = 86400

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
      if (ageMs < 86400_000) {
        return NextResponse.json(cached.value)
      }
    }

    const prices = await fetchPetrolPrices()

    await supabase.from('live_data').upsert({
      key: CACHE_KEY,
      value: prices,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json(prices)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch petrol prices' }, { status: 500 })
  }
}
