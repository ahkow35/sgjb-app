// Removes duplicate price_entries rows before `npm run db:push` applies the
// price_entries_observation_key unique constraint (see lib/db/schema.ts).
// Duplicates are groups sharing (product_id, store_id, submitted_by, date_observed)
// — mostly same-day scraper re-runs. For each group, the row with the latest
// created_at (tiebreak: highest id) is kept and the rest are deleted.
//
// Default is a DRY RUN — pass --apply to actually delete. Safe to re-run.
import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { db } from '../lib/db'

const RANKED_CTE = sql`
  ranked AS (
    SELECT id, product_id, store_id, submitted_by, date_observed, created_at,
      ROW_NUMBER() OVER (
        PARTITION BY product_id, store_id, submitted_by, date_observed
        ORDER BY created_at DESC, id DESC
      ) AS rn
    FROM price_entries
  )
`

async function countRows(): Promise<string> {
  const result = await db.execute<{ n: string }>(sql`SELECT COUNT(*) AS n FROM price_entries`)
  return result.rows[0].n
}

async function run() {
  const apply = process.argv.includes('--apply')

  console.log('=== SGJB price_entries dedup ===')
  console.log(`Mode: ${apply ? 'APPLY (will delete)' : 'DRY RUN (pass --apply to delete)'}`)

  if (!process.env.POSTGRES_URL) {
    console.error('Set POSTGRES_URL before running')
    process.exit(1)
  }

  const totalBefore = await countRows()

  const dupeGroups = await db.execute<{ cnt: string }>(sql`
    SELECT product_id, store_id, submitted_by, date_observed, COUNT(*) AS cnt
    FROM price_entries
    GROUP BY product_id, store_id, submitted_by, date_observed
    HAVING COUNT(*) > 1
  `)
  const groupCount = dupeGroups.rows.length
  const rowsToDelete = dupeGroups.rows.reduce((sum, g) => sum + (Number(g.cnt) - 1), 0)

  console.log(`\nTotal rows before: ${totalBefore}`)
  console.log(`Duplicate groups (count > 1): ${groupCount}`)
  console.log(`Rows that would be deleted: ${rowsToDelete}`)

  // Preflight for the other new constraint in this branch: db:push also adds
  // a `price > 0` check, which fails atomically if any live row violates it.
  const badPrice = await db.execute<{ n: string }>(
    sql`SELECT COUNT(*) AS n FROM price_entries WHERE price <= 0`,
  )
  const badPriceCount = Number(badPrice.rows[0].n)
  console.log(
    `Rows violating the new price > 0 check: ${badPriceCount}` +
      (badPriceCount > 0 ? '  ⚠ db:push will fail until these are fixed' : ''),
  )

  if (groupCount > 0) {
    const sample = await db.execute<{
      id: string
      product_id: string
      store_id: string
      submitted_by: string | null
      date_observed: string
      created_at: string
    }>(sql`
      WITH ${RANKED_CTE}
      SELECT id, product_id, store_id, submitted_by, date_observed, created_at
      FROM ranked
      WHERE rn > 1
      ORDER BY product_id, store_id, date_observed
      LIMIT 5
    `)

    console.log('\nSample rows that would be deleted (up to 5):')
    for (const row of sample.rows) {
      console.log(
        `  id=${row.id} product=${row.product_id} store=${row.store_id} ` +
        `submitted_by=${row.submitted_by ?? 'NULL'} date=${row.date_observed} created_at=${row.created_at}`,
      )
    }
  }

  if (!apply) {
    console.log('\nDry run only — no rows deleted. Re-run with --apply to delete.')
    return
  }

  console.log('\nDeleting...')
  const deleted = await db.execute(sql`
    WITH ${RANKED_CTE}
    DELETE FROM price_entries
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
  `)
  console.log(`Deleted: ${deleted.rowCount ?? rowsToDelete} rows`)

  const totalAfter = await countRows()
  console.log(`Total rows after: ${totalAfter}`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
