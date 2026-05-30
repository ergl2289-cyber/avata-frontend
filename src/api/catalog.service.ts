import { directusRequest } from './directus'
import type { CarBrand, CarModel } from '@/types/car'
import type { DirectusListResponse } from '@/types/directus'

export function getBrands() {
  return directusRequest<DirectusListResponse<CarBrand>>('/items/car_brands', {
    fields: ['id', 'name'],
  })
}

/** Models, optionally narrowed to a single brand (for the filter sheet). */
export function getModels(brandId?: number | null) {
  return directusRequest<DirectusListResponse<CarModel>>('/items/car_models', {
    fields: ['id', 'name', 'brand.id', 'brand.name'],
    brandId: brandId ?? null,
  })
}
