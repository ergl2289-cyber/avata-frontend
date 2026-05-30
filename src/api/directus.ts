import { mockResolver, type MockParams } from './mocks/resolver'

/**
 * ★ SINGLE SWAP POINT (mock ↔ real Directus).
 *
 * Every data service goes through `directusRequest`. While the backend (Igor)
 * is not ready, requests resolve from in-memory mocks shaped exactly like
 * Directus responses. To go live: set VITE_USE_MOCKS=false in `.env` — nothing
 * in stores/components changes.
 */

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'
const BASE = import.meta.env.VITE_DIRECTUS_URL ?? ''

export interface RequestParams extends MockParams {
  /** Directus `fields` selection (used by the real API only). */
  fields?: string[]
}

/** Map our friendly params to Directus query string (real API path). */
function buildQuery(params: RequestParams): string {
  const sp = new URLSearchParams()
  if (params.fields?.length) sp.set('fields', params.fields.join(','))
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.offset != null) sp.set('offset', String(params.offset))
  if (params.sort) {
    // Map our sort keys to Directus `sort` field syntax ("-" = descending).
    const SORT_MAP: Record<string, string> = {
      date_desc: '-date_created',
      price_asc: 'price',
      price_desc: '-price',
      year_desc: '-year',
      mileage_asc: 'mileage',
    }
    const mapped = SORT_MAP[params.sort]
    if (mapped) sp.set('sort', mapped)
  }

  const f = params.filters
  if (f) {
    // Directus filter syntax. Field names may be tuned once the backend lands.
    if (f.brandId != null) sp.set('filter[model][brand][_eq]', String(f.brandId))
    if (f.modelId != null) sp.set('filter[model][_eq]', String(f.modelId))
    if (f.yearFrom != null) sp.set('filter[year][_gte]', String(f.yearFrom))
    if (f.yearTo != null) sp.set('filter[year][_lte]', String(f.yearTo))
    if (f.priceFrom != null) sp.set('filter[price][_gte]', String(f.priceFrom))
    if (f.priceTo != null) sp.set('filter[price][_lte]', String(f.priceTo))
    if (f.cityId != null) sp.set('filter[city][_eq]', String(f.cityId))
    if (f.search) sp.set('search', f.search)
  }
  if (params.brandId != null) sp.set('filter[brand][_eq]', String(params.brandId))
  if (params.ids?.length) sp.set('filter[id][_in]', params.ids.join(','))
  // "My listings": backend scopes by the authenticated Telegram user (initData).
  // Field path is provisional — Igor to confirm how seller maps to the session.
  if (params.mine) sp.set('filter[seller][tg_id][_eq]', '$CURRENT_USER')

  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

export async function directusRequest<T>(path: string, params: RequestParams = {}): Promise<T> {
  if (USE_MOCKS) {
    return mockResolver<T>(path, params)
  }

  const res = await fetch(`${BASE}${path}${buildQuery(params)}`, {
    headers: {
      'Content-Type': 'application/json',
      // Telegram initData is forwarded by the backend layer; no secrets here.
    },
  })
  if (!res.ok) throw new Error(`Directus request failed: ${res.status} ${path}`)
  return res.json() as Promise<T>
}
