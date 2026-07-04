import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { getEnrichedProducts, PAGE_SIZE } from '@/lib/products-query'

// Reads searchParams and must reflect live data, so never cache / prerender.
export const dynamic = 'force-dynamic'

// Backs the "Load more" button on the products list.
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const q = sp.get('q') ?? ''
    const category = sp.get('category') ?? ''
    const offset = Math.max(0, Math.trunc(Number(sp.get('offset')) || 0))
    const rows = await getEnrichedProducts(q, category, PAGE_SIZE, offset)
    return NextResponse.json(rows)
  } catch (e) {
    return serverError(e, 'GET /api/products/list')
  }
}
