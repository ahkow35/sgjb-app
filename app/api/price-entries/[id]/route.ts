import { NextRequest, NextResponse } from 'next/server'
import { db, priceEntries } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { price, quantity, unit, date_observed } = body
  const priceNum = Number(price)
  const quantityNum = Number(quantity ?? 1)

  if (isNaN(priceNum) || priceNum <= 0) {
    return NextResponse.json({ error: 'price must be a positive number' }, { status: 400 })
  }
  if (isNaN(quantityNum) || quantityNum <= 0) {
    return NextResponse.json({ error: 'quantity must be a positive number' }, { status: 400 })
  }

  const pricePerUnit = priceNum / quantityNum

  const updateData: Record<string, string | null> = {
    price: priceNum.toFixed(2),
    quantity: quantityNum.toFixed(3),
    unit: String(unit ?? 'each'),
    pricePerUnit: pricePerUnit.toFixed(4),
  }
  if (date_observed) {
    updateData.dateObserved = String(date_observed)
  }

  try {
    const [updated] = await db
      .update(priceEntries)
      .set(updateData)
      .where(eq(priceEntries.id, params.id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [deleted] = await db
      .delete(priceEntries)
      .where(eq(priceEntries.id, params.id))
      .returning({ id: priceEntries.id })

    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
