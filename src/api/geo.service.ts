import { directusRequest } from './directus'
import type { City, Region } from '@/types/car'
import type { DirectusListResponse } from '@/types/directus'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

let _regions: Region[] | null = null

async function loadRegions(): Promise<Region[]> {
  if (_regions) return _regions
  if (!USE_MOCKS) {
    const r = await fetch(`${API_URL}/api/geo/regions`)
    _regions = await r.json()
    return _regions!
  }
  return directusRequest<DirectusListResponse<Region>>('/items/regions', { fields: ['id', 'name'] }).then(d => d.data)
}

export async function getCities() {
  if (USE_MOCKS) {
    return directusRequest<DirectusListResponse<City>>('/items/cities', {
      fields: ['id', 'name', 'region.id', 'region.name'],
    })
  }
  const [citiesRaw, regions] = await Promise.all([
    fetch(`${API_URL}/api/geo/cities`).then(r => r.json()),
    loadRegions(),
  ])
  const regionMap = new Map(regions.map(r => [r.id, r]))
  const cities: City[] = (citiesRaw as any[]).map((c: any) => ({
    id: c.id,
    name: c.name,
    region: regionMap.get(c.region) ?? null,
  }))
  return { data: cities } as DirectusListResponse<City>
}

export function getRegions() {
  if (USE_MOCKS) {
    return directusRequest<DirectusListResponse<Region>>('/items/regions', {
      fields: ['id', 'name'],
    })
  }
  return loadRegions().then(data => ({ data }))
}
