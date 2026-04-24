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
