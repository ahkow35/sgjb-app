export type Currency = 'SGD' | 'MYR'

export function formatSGD(amount: number): string {
  return `S$${amount.toFixed(2)}`
}

export function formatMYR(amount: number): string {
  return `RM${amount.toFixed(2)}`
}

export function format(amount: number, currency: Currency): string {
  return currency === 'SGD' ? formatSGD(amount) : formatMYR(amount)
}

/**
 * Format a per-unit price with enough decimal places to be meaningful.
 * e.g. 0.0077 → "S$0.0077", 0.046 → "S$0.05", 1.23 → "S$1.23"
 */
export function formatPerUnit(amount: number, currency: Currency): string {
  const prefix = currency === 'SGD' ? 'S$' : 'RM'
  if (amount === 0) return `${prefix}0.00`
  if (Math.abs(amount) < 0.005) return `${prefix}${amount.toFixed(4)}`
  if (Math.abs(amount) < 0.1) return `${prefix}${amount.toFixed(3)}`
  return `${prefix}${amount.toFixed(2)}`
}

/**
 * Convert amount between SGD and MYR.
 * @param rate - SGD/MYR rate (1 SGD = rate MYR)
 */
export function convert(
  amount: number | string | null | undefined,
  from: Currency,
  to: Currency,
  rate: number
): number {
  const n = Number(amount ?? 0)
  if (from === to) return n
  return from === 'SGD' ? n * rate : n / rate
}
