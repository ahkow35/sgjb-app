export const STORE_COUNTRIES = new Set(['SG', 'MY'])
export const STORE_TYPES = new Set(['supermarket', 'pharmacy', 'petrol'])

export interface StoreFields {
  name?: string
  country?: 'SG' | 'MY'
  type?: 'supermarket' | 'pharmacy' | 'petrol'
  city?: string
  url?: string
}

type ValidationResult = { error: string } | { values: StoreFields }

/**
 * Validates the store fields present in `body`. `requireAll` controls
 * whether name/country/type must be present (POST) or may be omitted for a
 * partial update (PATCH) — fields that are present are always validated.
 */
export function validateStoreFields(body: Record<string, unknown>, requireAll: boolean): ValidationResult {
  const values: StoreFields = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.trim().length > 100) {
      return { error: 'name must be 1-100 characters' }
    }
    values.name = body.name.trim()
  } else if (requireAll) {
    return { error: 'name is required' }
  }

  if (body.country !== undefined) {
    if (typeof body.country !== 'string' || !STORE_COUNTRIES.has(body.country)) {
      return { error: 'country must be SG or MY' }
    }
    values.country = body.country as 'SG' | 'MY'
  } else if (requireAll) {
    return { error: 'country is required' }
  }

  if (body.type !== undefined) {
    if (typeof body.type !== 'string' || !STORE_TYPES.has(body.type)) {
      return { error: 'type must be supermarket, pharmacy, or petrol' }
    }
    values.type = body.type as 'supermarket' | 'pharmacy' | 'petrol'
  } else if (requireAll) {
    return { error: 'type is required' }
  }

  if (body.city !== undefined && body.city !== null) {
    if (typeof body.city !== 'string' || body.city.length > 100) {
      return { error: 'city must be 100 characters or fewer' }
    }
    values.city = body.city.trim()
  }

  if (body.url !== undefined && body.url !== null && body.url !== '') {
    if (typeof body.url !== 'string' || body.url.length > 200 || !body.url.startsWith('https://')) {
      return { error: 'url must start with https:// and be 200 characters or fewer' }
    }
    values.url = body.url.trim()
  } else if (body.url === '') {
    values.url = ''
  }

  return { values }
}
