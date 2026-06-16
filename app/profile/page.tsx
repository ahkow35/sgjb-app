import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db, priceEntries, products, stores, users } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { SignOutButton } from '@/components/SignOutButton'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect('/auth?callbackUrl=/profile')

  const [profile] = await db
    .select({ phoneNumber: users.phoneNumber, displayName: users.displayName })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  const submissions = await db
    .select({
      id: priceEntries.id,
      price: priceEntries.price,
      currency: priceEntries.currency,
      dateObserved: priceEntries.dateObserved,
      productName: products.name,
      storeName: stores.name,
    })
    .from(priceEntries)
    .innerJoin(products, eq(priceEntries.productId, products.id))
    .innerJoin(stores, eq(priceEntries.storeId, stores.id))
    .where(eq(priceEntries.submittedBy, session.user.id))
    .orderBy(desc(priceEntries.createdAt))
    .limit(50)

  const count = session.user.submissionCount
  const isContributor = count >= 10

  return (
    <div className="pb-24 px-4 pt-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Profile</h1>
        <SignOutButton />
      </div>

      {/* User info */}
      <div className="rounded-lg border p-4 mb-4">
        <p className="text-sm font-medium">
          {profile?.displayName || profile?.phoneNumber || 'Your account'}
        </p>
        {profile?.displayName && profile?.phoneNumber && (
          <p className="text-xs text-muted-foreground">{profile.phoneNumber}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {count} price submission{count !== 1 ? 's' : ''}
          </span>
          {isContributor && (
            <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium px-2 py-0.5">
              ★ Contributor
            </span>
          )}
          {!isContributor && count > 0 && (
            <span className="text-xs text-muted-foreground">
              — {10 - count} more to earn Contributor badge
            </span>
          )}
        </div>
      </div>

      {/* Submission history */}
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Your submissions
      </h2>

      {submissions.length === 0 ? (
        <div className="rounded-lg border p-6 text-center">
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
          <Link
            href="/submit"
            className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Submit your first price
          </Link>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border overflow-hidden">
          {submissions.map((s) => (
            <li key={s.id} className="px-4 py-3">
              <p className="text-sm font-medium truncate">{s.productName}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-muted-foreground">{s.storeName}</p>
                <p className="text-xs font-medium">
                  {s.currency === 'MYR' ? 'RM' : 'S$'}{Number(s.price).toFixed(2)}
                  <span className="text-muted-foreground ml-1.5">{s.dateObserved}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
