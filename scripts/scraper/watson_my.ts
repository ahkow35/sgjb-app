import { chromium } from 'playwright'
import type { ScrapedProduct } from './types'

const SEARCH_TERMS = [
  'vitamin c',
  'paracetamol',
  'sunscreen',
  'shampoo',
  'face wash',
  'toothpaste',
  'contact lens',
  'moisturizer',
]

function inferUnitType(unit: string): 'weight' | 'each' | 'volume' {
  const u = unit.toLowerCase()
  if (/g|kg|gram/.test(u)) return 'weight'
  if (/ml|l|litre|liter/.test(u)) return 'volume'
  return 'each'
}

function parseUnit(str: string): { quantity: number; unit: string } {
  const match = str.match(/([\d.]+)\s*(\w+)/)
  if (match) return { quantity: Number(match[1]), unit: match[2].toLowerCase() }
  return { quantity: 1, unit: 'each' }
}

export async function scrapeWatsonMY(): Promise<ScrapedProduct[]> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })

  const products: ScrapedProduct[] = []
  const today = new Date().toISOString().split('T')[0]

  for (const term of SEARCH_TERMS) {
    console.log(`[WatsonMY] Searching: ${term}`)
    const page = await context.newPage()
    const captured: any[] = []

    page.on('response', async (response) => {
      const url = response.url()
      if ((url.includes('/search') || url.includes('/products')) && url.includes('watsons.com.my')) {
        try {
          const json = await response.json()
          // Watson hybris API format
          if (json?.products) captured.push(...json.products)
          else if (json?.results) captured.push(...json.results)
        } catch {}
      }
    })

    try {
      const encoded = encodeURIComponent(term)
      await page.goto(`https://www.watsons.com.my/search?text=${encoded}&q=${encoded}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      })
      await page.waitForTimeout(2000)
    } catch (e) {
      console.warn(`[WatsonMY] Failed for "${term}": ${e}`)
    }

    // Also try to extract from page DOM if API interception fails
    if (captured.length === 0) {
      try {
        const domProducts = await page.evaluate(() => {
          const items: any[] = []
          document.querySelectorAll('[class*="product-card"], [class*="productCard"], .product-item').forEach(el => {
            const name = el.querySelector('[class*="name"], h2, h3')?.textContent?.trim()
            const priceEl = el.querySelector('[class*="price"], .price')?.textContent?.trim()
            const price = priceEl ? parseFloat(priceEl.replace(/[^\d.]/g, '')) : 0
            const img = (el.querySelector('img') as HTMLImageElement | null)?.src ?? ''
            if (name && price > 0) items.push({ name, price, img })
          })
          return items
        })
        for (const p of domProducts) {
          products.push({
            name: p.name,
            brand: '',
            category: 'personal-care',
            imageUrl: p.img,
            unitType: 'each',
            price: p.price,
            currency: 'MYR',
            quantity: 1,
            unit: 'each',
            storeName: 'Watson JB',
            dateObserved: today,
          })
        }
      } catch {}
    }

    for (const item of captured) {
      try {
        const price = item.price?.value ?? item.priceValue ?? 0
        if (!price || price <= 0) continue
        const name = (item.name ?? item.summary ?? '').trim()
        if (!name) continue
        const sizeStr = item.size ?? item.packSize ?? ''
        const { quantity, unit } = parseUnit(sizeStr)
        products.push({
          name,
          brand: item.manufacturer ?? item.brand ?? '',
          category: 'personal-care',
          imageUrl: item.images?.[0]?.url ?? item.imageUrl ?? '',
          unitType: inferUnitType(unit),
          price,
          currency: 'MYR',
          quantity,
          unit,
          storeName: 'Watson JB',
          dateObserved: today,
        })
      } catch {}
    }

    await page.close()
    console.log(`[WatsonMY] "${term}": ${captured.length} via API, products so far: ${products.length}`)
    await new Promise(r => setTimeout(r, 2000))
  }

  await browser.close()
  return products
}
