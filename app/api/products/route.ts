import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildProductSearchQuery } from './utils'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const query = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50)

  const supabase = createClient()
  let builder = supabase
    .from('products')
    .select('id, name, brand, category, image_url, unit_type, barcode')
    .limit(limit)

  if (query.trim()) {
    const tsQuery = buildProductSearchQuery(query)
    builder = builder.textSearch('name', tsQuery, { config: 'english' })
  }

  if (category) {
    builder = builder.eq('category', category)
  }

  const { data, error } = await builder

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, brand, category, unit_type, barcode } = body

  if (!name || !unit_type) {
    return NextResponse.json({ error: 'name and unit_type are required' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .insert({ name, brand: brand ?? '', category: category ?? '', unit_type, barcode: barcode ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
