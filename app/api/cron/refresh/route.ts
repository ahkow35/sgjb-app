import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchExchangeRate, CACHE_KEY as EX_KEY } from '@/lib/exchange'
import { fetchPetrolPrices, CACHE_KEY as PETROL_KEY } from '@/lib/petrol'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const results: Record<string, string> = {}

  try {
    const rate = await fetchExchangeRate()
    await supabase.from('live_data').upsert({
      key: EX_KEY,
      value: rate,
      updated_at: new Date().toISOString(),
    })
    results.exchange = 'ok'
  } catch (e) {
    results.exchange = String(e)
  }

  try {
    const petrol = await fetchPetrolPrices()
    await supabase.from('live_data').upsert({
      key: PETROL_KEY,
      value: petrol,
      updated_at: new Date().toISOString(),
    })
    results.petrol = 'ok'
  } catch (e) {
    results.petrol = String(e)
  }

  return NextResponse.json(results)
}
