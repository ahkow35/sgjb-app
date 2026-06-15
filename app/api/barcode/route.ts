import { NextRequest, NextResponse } from 'next/server'
import { db, products } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'

interface OFFProduct {
  product_name?: string
  brands?: string
  categories_tags?: string[]
  quantity?: string
}

interface OFFResponse {
  status: number
  product?: OFFProduct
}

function deriveUnitType(quantity?: string): 'weight' | 'each' | 'volume' {
  if (!quantity) return 'each'
  const q = quantity.toLowerCase()
  if (/\d\s*(g|kg|mg|oz|lb)/.test(q)) return 'weight'
  if (/\d\s*(ml|l|fl oz|cl)/.test(q)) return 'volume'
  return 'each'
}

function deriveCategory(tags?: string[]): string {
  if (!tags || tags.length === 0) return ''
  // Strip 'en:' prefix and pick the most specific non-trivial tag
  const candidates = tags
    .map((t) => t.replace(/^[a-z]{2}:/, '').replace(/-/g, ' '))
    .filter((t) => t.length > 3 && !['foods', 'plant based foods'].includes(t))
  return candidates[0] ?? ''
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim()
  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }

  // 1. Check our DB first
  const [existing] = await db
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      category: products.category,
      unit_type: products.unitType,
      barcode: products.barcode,
      image_url: products.imageUrl,
    })
    .from(products)
    .where(eq(products.barcode, code))
    .limit(1)

  if (existing) {
    return NextResponse.json({ found: true, product: existing })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in required to create barcode products' }, { status: 401 })
  }

  // 2. Fetch Open Food Facts (with 5s timeout)
  let offData: OFFResponse
  const ac = new AbortController()
  const timeoutId = setTimeout(() => ac.abort(), 5000)
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
      { next: { revalidate: 3600 }, signal: ac.signal },
    )
    if (!res.ok) {
      console.error('[barcode] OFF returned', res.status, 'for', code)
      return NextResponse.json({ found: false, product: null, source: 'off_http_error' })
    }
    offData = await res.json()
  } catch (error) {
    console.error('[barcode] OFF fetch failed', { code, error: String(error) })
    return NextResponse.json({ found: false, product: null, source: 'off_network_error' })
  } finally {
    clearTimeout(timeoutId)
  }

  if (offData.status !== 1 || !offData.product) {
    return NextResponse.json({ found: false, product: null, source: 'not_found' })
  }

  const off = offData.product
  const name = off.product_name?.trim()
  if (!name) {
    return NextResponse.json({ found: false, product: null, source: 'no_name' })
  }

  const unitType = deriveUnitType(off.quantity)
  const category = deriveCategory(off.categories_tags)
  const brand = off.brands?.split(',')[0]?.trim() ?? ''

  // 3. Create product stub in DB
  try {
    const [created] = await db
      .insert(products)
      .values({ name, brand, category, unitType, barcode: code })
      .returning({
        id: products.id,
        name: products.name,
        brand: products.brand,
        category: products.category,
        unit_type: products.unitType,
        barcode: products.barcode,
        image_url: products.imageUrl,
      })
    return NextResponse.json({ found: false, product: created, source: 'openfoodfacts' })
  } catch (error) {
    console.error('[barcode] insert failed (race or constraint)', { code, error: String(error) })
    // If insert fails (race condition duplicate), try fetching again
    const [retry] = await db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        category: products.category,
        unit_type: products.unitType,
        barcode: products.barcode,
        image_url: products.imageUrl,
      })
      .from(products)
      .where(eq(products.barcode, code))
      .limit(1)

    if (retry) return NextResponse.json({ found: true, product: retry })
    return NextResponse.json({ found: false, product: null, source: 'db_error' }, { status: 500 })
  }
}
