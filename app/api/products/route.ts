import { NextRequest, NextResponse } from 'next/server'
import { db, products } from '@/lib/db'
import { eq, and, sql, SQL } from 'drizzle-orm'
import { buildProductSearchQuery } from './utils'
import { auth } from '@/auth'

const UNIT_TYPES = new Set(['weight', 'each', 'volume'])

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
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { name, brand, category, unit_type, barcode } = body

  if (!name || !unit_type) {
    return NextResponse.json({ error: 'name and unit_type are required' }, { status: 400 })
  }
  if (typeof unit_type !== 'string' || !UNIT_TYPES.has(unit_type)) {
    return NextResponse.json({ error: 'unit_type must be weight, each, or volume' }, { status: 400 })
  }

  try {
    const [data] = await db.insert(products)
      .values({
        name: String(name),
        brand: brand ? String(brand) : '',
        category: category ? String(category) : '',
        unitType: unit_type as 'weight' | 'each' | 'volume',
        barcode: barcode ? String(barcode) : null,
      })
      .returning()

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
