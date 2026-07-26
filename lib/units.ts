/**
 * Canonical units that all quantity/unit pairs are normalized to before being
 * stored, so price_per_unit is comparable across rows regardless of the unit
 * a client, scraper, or user submitted it in.
 */
export const CANONICAL_UNITS = {
  weight: 'g',
  volume: 'ml',
} as const

/** Count-based units that pass through unchanged (no conversion factor). */
export const COUNT_UNITS = ['each', 'pack', 'pcs', 'tablet', 'capsule', 'sachet'] as const

/** Every unit accepted as input, before normalization. Case-insensitive. */
export const ALLOWED_UNITS = [
  'g', 'kg', 'mg', 'ml', 'L', 'l', 'cl',
  ...COUNT_UNITS,
] as const

const WEIGHT_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  mg: 1 / 1000,
}

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  cl: 10,
}

/**
 * Normalize a quantity/unit pair to its canonical form: grams for weight,
 * millilitres for volume, unchanged for count units (each, pack, etc.).
 * Unit matching is case-insensitive ('KG', 'L', 'l' all accepted).
 * Returns null if the unit isn't in the allowlist.
 */
export function normalizeQuantityUnit(
  quantity: number,
  unit: string,
): { quantity: number; unit: string } | null {
  const u = unit.trim().toLowerCase()

  if ((COUNT_UNITS as readonly string[]).includes(u)) {
    return { quantity, unit: u }
  }
  if (u in WEIGHT_TO_GRAMS) {
    return { quantity: quantity * WEIGHT_TO_GRAMS[u], unit: CANONICAL_UNITS.weight }
  }
  if (u in VOLUME_TO_ML) {
    return { quantity: quantity * VOLUME_TO_ML[u], unit: CANONICAL_UNITS.volume }
  }
  return null
}

/** Trim trailing zeros from a decimal string, e.g. '1.500' → '1.5', '2.0' → '2'. */
function trimTrailingZeros(n: number): string {
  return n.toFixed(3).replace(/\.?0+$/, '')
}

/**
 * Render a canonical quantity/unit pair back to a human-friendly display
 * string. Weight/volume quantities at or above 1000 are shown in the larger
 * unit (kg / L) with trailing zeros trimmed, e.g. 1500 g → '1.5 kg'.
 * Count units are rendered as-is, e.g. 6 'pack' → '6 pack'.
 */
export function formatQuantityUnit(quantity: number | string, unit: string): string {
  const n = Number(quantity)
  const u = unit.trim().toLowerCase()

  if (u === CANONICAL_UNITS.weight) {
    return n >= 1000 ? `${trimTrailingZeros(n / 1000)} kg` : `${trimTrailingZeros(n)} g`
  }
  if (u === CANONICAL_UNITS.volume) {
    return n >= 1000 ? `${trimTrailingZeros(n / 1000)} L` : `${trimTrailingZeros(n)} ml`
  }
  return `${trimTrailingZeros(n)} ${unit}`
}
