import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { isAdminUser } from '@/lib/admin'
import { db, priceEntries } from '@/lib/db'
import { eq } from 'drizzle-orm'
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

    // Owners may delete their own entries; admins may delete any (including
    // scraper entries, which have no submitter). Admin is re-checked against the
    // DB, not the session token.
    const isOwner = entry.submittedBy === userId
    if (!isOwner && !(await isAdminUser(userId))) {
      return NextResponse.json({ error: 'You can only delete your own price entries' }, { status: 403 })
    }

    await db.delete(priceEntries).where(eq(priceEntries.id, params.id))

    return NextResponse.json({ success: true })
  } catch (e) {
    return serverError(e, 'DELETE /api/price-entries/[id]')
  }
}
