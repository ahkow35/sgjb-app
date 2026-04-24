import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Check for existing user
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1)

  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  const passwordHash = await hash(password, 12)

  const [created] = await db
    .insert(users)
    .values({ email: normalizedEmail, passwordHash })
    .returning({ id: users.id, email: users.email })

  return NextResponse.json({ id: created.id, email: created.email }, { status: 201 })
}
