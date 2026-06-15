import { NextRequest, NextResponse } from 'next/server'
import { db, priceEntries } from '@/lib/db'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'

export async function PATCH() {
  return NextResponse.json(
    { error: 'Price entries are immutable. Add a new observation instead.' },
    { status: 405 },
  )
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  try {
    const [entry] = await db
      .select({ submittedBy: priceEntries.submittedBy })
      .from(priceEntries)
      .where(eq(priceEntries.id, params.id))
      .limit(1)

    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (entry.submittedBy !== userId) {
      return NextResponse.json({ error: 'You can only delete your own price entries' }, { status: 403 })
    }

    const [deleted] = await db
      .delete(priceEntries)
      .where(and(eq(priceEntries.id, params.id), eq(priceEntries.submittedBy, userId)))
      .returning({ id: priceEntries.id })

    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
