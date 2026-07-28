import 'dotenv/config'
import { scrapeFairPrice } from './fairprice'
import { scrapeWatsonMY } from './watson_my'
import { scrapeGuardianSG } from './guardian_sg'
import { scrapeShengSiong } from './shengsiong'
import { scrapeJayaGrocer } from './jayagrocer'
import { upsertScrapedProduct } from './db'

const SCRAPERS: Record<string, { label: string; fn: () => Promise<unknown[]> }> = {
  fairprice: { label: 'FairPrice SG', fn: scrapeFairPrice },
  guardian: { label: 'Guardian SG', fn: scrapeGuardianSG },
  watson: { label: 'Watson JB', fn: scrapeWatsonMY },
  shengsiong: { label: 'Sheng Siong SG', fn: scrapeShengSiong },
  jayagrocer: { label: 'Jaya Grocer (KL, MY)', fn: scrapeJayaGrocer },
}

async function run() {
  console.log('=== SGJB Scraper Runner ===')
  console.log(`DB: ${process.env.POSTGRES_URL ? 'connected' : 'MISSING POSTGRES_URL'}`)

  if (!process.env.POSTGRES_URL) {
    console.error('Set POSTGRES_URL before running')
    process.exit(1)
  }

  // `npm run scrape -- --only shengsiong` runs a single scraper.
  const onlyIdx = process.argv.indexOf('--only')
  const only = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null
  if (only && !SCRAPERS[only]) {
    console.error(`Unknown scraper "${only}". Options: ${Object.keys(SCRAPERS).join(', ')}`)
    process.exit(1)
  }

  const allProducts: any[] = []

  for (const [key, { label, fn }] of Object.entries(SCRAPERS)) {
    if (only && key !== only) continue
    console.log(`\n--- ${label} ---`)
    try {
      const items = await fn()
      console.log(`${label}: ${items.length} products scraped`)
      allProducts.push(...items)
    } catch (e) {
      console.error(`${label} scraper failed:`, e)
    }
  }

  console.log(`\nTotal: ${allProducts.length} products. Saving to DB...`)

  let saved = 0
  let failed = 0
  for (const product of allProducts) {
    try {
      await upsertScrapedProduct(product)
      saved++
      if (saved % 20 === 0) console.log(`  Saved ${saved}/${allProducts.length}...`)
    } catch (e) {
      failed++
      const message = e instanceof Error ? e.message : String(e)
      console.warn(`  Failed: ${product.name} — ${message}`)
    }
  }

  console.log(`\nDone. Saved: ${saved}, Failed: ${failed}`)
}

run().catch(console.error)
