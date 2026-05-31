import { directusRequest } from './directus'
import * as backend from './backend'
import type {
  CarDetail,
  CarListItem,
  CarListParams,
  MyCarListItem,
} from '@/types/car'
import type { DirectusItemResponse, DirectusListResponse } from '@/types/directus'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

/** Reduced field set for the feed (lightweight CarListItem). */
const LIST_FIELDS = [
  'id',
  'year',
  'mileage',
  'price',
  'is_active',
  'date_created',
  'model.id',
  'model.name',
  'model.brand.id',
  'model.brand.name',
  'city.id',
  'city.name',
  'files.id',
  'files.directus_files_id.id',
  'technical_specs.engine_volume',
  'technical_specs.transmission',
  'technical_specs.engine_power',
  'technical_specs.fuel_type',
  'technical_specs.drive_type',
  'technical_specs.body_type',
]

/** Deep field set for the listing screen (full CarDetail). */
const DETAIL_FIELDS = [
  '*',
  'model.id',
  'model.name',
  'model.brand.id',
  'model.brand.name',
  'city.id',
  'city.name',
  'city.region.id',
  'city.region.name',
  'seller.id',
  'seller.tg_id',
  'seller.username',
  'seller.first_name',
  'seller.last_name',
  'files.id',
  'files.directus_files_id.id',
  'technical_specs.*',
]

/* ------------------------------------------------------------------
 * Backend → Directus shape mappers
 * ------------------------------------------------------------------ */

function feedItemToList(f: backend.CarListFeedItem): CarListItem {
  return {
    id: f.id,
    year: f.year,
    mileage: f.mileage,
    price: f.price,
    is_active: true,
    date_created: f.date_created,
    model: { id: 0, name: f.model_name, brand: { id: 0, name: f.brand_name } },
    city: { id: 0, name: f.city_name },
    // Map the (eventual) cover URL into the M2M file shape the UI expects.
    files: f.first_photo_url
      ? [{ id: 0, directus_files_id: { id: f.first_photo_url } }]
      : [],
    // The backend feed doesn't carry technical specs yet (see INTEGRATION.md).
    technical_specs: null,
  }
}

function detailToCarDetail(d: backend.CarDetailResponse): CarDetail {
  const seller: CarDetail['seller'] = d.seller
    ? {
        id: String(d.seller.id),
        tg_id: '',
        username: d.seller.username,
        first_name: d.seller.first_name ?? '',
        last_name: d.seller.last_name,
        city: null,
      }
    : {
        id: '',
        tg_id: '',
        username: null,
        first_name: '',
        last_name: null,
        city: null,
      }
  return {
    id: d.id,
    year: d.year,
    mileage: d.mileage,
    price: d.price,
    is_active: d.is_active,
    date_created: d.date_created,
    model: { id: 0, name: d.model_name, brand: { id: 0, name: d.brand_name } },
    city: { id: 0, name: d.city_name, region: d.region_id ? { id: d.region_id, name: '' } : null },
    files: d.photos?.map((p: backend.PhotoInfo) => ({
      id: 0,
      directus_files_id: { id: p.id, filename_download: '', title: '', width: 0, height: 0 },
    })) ?? [],
    description: d.description,
    views_global: d.views_global,
    likes_global: d.likes_global,
    moderation_status: d.moderation_status as 'approved' | 'pending' | 'rejected' | 'draft',
    seller,
    technical_specs: d.technical
      ? {
          vehicle_category: d.technical.vehicle_category_name,
          body_type: d.technical.body_type_name,
          engine_volume: d.technical.engine_volume,
          engine_power: d.technical.engine_power,
          transmission: d.technical.transmission as 'manual' | 'automatic' | 'robot' | 'cvt' | null,
          fuel_type: d.technical.fuel_type as 'petrol' | 'diesel' | 'electric' | 'hybrid' | null,
          drive_type: d.technical.drive_type as 'fwd' | 'rwd' | 'awd' | null,
          color: d.technical.color,
        }
      : null,
  }
}

/* ------------------------------------------------------------------
 * Feed: paginated, optionally filtered (and sorted).
 * ------------------------------------------------------------------ */

export function getCars(params: CarListParams) {
  if (!USE_MOCKS) {
    return getCarsBackend(params)
  }
  const { limit, offset, sort, ...filters } = params
  return directusRequest<DirectusListResponse<CarListItem>>('/items/cars', {
    fields: LIST_FIELDS,
    limit,
    offset,
    sort,
    filters,
  })
}

