import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { db, products } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [product] = await db
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
      .where(eq(products.id, params.id))
      .limit(1)

    if (!product) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (e) {
    return serverError(e, 'GET /api/products/[id]')
  }
}
