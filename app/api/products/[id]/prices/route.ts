import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('price_entries')
    .select(`
      id, price, currency, quantity, unit, price_per_unit,
      date_observed, created_at,
      stores ( id, name, country, city, type )
    `)
    .eq('product_id', params.id)
    .order('date_observed', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
