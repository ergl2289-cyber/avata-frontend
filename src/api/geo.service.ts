import { directusRequest } from './directus'
import type { City, Region } from '@/types/car'
import type { DirectusListResponse } from '@/types/directus'

export function getCities() {
  return directusRequest<DirectusListResponse<City>>('/items/cities', {
    fields: ['id', 'name', 'region.id', 'region.name'],
  })
}

export function getRegions() {
  return directusRequest<DirectusListResponse<Region>>('/items/regions', {
    fields: ['id', 'name'],
  })
}
