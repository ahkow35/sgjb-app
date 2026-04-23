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
  amount: number,
  from: Currency,
  to: Currency,
  rate: number
): number {
  if (from === to) return amount
  return from === 'SGD' ? amount * rate : amount / rate
}
