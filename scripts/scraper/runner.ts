import 'dotenv/config'
import { scrapeFairPrice } from './fairprice'
import { scrapeWatsonMY } from './watson_my'
import { scrapeGuardianSG } from './guardian_sg'
import { upsertScrapedProduct } from './db'

async function run() {
  console.log('=== SGJB Scraper Runner ===')
  console.log(`DB: ${process.env.POSTGRES_URL ? 'connected' : 'MISSING POSTGRES_URL'}`)

  if (!process.env.POSTGRES_URL) {
    console.error('Set POSTGRES_URL before running')
    process.exit(1)
  }

  const allProducts: any[] = []

  // FairPrice SG
  console.log('\n--- FairPrice SG ---')
  try {
    const fp = await scrapeFairPrice()
    console.log(`FairPrice: ${fp.length} products scraped`)
    allProducts.push(...fp)
  } catch (e) {
    console.error('FairPrice scraper failed:', e)
  }

  // Guardian SG
  console.log('\n--- Guardian SG ---')
  try {
    const gsg = await scrapeGuardianSG()
    console.log(`Guardian SG: ${gsg.length} products scraped`)
    allProducts.push(...gsg)
  } catch (e) {
    console.error('Guardian SG scraper failed:', e)
  }

  // Watson MY (JB)
  console.log('\n--- Watson JB ---')
  try {
    const wm = await scrapeWatsonMY()
    console.log(`Watson JB: ${wm.length} products scraped`)
    allProducts.push(...wm)
  } catch (e) {
    console.error('Watson JB scraper failed:', e)
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
      console.warn(`  Failed: ${product.name} — ${e}`)
    }
  }

  console.log(`\nDone. Saved: ${saved}, Failed: ${failed}`)
}

run().catch(console.error)
