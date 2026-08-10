This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database schema changes

`lib/db/schema.ts` is the **single source of truth** for the database, and the
live DB is kept in step with it.

> ⚠️ **`db:push` is disabled.** `npm run db:push` exits with an explanation
> instead of running. drizzle-kit 0.31.x cannot read `NULLS NOT DISTINCT` back
> from Postgres, so on **every** run it reports a phantom diff on the
> `price_entries_observation_key` constraint and offers to **truncate
> `price_entries`** — deleting all price history. The live constraint already
> matches `schema.ts` (verified against prod); the diff is a drizzle-kit bug,
> not real drift.

**To change the schema safely:**

1. Edit `lib/db/schema.ts` — still the source of truth.
2. Apply the change with a **targeted DDL statement** via `psql` that mirrors
   exactly what you declared, nothing more. Creds come from
   `.env.development.local` (`POSTGRES_URL_NON_POOLING`, a Neon host):
   ```bash
   set -a; . ./.env.development.local; set +a
   psql "$POSTGRES_URL_NON_POOLING" -c 'CREATE UNIQUE INDEX IF NOT EXISTS "..." ON "..." (...);'
   ```
   This is **not** the "hand-written SQL causes drift" anti-pattern the old flow
   warned about: because the statement mirrors `schema.ts` one-for-one, the DB
   stays in step. Verify with a read-only `psql` query afterward.
3. `npm run db:studio` still opens a browser DB explorer for inspection.

If you ever genuinely need drizzle's diff engine, run `npx drizzle-kit push`
directly — and **never** answer "yes" to a truncate prompt on `price_entries`.
The pre-`push` migration files in `drizzle/_archive/` are historical only.

### Applying the Phase 0/1 schema changes (one-time runbook)

The observation-key unique constraint and the `price > 0` check need clean data
before `push` can apply them. Run, **in this order**:

```bash
npm run db:dedup                     # dry run — review the report (dup groups + price preflight)
npm run db:dedup -- --apply          # remove duplicate observations
npm run db:backfill-units            # dry run — review
npm run db:backfill-units -- --apply # canonicalize legacy kg/L rows, recompute price_per_unit
# Final step was `npm run db:push` to add the constraints/indexes. That is DONE
# (they are live in prod) and db:push is now disabled — see the warning above.
# Apply any future constraint with targeted psql DDL instead.
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
