// Phone + PIN auth helpers. Pure functions — no DB, no I/O — so they're cheap to test.
//
// The UI collects a country (SG/MY) plus a local number, which removes the need to
// guess the country from an 8-digit string. We normalise to E.164 for storage and
// lookup, accepting the common ways a user might type their number (with or without
// the country code, with or without a trunk "0", with spaces/dashes).

export type Country = 'SG' | 'MY'

const DIAL_CODE: Record<Country, string> = { SG: '65', MY: '60' }

/**
 * Validate the national significant number (country code + trunk 0 already removed).
 * - SG mobile: 8 digits starting 8 or 9.
 * - MY mobile: starts with 1, then 8–9 more digits (national number 9–10 long).
 */
function isValidNationalNumber(country: Country, digits: string): boolean {
  if (country === 'SG') return /^[89]\d{7}$/.test(digits)
  return /^1\d{8,9}$/.test(digits)
}

/**
 * Normalise a user-entered local number to E.164 (e.g. "+6591234567"), or return
 * null if it is not a valid SG/MY mobile number.
 */
export function normalizeToE164(country: Country, input: string): string | null {
  const cc = DIAL_CODE[country]
  if (!cc || !input) return null

  // Strip everything except digits (drops +, spaces, dashes, parentheses).
  let digits = input.replace(/\D/g, '')
  if (!digits) return null

  // Drop a leading country code if the user typed one.
  if (digits.startsWith(cc)) digits = digits.slice(cc.length)
  // Drop a leading trunk "0" (common in MY local format).
  digits = digits.replace(/^0+/, '')

  if (!isValidNationalNumber(country, digits)) return null
  return `+${cc}${digits}`
}

/** A login PIN is exactly 6 numeric digits. */
export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}
