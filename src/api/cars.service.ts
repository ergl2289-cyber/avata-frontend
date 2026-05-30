import { directusRequest } from './directus'
import type {
  CarDetail,
  CarListItem,
  CarListParams,
  MyCarListItem,
} from '@/types/car'
import type { DirectusItemResponse, DirectusListResponse } from '@/types/directus'

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

/** Paginated, optionally filtered feed of active listings. */
export function getCars(params: CarListParams) {
  const { limit, offset, ...filters } = params
  return directusRequest<DirectusListResponse<CarListItem>>('/items/cars', {
    fields: LIST_FIELDS,
    limit,
    offset,
    filters,
  })
}

/** Lightweight items for a set of ids, in the given order (favorites screen). */
export function getCarsByIds(ids: number[]) {
  if (!ids.length) {
    return Promise.resolve({ data: [], meta: { filter_count: 0 } } as DirectusListResponse<CarListItem>)
  }
  return directusRequest<DirectusListResponse<CarListItem>>('/items/cars', {
    fields: LIST_FIELDS,
    ids,
  })
}

/** Full listing by id. */
export function getCarById(id: number) {
  return directusRequest<DirectusItemResponse<CarDetail>>(`/items/cars/${id}`, {
    fields: DETAIL_FIELDS,
  })
}

/** Current user's own published listings (active + on moderation). */
export function getMyCars() {
  return directusRequest<DirectusListResponse<MyCarListItem>>('/items/cars', {
    fields: [...LIST_FIELDS, 'moderation_status', 'views_global', 'likes_global'],
    mine: true,
  })
}
