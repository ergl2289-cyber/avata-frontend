import { directusRequest } from './directus'
import type { CarBrand, CarModel } from '@/types/car'
import type { DirectusListResponse } from '@/types/directus'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

/**
 * Most popular car brands on the Russian market — shown first in the picker
 * (order = rough popularity). Everything else follows alphabetically. Matching
 * is by the brand name's leading token, so «LADA (ВАЗ)» still matches «LADA».
 */
const POPULAR_BRANDS_RU = [
  'LADA', 'KIA', 'HYUNDAI', 'TOYOTA', 'VOLKSWAGEN', 'NISSAN', 'RENAULT', 'SKODA',
  'MERCEDES-BENZ', 'BMW', 'FORD', 'CHEVROLET', 'MITSUBISHI', 'AUDI', 'MAZDA',
  'HONDA', 'LEXUS', 'OPEL', 'VOLVO', 'GEELY', 'CHERY', 'HAVAL', 'CHANGAN',
  'EXEED', 'OMODA', 'MOSKVICH', 'GAZ', 'UAZ', 'SUZUKI', 'SUBARU', 'INFINITI',
  'LAND ROVER', 'JEEP', 'PEUGEOT', 'CITROEN', 'SSANGYONG', 'DAEWOO', 'PORSCHE',
  'MINI', 'JAGUAR', 'CADILLAC', 'DATSUN', 'GREAT WALL', 'JETOUR', 'TANK',
  'JAC', 'FAW', 'DONGFENG', 'BAIC', 'GAC', 'VOYAH', 'ZEEKR', 'AVATR', 'BELGEE',
]

function brandRank(name: string): number {
  const n = name.trim().toUpperCase()
  for (let i = 0; i < POPULAR_BRANDS_RU.length; i++) {
    const p = POPULAR_BRANDS_RU[i]
    if (n === p || n.startsWith(p + ' ') || n.startsWith(p + '-') || n.startsWith(p + '(')) return i
  }
  return Number.MAX_SAFE_INTEGER
}

/** Popular RU brands first (by popularity), then the rest A→Я. */
export function sortBrandsPopularFirst(list: CarBrand[]): CarBrand[] {
  return [...list].sort((a, b) => {
    const ra = brandRank(a.name)
    const rb = brandRank(b.name)
    if (ra !== rb) return ra - rb
    return a.name.localeCompare(b.name, 'ru')
  })
}

export function getBrands() {
  if (USE_MOCKS) {
    return directusRequest<DirectusListResponse<CarBrand>>('/items/car_brands', {
      fields: ['id', 'name'],
    }).then((res) => ({ ...res, data: sortBrandsPopularFirst(res.data) }))
  }
  return fetch(`${API_URL}/api/references/brands`)
    .then(r => r.json())
    .then(data => ({ data: sortBrandsPopularFirst(data as CarBrand[]) }))
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
