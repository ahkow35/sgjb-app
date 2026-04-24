import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim()
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const [user] = await db
          .select({
            id: users.id,
            email: users.email,
            passwordHash: users.passwordHash,
            submissionCount: users.submissionCount,
          })
          .from(users)
          .where(eq(users.email, email))
          .limit(1)

        if (!user) return null
        const valid = await compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
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
