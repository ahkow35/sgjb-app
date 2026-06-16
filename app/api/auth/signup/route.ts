import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { normalizeToE164, isValidPin, type Country } from '@/lib/phone'

const COUNTRIES: Country[] = ['SG', 'MY']

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { country, phone, pin, display_name } = body

  if (typeof country !== 'string' || !COUNTRIES.includes(country as Country)) {
    return NextResponse.json({ error: 'country must be SG or MY' }, { status: 400 })
  }
  if (typeof phone !== 'string' || typeof pin !== 'string') {
    return NextResponse.json({ error: 'phone and pin are required' }, { status: 400 })
  }

  const phoneNumber = normalizeToE164(country as Country, phone)
  if (!phoneNumber) {
    return NextResponse.json({ error: 'Enter a valid mobile number' }, { status: 400 })
  }
  if (!isValidPin(pin)) {
    return NextResponse.json({ error: 'PIN must be exactly 6 digits' }, { status: 400 })
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phoneNumber, phoneNumber))
    .limit(1)

  if (existing) {
    return NextResponse.json({ error: 'Mobile number already registered' }, { status: 409 })
  }

  const passwordHash = await hash(pin, 12)
  const displayName = typeof display_name === 'string' && display_name.trim()
    ? display_name.trim()
    : null

  const [created] = await db
    .insert(users)
    .values({ phoneNumber, passwordHash, displayName })
    .returning({ id: users.id, phoneNumber: users.phoneNumber })

  return NextResponse.json({ id: created.id, phone_number: created.phoneNumber }, { status: 201 })
}
