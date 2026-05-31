import { directusRequest } from './directus'
import type { CarBrand, CarModel } from '@/types/car'
import type { DirectusListResponse } from '@/types/directus'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

export function getBrands() {
  if (USE_MOCKS) {
    return directusRequest<DirectusListResponse<CarBrand>>('/items/car_brands', {
      fields: ['id', 'name'],
    })
  }
  return fetch(`${API_URL}/api/references/brands`)
    .then(r => r.json())
    .then(data => ({ data: data as CarBrand[] }))
}

/** Models, optionally narrowed to a single brand (for the filter sheet). */
export function getModels(brandId?: number | null) {
  if (USE_MOCKS) {
    return directusRequest<DirectusListResponse<CarModel>>('/items/car_models', {
      fields: ['id', 'name', 'brand.id', 'brand.name'],
      brandId: brandId ?? null,
    })
  }
  const params = brandId ? `?brand_id=${brandId}` : ''
  return fetch(`${API_URL}/api/references/models${params}`)
    .then(r => r.json())
    .then(data => ({ data: (data as any[]).map((m: any) => ({
      id: m.id, name: m.name, brand: { id: m.brand, name: '' }
    })) } as DirectusListResponse<CarModel>))
}
