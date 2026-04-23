import { NextRequest, NextResponse } from 'next/server'
import { db, products } from '@/lib/db'
import { eq, and, sql, SQL } from 'drizzle-orm'
import { buildProductSearchQuery } from './utils'

// NOTE: This endpoint has no auth guard. RLS policy "Anyone can add products" no longer
// applies (no RLS without Supabase). This must not go live without Phase 9 auth.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const query = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 20), 1), 50)

  const conditions: SQL[] = []

  const tsQuery = buildProductSearchQuery(query)
  if (tsQuery) {
    conditions.push(sql`to_tsvector('english', ${products.name}) @@ to_tsquery('english', ${tsQuery})`)
  }
  if (category) {
    conditions.push(eq(products.category, category))
  }

  try {
    const data = await db.select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      category: products.category,
      image_url: products.imageUrl,
      unit_type: products.unitType,
      barcode: products.barcode,
    })
      .from(products)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)

    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, brand, category, unit_type, barcode } = body

  if (!name || !unit_type) {
    return NextResponse.json({ error: 'name and unit_type are required' }, { status: 400 })
  }

  try {
    const [data] = await db.insert(products)
      .values({
        name,
        brand: brand ?? '',
        category: category ?? '',
        unitType: unit_type,
        barcode: barcode ?? null,
      })
      .returning()

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
