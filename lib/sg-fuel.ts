// Singapore has no free official fuel-price API (unlike Malaysia's data.gov.my),
// so we scrape motorist.sg, which publishes a static per-retailer price table.
// Prices are board prices (before card discounts). We keep the cheapest retailer
// per grade as the comparison point.
const SG_FUEL_URL = 'https://www.motorist.sg/petrol-prices'
export const CACHE_KEY = 'petrol_prices_sg'

export interface SgGradePrice {
  price: number
  retailer: string
}

export interface SgFuelPrices {
  grade95: SgGradePrice
  grade98: SgGradePrice
  diesel: SgGradePrice
  source: string
  updatedAt: string
}

// Fixed order doubles as the tie-break: when several retailers share the lowest
// price for a grade, the earliest in this list wins.
const RETAILERS: { cls: string; label: string }[] = [
  { cls: 'esso', label: 'Esso' },
  { cls: 'shell', label: 'Shell' },
  { cls: 'spc', label: 'SPC' },
  { cls: 'caltex', label: 'Caltex' },
  { cls: 'sinopec', label: 'Sinopec' },
]

// The motorist.sg table anchors each grade on a bold label cell
// (`<td class="...font-weight-bold">95</td>`) and each price on a retailer-classed
// cell (`<td class="shell">$3.37</td>`; a missing price is `-`). We slice from one
// bold label to the next so we never depend on `</tr>`/`</td>` close tags, which
// HTML tables routinely omit.
function cheapestForGrade(table: string, gradeLabel: string, gradeName: string): SgGradePrice {
  const labelRe = new RegExp(`font-weight-bold">\\s*${gradeLabel}\\s*<`)
  const startMatch = labelRe.exec(table)
  if (!startMatch) throw new Error(`SG fuel: row for ${gradeName} not found`)

  const rest = table.slice(startMatch.index + startMatch[0].length)
  const nextLabel = rest.search(/font-weight-bold">/)
  const slice = nextLabel < 0 ? rest : rest.slice(0, nextLabel)

  let best: SgGradePrice | null = null
  for (const { cls, label } of RETAILERS) {
    const cell = new RegExp(`<td class="${cls}">\\s*([^<]*?)\\s*</td>`, 'i').exec(slice)
    if (!cell) continue
    const raw = cell[1].trim()
    if (!raw || raw === '-') continue
    const price = parseFloat(raw.replace(/[^0-9.]/g, ''))
    if (Number.isNaN(price)) continue
    if (best === null || price < best.price) best = { price, retailer: label }
  }

  if (best === null) throw new Error(`SG fuel: no price for ${gradeName}`)
  return best
}

export function parseMotoristHtml(html: string): SgFuelPrices {
  const start = html.indexOf('fuel_comparison_table')
  if (start < 0) throw new Error('SG fuel: price table not found')
  const after = html.slice(start)
  const end = after.indexOf('</table>')
  const table = end < 0 ? after : after.slice(0, end)

  return {
    grade95: cheapestForGrade(table, '95', 'RON95'),
    grade98: cheapestForGrade(table, '98', 'RON98'),
    diesel: cheapestForGrade(table, 'Diesel', 'diesel'),
    source: 'motorist.sg',
    updatedAt: new Date().toISOString(),
  }
}

export async function fetchSgFuelPrices(): Promise<SgFuelPrices> {
  const res = await fetch(SG_FUEL_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; sgjb-app/1.0)' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error(`motorist.sg error: ${res.status}`)
  const html = await res.text()
  return parseMotoristHtml(html)
}
