import { chromium } from 'playwright'
import type { ScrapedProduct } from './types'

// Guardian SG pharmacy/health categories
const CATEGORIES = [
  'vitamins-supplements',
  'personal-care',
  'skincare',
  'hair-care',
  'cold-flu-pain-relief',
  'digestive-health',
]

function parsePackUnit(packSize: number | null, unit: string | null): { quantity: number; unit: string } {
  if (!packSize || packSize <= 0) return { quantity: 1, unit: 'each' }
  const u = (unit ?? '').toLowerCase().trim()
  // Normalize common measurement_unit values
  if (u === 's' || u === 'pc' || u === 'pcs' || u === 'pieces' || u === 'piece') {
    return { quantity: packSize, unit: 'each' }
  }
  if (/^(g|gram|grams)$/.test(u)) return { quantity: packSize, unit: 'g' }
  if (/^(ml|milliliter|millilitre)$/.test(u)) return { quantity: packSize, unit: 'ml' }
  if (/^(l|litre|liter)$/.test(u)) return { quantity: packSize * 1000, unit: 'ml' }
  if (/^kg$/.test(u)) return { quantity: packSize * 1000, unit: 'g' }
  return { quantity: packSize, unit: u || 'each' }
}

function inferUnitType(unit: string): 'weight' | 'each' | 'volume' {
  const u = unit.toLowerCase()
  if (/\b(g|kg|gram)\b/.test(u)) return 'weight'
  if (/\b(ml|l|litre|liter)\b/.test(u)) return 'volume'
  return 'each'
}

export async function scrapeGuardianSG(): Promise<ScrapedProduct[]> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-SG',
  })

  const products: ScrapedProduct[] = []
  const today = new Date().toISOString().split('T')[0]

  for (const category of CATEGORIES) {
    console.log(`[GuardianSG] Scraping category: ${category}`)
    const page = await context.newPage()

    const captured: any[] = []
    page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('guardian.com.sg/graphql') && url.includes('getProductDetailV2')) {
        try {
          const json = await response.json()
          const items = json?.data?.products?.items ?? []
          captured.push(...items)
        } catch {}
      }
    })

    try {
      await page.goto(`https://www.guardian.com.sg/c/${category}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      await page.waitForTimeout(5000)
      await page.evaluate(() => window.scrollTo(0, 600))
      await page.waitForTimeout(3000)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(2000)
    } catch (e) {
      console.warn(`[GuardianSG] Failed to load ${category}: ${e}`)
    }

    await page.close()

    for (const item of captured) {
      try {
        // Use special_price if set (sale price), otherwise minimalPrice
        const price =
          item.special_price ??
          item.price?.minimalPrice?.amount?.value ??
          item.price_range?.minimum_price?.final_price?.value

        if (!price || price <= 0) continue

        const name = item.name?.trim()
        if (!name) continue

        const { quantity, unit } = parsePackUnit(item.pack_size, item.measurement_unit)
        const imageUrl =
          item.thumbnail?.url?.split('?')[0] ??
          item.small_image?.url?.split('?')[0] ??
          ''

        products.push({
          name,
          brand: item.brand ?? '',
          category,
          imageUrl,
          unitType: inferUnitType(unit),
          barcode: item.sku ?? undefined,
          price,
          currency: 'SGD',
          quantity,
          unit,
          storeName: 'Guardian SG',
          dateObserved: today,
        })
      } catch {}
    }

    console.log(`[GuardianSG] ${category}: ${captured.length} products captured`)
    await new Promise((r) => setTimeout(r, 2000))
  }

  await browser.close()
  return products
}
