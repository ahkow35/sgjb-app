import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { normalizeToE164, isValidPin, type Country } from '@/lib/phone'
import { isLocked, recordFailure, clearAttempts } from '@/lib/login-attempts'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: 'phone-pin',
      name: 'Phone',
      credentials: {
        country: { label: 'Country', type: 'text' },
        phone: { label: 'Mobile number', type: 'tel' },
        pin: { label: 'PIN', type: 'password' },
      },
      async authorize(credentials) {
        const country = credentials?.country as Country | undefined
        const phoneInput = credentials?.phone as string | undefined
        const pin = credentials?.pin as string | undefined
        if (!country || !phoneInput || !pin) return null

        const phone = normalizeToE164(country, phoneInput)
        if (!phone || !isValidPin(pin)) return null

        // Locked out → fail without revealing why or escalating further.
        if (await isLocked(phone)) return null

        const [user] = await db
          .select({
            id: users.id,
            phoneNumber: users.phoneNumber,
            passwordHash: users.passwordHash,
            displayName: users.displayName,
            submissionCount: users.submissionCount,
          })
          .from(users)
          .where(eq(users.phoneNumber, phone))
          .limit(1)

        // Unknown number and wrong PIN are treated identically (no enumeration),
        // and both count toward the lockout.
        if (!user || !(await compare(pin, user.passwordHash))) {
          await recordFailure(phone)
          return null
        }

        await clearAttempts(phone)
        return {
          id: user.id,
          name: user.displayName ?? undefined,
          submissionCount: user.submissionCount,
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.submissionCount = (user as { submissionCount?: number }).submissionCount ?? 0
      }
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      session.user.submissionCount = (token.submissionCount as number) ?? 0
      return session
    },
  },
  pages: {
    signIn: '/auth',
  },
})
