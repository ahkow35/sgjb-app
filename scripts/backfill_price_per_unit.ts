// Rewrites price_entries rows stored in a non-canonical unit ('kg', 'L', 'l',
// 'cl', 'mg') to the canonical unit ('g' or 'ml' — see lib/units.ts) and
// recomputes price_per_unit accordingly. Also recomputes price_per_unit for
// any row where it is NULL but quantity is valid (> 0).
//
// Default is a DRY RUN — pass --apply to actually write. Safe to re-run
// (converted rows are already canonical on the next pass, so they're no-ops).
import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { db } from '../lib/db'

// Maps a stored (possibly non-canonical) unit to its canonical form and the
// multiplier applied to quantity. Units not listed pass through unchanged.
const UNIT_CONVERSION_CASE = sql`
  CASE lower(unit)
    WHEN 'kg' THEN 'g'
    WHEN 'mg' THEN 'g'
    WHEN 'l' THEN 'ml'
    WHEN 'cl' THEN 'ml'
    ELSE unit
  END
`

const QUANTITY_CONVERSION_CASE = sql`
  CASE lower(unit)
    WHEN 'kg' THEN quantity * 1000
    WHEN 'mg' THEN quantity / 1000
    WHEN 'l' THEN quantity * 1000
    WHEN 'cl' THEN quantity * 10
    ELSE quantity
  END
`

const NON_CANONICAL_UNITS = sql`lower(unit) IN ('kg', 'l', 'cl', 'mg')`

async function unitCounts(): Promise<{ unit: string; n: string }[]> {
  const result = await db.execute<{ unit: string; n: string }>(sql`
    SELECT unit, COUNT(*) AS n FROM price_entries GROUP BY unit ORDER BY unit
  `)
  return result.rows
}

async function projectedUnitCounts(): Promise<{ unit: string; n: string }[]> {
  const result = await db.execute<{ unit: string; n: string }>(sql`
    SELECT ${UNIT_CONVERSION_CASE} AS unit, COUNT(*) AS n
    FROM price_entries
    GROUP BY 1
    ORDER BY 1
  `)
  return result.rows
}

function printUnitCounts(label: string, rows: { unit: string; n: string }[]) {
  console.log(`\n${label}:`)
  for (const row of rows) {
    console.log(`  ${row.unit}: ${row.n}`)
  }
}

async function run() {
  const apply = process.argv.includes('--apply')

  console.log('=== SGJB price_per_unit backfill ===')
  console.log(`Mode: ${apply ? 'APPLY (will write)' : 'DRY RUN (pass --apply to write)'}`)

  if (!process.env.POSTGRES_URL) {
    console.error('Set POSTGRES_URL before running')
    process.exit(1)
  }

  const [nonCanonical] = (
    await db.execute<{ n: string }>(sql`
      SELECT COUNT(*) AS n FROM price_entries WHERE ${NON_CANONICAL_UNITS}
    `)
  ).rows
  const [nullPricePerUnit] = (
    await db.execute<{ n: string }>(sql`
      SELECT COUNT(*) AS n FROM price_entries WHERE price_per_unit IS NULL AND quantity > 0
    `)
  ).rows

  console.log(`\nNon-canonical unit rows to rewrite: ${nonCanonical.n}`)
  console.log(`NULL price_per_unit rows to recompute (quantity valid): ${nullPricePerUnit.n}`)

  printUnitCounts('Units before', await unitCounts())
  printUnitCounts('Units after (projected)', await projectedUnitCounts())

  if (!apply) {
    console.log('\nDry run only — no rows written. Re-run with --apply to write.')
    return
  }

  console.log('\nRewriting non-canonical units + recomputing price_per_unit...')
  const converted = await db.execute(sql`
    UPDATE price_entries
    SET
      quantity = ${QUANTITY_CONVERSION_CASE},
      unit = ${UNIT_CONVERSION_CASE},
      price_per_unit = ROUND(price / (${QUANTITY_CONVERSION_CASE}), 4)
    WHERE ${NON_CANONICAL_UNITS}
  `)
  console.log(`Converted: ${converted.rowCount ?? nonCanonical.n} rows`)

  console.log('\nRecomputing remaining NULL price_per_unit rows...')
  const recomputed = await db.execute(sql`
    UPDATE price_entries
    SET price_per_unit = ROUND(price / quantity, 4)
    WHERE price_per_unit IS NULL AND quantity > 0
  `)
  console.log(`Recomputed: ${recomputed.rowCount ?? 0} rows`)

  printUnitCounts('Units after', await unitCounts())
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
