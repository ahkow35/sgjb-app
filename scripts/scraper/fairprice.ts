import { chromium } from 'playwright'
import type { ScrapedProduct } from './types'

// Correct slugs from /api/nav?storeId=165
const CATEGORIES = [
  'drinks',
  'rice-noodles-cooking-ingredients',
  'snacks--confectionery',
  'dairy-chilled-eggs',
  'beauty--personal-care',
  'household',
  'food-cupboard-6',
  'health--wellness',
]

function inferUnitType(unit: string): 'weight' | 'each' | 'volume' {
  const u = unit.toLowerCase()
  if (/\b(g|kg|gram)\b/.test(u)) return 'weight'
  if (/\b(ml|l|litre|liter)\b/.test(u)) return 'volume'
  return 'each'
}

function parseUnit(str: string): { quantity: number; unit: string } {
  // e.g. "500g", "1.5kg", "2 x 500ml", "12 x 330ml", "24 x 250ml (CTN)"
  // Strip parenthetical suffixes like "(CTN)"
  const cleaned = str.replace(/\(.*?\)/g, '').trim()
  const multiMatch = cleaned.match(/(\d+)\s*x\s*([\d.]+)\s*(\w+)/i)
  if (multiMatch) {
    const count = Number(multiMatch[1])
    const size = Number(multiMatch[2])
    return { quantity: count * size, unit: multiMatch[3].toLowerCase() }
  }
  const match = cleaned.match(/([\d.]+)\s*(\w+)/)
  if (match) {
    return { quantity: Number(match[1]), unit: match[2].toLowerCase() }
  }
  return { quantity: 1, unit: 'each' }
}

export async function scrapeFairPrice(): Promise<ScrapedProduct[]> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-SG',
  })

  const products: ScrapedProduct[] = []
  const today = new Date().toISOString().split('T')[0]

  for (const category of CATEGORIES) {
    console.log(`[FairPrice] Scraping category: ${category}`)
    const page = await context.newPage()

    // Intercept the product API responses
    // Real API: website-api.omni.fairprice.com.sg/api/product/v2
    // Response shape: { data: { product: { "0": {...}, "1": {...}, ... } } }
    const captured: any[] = []
    page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('/api/product/v2')) {
        try {
          const json = await response.json()
          if (json?.data?.product) {
            captured.push(...Object.values(json.data.product))
          }
        } catch {}
      }
    })

    try {
      await page.goto(`https://www.fairprice.com.sg/category/${category}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })

      // Wait for JS to boot then scroll to trigger product fetch
      await page.waitForTimeout(5000)
      await page.evaluate(() => window.scrollTo(0, 600))
      await page.waitForTimeout(3000)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(2000)
    } catch (e) {
      console.warn(`[FairPrice] Failed to load ${category}: ${e}`)
    }

    await page.close()

    for (const item of captured) {
      try {
        // Real field: final_price (not listPrice/price.value)
        const price = item.final_price ?? item.listPrice ?? item.price?.value
        if (!price || price <= 0) continue

        const name = item.name?.trim()
        if (!name) continue

        // Unit lives in metaData.DisplayUnit e.g. "24 x 250ml (CTN)"
        const displayUnit: string = item.metaData?.DisplayUnit ?? ''
        const { quantity, unit } = parseUnit(displayUnit)

        products.push({
          name,
          brand: item.brand?.name ?? '',
          category,
          imageUrl: item.images?.[0] ?? '',
          unitType: inferUnitType(unit),
          barcode: item.barcodes?.[0] ?? undefined,
          price,
          currency: 'SGD',
          quantity,
          unit,
          storeName: 'FairPrice',
          dateObserved: today,
        })
      } catch {}
    }

    console.log(`[FairPrice] ${category}: ${captured.length} products captured`)
    // Be respectful — small delay between categories
    await new Promise(r => setTimeout(r, 2000))
  }

  await browser.close()
  return products
}