async function getCarsBackend(params: CarListParams) {
  const { limit, sort, ...filters } = params
  const result = await backend.getCarsFeed({
    brand_id: filters.brandId,
    model_id: filters.modelId,
    year_min: filters.yearFrom,
    year_max: filters.yearTo,
    price_min: filters.priceFrom,
    price_max: filters.priceTo,
    city_id: filters.cityId,
    region_id: (filters as any).regionId,
    sort_by: sort,
    limit,
  })
  const items = result.items.map(feedItemToList)
  return {
    data: items,
    meta: { filter_count: items.length },
  } as DirectusListResponse<CarListItem>
}

/* ------------------------------------------------------------------
 * Similar listings (detail screen): other cars of the same brand.
 * ------------------------------------------------------------------ */

export function getSimilarCars(brandId: number, limit = 8) {
  if (!USE_MOCKS) {
    return getSimilarCarsBackend(brandId, limit)
  }
  return directusRequest<DirectusListResponse<CarListItem>>('/items/cars', {
    fields: LIST_FIELDS,
    limit,
    offset: 0,
    filters: { brandId },
  })
}

async function getSimilarCarsBackend(brandId: number, limit: number) {
  const result = await backend.getCarsFeed({ brand_id: brandId, limit })
  const items = result.items.map(feedItemToList)
  return {
    data: items,
    meta: { filter_count: items.length },
  } as DirectusListResponse<CarListItem>
}

/* ------------------------------------------------------------------
 * Lightweight items for a set of ids (favorites screen).
 * ------------------------------------------------------------------ */

export function getCarsByIds(ids: number[]) {
  if (!USE_MOCKS) {
    return getCarsByIdsBackend(ids)
  }
  if (!ids.length) {
    return Promise.resolve({ data: [], meta: { filter_count: 0 } } as DirectusListResponse<CarListItem>)
  }
  return directusRequest<DirectusListResponse<CarListItem>>('/items/cars', {
    fields: LIST_FIELDS,
    ids,
  })
}

async function getCarsByIdsBackend(ids: number[]) {
  if (!ids.length) {
    return { data: [], meta: { filter_count: 0 } } as DirectusListResponse<CarListItem>
  }
  // Fetch liked cars from backend; preserve the requested (favorites) order.
  const result = await backend.getLikedCars()
  const order = new Map(ids.map((id, i) => [id, i]))
  const items = result.items
    .filter((c) => order.has(c.id))
    .sort((a, b) => order.get(a.id)! - order.get(b.id)!)
    .map(feedItemToList)
  return {
    data: items,
    meta: { filter_count: items.length },
  } as DirectusListResponse<CarListItem>
}

/* ------------------------------------------------------------------
 * Full listing by id.
 * ------------------------------------------------------------------ */

export function getCarById(id: number) {
  if (!USE_MOCKS) {
    return getCarByIdBackend(id)
  }
  return directusRequest<DirectusItemResponse<CarDetail>>(`/items/cars/${id}`, {
    fields: DETAIL_FIELDS,
  })
}

async function getCarByIdBackend(id: number) {
  const result = await backend.getCarDetail(id)
  return {
    data: detailToCarDetail(result),
  } as DirectusItemResponse<CarDetail>
}

/* ------------------------------------------------------------------
 * Current user's own published listings.
 * ------------------------------------------------------------------ */

export function getMyCars() {
  if (!USE_MOCKS) {
    return getMyCarsBackend()
  }
  return directusRequest<DirectusListResponse<MyCarListItem>>('/items/cars', {
    fields: [...LIST_FIELDS, 'moderation_status', 'views_global', 'likes_global'],
    mine: true,
  })
}

async function getMyCarsBackend() {
  const result = await backend.getMyCars()
  const items: MyCarListItem[] = result.items.map((f) => ({
    ...feedItemToList(f),
    moderation_status: (f.moderation_status || 'pending') as 'approved' | 'pending' | 'rejected' | 'draft',
    views_global: f.views_global,
    likes_global: f.likes_global,
  }))
  return {
    data: items,
    meta: { filter_count: items.length },
  } as DirectusListResponse<MyCarListItem>
}

/* ------------------------------------------------------------------
 * Re-exports for stores that call backend directly
 * ------------------------------------------------------------------ */

export { backend }
