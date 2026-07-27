import { chromium } from 'playwright'
import type { ScrapedProduct } from './types'

// Grocery-focused category slugs from shengsiong.com.sg's top navigation.
const CATEGORIES = [
  'vegetables',
  'fruits',
  'meat-poultry-seafood',
  'dairy-chilled-eggs',
  'beverages',
  'rice-noodles-pasta',
  'frozen-goods',
  'breakfast-spreads',
  'cooking-baking',
  'dried-food-herbs',
  'snacks-confectioneries',
  'household',
]

// How many times to scroll each category page. The site infinite-scrolls
// (~15 products per viewport, ~45 more per scroll); 6 scrolls ≈ top 100+
// products per category without hammering the site.
const SCROLLS_PER_CATEGORY = 6

function inferUnitType(unit: string): 'weight' | 'each' | 'volume' {
  const u = unit.toLowerCase()
  if (/\b(g|kg|gram)\b/.test(u)) return 'weight'
  if (/\b(ml|l|litre|liter)\b/.test(u)) return 'volume'
  return 'each'
}

function parseUnit(str: string): { quantity: number; unit: string } {
  // Pack sizes look like "150 g", "1 kg", "2 x 500 ml", "18 x 30 g", "1 pc"
  const cleaned = str.replace(/\(.*?\)/g, '').trim()
  const multiMatch = cleaned.match(/(\d+)\s*x\s*([\d.]+)\s*([a-zA-Z]+)/i)
  if (multiMatch) {
    return {
      quantity: Number(multiMatch[1]) * Number(multiMatch[2]),
      unit: multiMatch[3].toLowerCase(),
    }
  }
  const match = cleaned.match(/([\d.]+)\s*([a-zA-Z]+)/)
  if (match) {
    return { quantity: Number(match[1]), unit: match[2].toLowerCase() }
  }
  return { quantity: 1, unit: 'each' }
}

// Units the site uses that our canonical vocabulary spells differently.
const UNIT_ALIASES: Record<string, string> = {
  pc: 'each',
  pcs: 'pcs',
  piece: 'each',
  pkt: 'pack',
  packet: 'pack',
}

interface CardData {
  name: string
  packSize: string
  priceText: string
  imageUrl: string
}

export async function scrapeShengSiong(): Promise<ScrapedProduct[]> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-SG',
  })

  const products: ScrapedProduct[] = []
  const today = new Date().toISOString().split('T')[0]

  for (const category of CATEGORIES) {
    console.log(`[ShengSiong] Scraping category: ${category}`)
    const page = await context.newPage()

    let cards: CardData[] = []
    try {
      await page.goto(`https://shengsiong.com.sg/${category}`, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      })
      // Meteor app: give the client time to boot and render the first batch.
      await page.waitForTimeout(6000)
      for (let i = 0; i < SCROLLS_PER_CATEGORY; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await page.waitForTimeout(2500)
      }

      // The site renders one `a.product-preview` per product with stable
      // .product-name / .product-packSize children and a "$X.XX" price.
      cards = await page.evaluate(() => {
        const out: { name: string; packSize: string; priceText: string; imageUrl: string }[] = []
        const seen = new Set<string>()
        for (const a of Array.from(document.querySelectorAll('a.product-preview'))) {
          const href = a.getAttribute('href') ?? ''
          if (!href || seen.has(href)) continue
          seen.add(href)
          const name = a.querySelector('.product-name')?.textContent?.trim() ?? ''
          const packSize = a.querySelector('.product-packSize')?.textContent?.trim() ?? ''
          const priceText = (a.textContent ?? '').match(/\$\s?(\d+(?:\.\d{1,2})?)/)?.[1] ?? ''
          const imageUrl = a.querySelector('img.product-img')?.getAttribute('src') ?? ''
          out.push({ name, packSize, priceText, imageUrl })
        }
        return out
      })
    } catch (e) {
      console.warn(`[ShengSiong] Failed to load ${category}: ${e}`)
    }

    await page.close()

    for (const card of cards) {
      try {
        const price = Number(card.priceText)
        if (!card.name || !price || price <= 0) continue

        const parsed = parseUnit(card.packSize)
        const unit = UNIT_ALIASES[parsed.unit] ?? parsed.unit

        products.push({
          name: card.name,
          brand: '',
          category,
          imageUrl: card.imageUrl,
          unitType: inferUnitType(unit),
          barcode: undefined,
          price,
          currency: 'SGD',
          quantity: parsed.quantity,
          unit,
          storeName: 'Sheng Siong',
          dateObserved: today,
        })
      } catch {}
    }

    console.log(`[ShengSiong] ${category}: ${cards.length} products captured`)
    // Be respectful — small delay between categories
    await new Promise((r) => setTimeout(r, 2000))
  }

  await browser.close()
  return products
}
