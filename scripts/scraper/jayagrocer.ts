import type { ScrapedProduct } from './types'

// Jaya Grocer's online store is plain Shopify — /products.json is public,
// paginated JSON, no browser needed. NOTE: this is their KL online store
// (vendor: "TRENDCELL SDN BHD | Online Store KL"), so prices are Klang
// Valley, not JB — the store row is named "Jaya Grocer (KL)" to keep that
// honest in the UI.
const BASE = 'https://www.jayagrocer.com/products.json'
const PAGE_SIZE = 250
const MAX_PAGES = 40 // hard cap ≈ 10k products; loop stops earlier on an empty page
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

interface ShopifyVariant {
  price: string
  available: boolean
}

interface ShopifyProduct {
  title: string
  product_type: string
  vendor: string
  images: { src: string }[]
  variants: ShopifyVariant[]
}

function inferUnitType(unit: string): 'weight' | 'each' | 'volume' {
  const u = unit.toLowerCase()
  if (/^(g|kg|gram)$/.test(u)) return 'weight'
  if (/^(ml|l|litre|liter)$/.test(u)) return 'volume'
  return 'each'
}

const UNIT_ALIASES: Record<string, string> = {
  pc: 'each',
  piece: 'each',
  pkt: 'pack',
  packet: 'pack',
  litre: 'l',
  liter: 'l',
}

// Pack size lives in the product title, e.g. "Winter Dates Fresh (China) 250g",
// "Farm Fresh UHT Milk 6 x 200ml", "Envy Apple (New Zealand) 2pcs/pack".
export function parseTitleUnit(title: string): { quantity: number; unit: string } {
  const multi = title.match(/(\d+)\s*x\s*([\d.]+)\s*(kg|g|ml|l|litre|liter)\b/i)
  if (multi) {
    return {
      quantity: Number(multi[1]) * Number(multi[2]),
      unit: multi[3].toLowerCase(),
    }
  }
  // take the LAST size-looking token in the title
  const re = /([\d.]+)\s*(kg|g|ml|l|litre|liter|pcs|pc|pack|pkt)\b/gi
  let last: RegExpExecArray | null = null
  for (let m = re.exec(title); m !== null; m = re.exec(title)) last = m
  if (last) {
    const unit = last[2].toLowerCase()
    return { quantity: Number(last[1]), unit: UNIT_ALIASES[unit] ?? unit }
  }
  return { quantity: 1, unit: 'each' }
}

export async function scrapeJayaGrocer(): Promise<ScrapedProduct[]> {
  const products: ScrapedProduct[] = []
  const today = new Date().toISOString().split('T')[0]

  for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
    let batch: ShopifyProduct[]
    try {
      const res = await fetch(`${BASE}?limit=${PAGE_SIZE}&page=${pageNum}`, {
        headers: { 'User-Agent': USER_AGENT },
      })
      if (!res.ok) {
        console.warn(`[JayaGrocer] page ${pageNum} returned ${res.status} — stopping`)
        break
      }
      batch = (await res.json())?.products ?? []
    } catch (e) {
      console.warn(`[JayaGrocer] page ${pageNum} fetch failed: ${e} — stopping`)
      break
    }

    if (batch.length === 0) break

    for (const item of batch) {
      try {
        const variant = item.variants?.[0]
        const price = Number(variant?.price)
        if (!item.title || !variant?.available || !price || price <= 0) continue

        const { quantity, unit } = parseTitleUnit(item.title)

        products.push({
          name: item.title.trim(),
          brand: '',
          category: item.product_type ?? '',
          imageUrl: item.images?.[0]?.src ?? '',
          unitType: inferUnitType(unit),
          barcode: undefined, // Shopify's public feed does not expose barcodes
          price,
          currency: 'MYR',
          quantity,
          unit,
          storeName: 'Jaya Grocer (KL)',
          dateObserved: today,
        })
      } catch {}
    }

    console.log(`[JayaGrocer] page ${pageNum}: ${batch.length} products`)
    if (batch.length < PAGE_SIZE) break
    // Be respectful — small delay between pages
    await new Promise((r) => setTimeout(r, 1000))
  }

  return products
}
