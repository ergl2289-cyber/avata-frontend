import type {
  CarDetail,
  CarFilters,
  CarListItem,
  MyCarListItem,
  SortKey,
} from '@/types/car'
import type { DirectusItemResponse, DirectusListResponse } from '@/types/directus'
import { carsMock } from './cars.mock'
import { myCarsMock } from './myCars.mock'
import { brandsMock, modelsMock } from './brands.mock'
import { citiesMock, regionsMock } from './geo.mock'

export interface MockParams {
  limit?: number
  offset?: number
  sort?: SortKey
  filters?: CarFilters
  brandId?: number | null
  /** Fetch specific cars by id, preserving the given order (favorites). */
  ids?: number[]
  /** Fetch the current user's own listings (My listings screen). */
  mine?: boolean
}

/**
 * Simulated network latency so loading/skeleton states are exercised. Kept small
 * for snappy dev navigation; override with VITE_MOCK_DELAY (ms) if you want to
 * stress-test slow-network skeletons. The real Directus backend has none of this.
 */
const MOCK_DELAY = Number(import.meta.env.VITE_MOCK_DELAY ?? 120)
function delay<T>(value: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** Project a full CarDetail into the lightweight feed shape (mimics Directus `fields`). */
function toListItem(c: CarDetail): CarListItem {
  return {
    id: c.id,
    model: c.model,
    year: c.year,
    mileage: c.mileage,
    price: c.price,
    is_active: c.is_active,
    date_created: c.date_created,
    city: { id: c.city.id, name: c.city.name },
    files: c.files,
    technical_specs: c.technical_specs
      ? {
          engine_volume: c.technical_specs.engine_volume,
          transmission: c.technical_specs.transmission,
          engine_power: c.technical_specs.engine_power,
          fuel_type: c.technical_specs.fuel_type,
          drive_type: c.technical_specs.drive_type,
          body_type: c.technical_specs.body_type,
        }
      : null,
  }
}

/** Sort a filtered list in place per the chosen key (mirrors Directus `sort`). */
function sortCars(list: CarDetail[], sort: SortKey | undefined): CarDetail[] {
  if (!sort) return list
  const by = [...list]
  switch (sort) {
    case 'price_asc':
      return by.sort((a, b) => a.price - b.price)
    case 'price_desc':
      return by.sort((a, b) => b.price - a.price)
    case 'year_desc':
      return by.sort((a, b) => b.year - a.year)
    case 'mileage_asc':
      return by.sort((a, b) => a.mileage - b.mileage)
    case 'date_desc':
      return by.sort((a, b) => +new Date(b.date_created) - +new Date(a.date_created))
    default:
      return by
  }
}

function matchesFilters(c: CarDetail, f: CarFilters): boolean {
  if (f.brandId != null && c.model.brand.id !== f.brandId) return false
  if (f.modelId != null && c.model.id !== f.modelId) return false
  if (f.yearFrom != null && c.year < f.yearFrom) return false
  if (f.yearTo != null && c.year > f.yearTo) return false
  if (f.priceFrom != null && c.price < f.priceFrom) return false
  if (f.priceTo != null && c.price > f.priceTo) return false
  if (f.cityId != null && c.city.id !== f.cityId) return false
  if (f.search) {
    const title = `${c.model.brand.name} ${c.model.name}`.toLowerCase()
    if (!title.includes(f.search.trim().toLowerCase())) return false
  }
  return true
}

/**
 * Resolves a Directus-style path to a Directus-shaped response, in-memory.
 * Mirrors what the real API returns so callers never change when we flip
 * VITE_USE_MOCKS=false.
 */
export function mockResolver<T>(path: string, params: MockParams = {}): Promise<T> {
  // /items/cars/:id
  const detailMatch = path.match(/^\/items\/cars\/(\d+)$/)
  if (detailMatch) {
    const id = Number(detailMatch[1])
    // The current user's own listings (incl. freshly published) live in myCarsMock;
    // the public catalogue in carsMock. Detail resolves from either.
    const car = carsMock.find((c) => c.id === id) ?? myCarsMock.find((c) => c.id === id)
    if (!car) return Promise.reject(new Error(`Car ${id} not found`))
    return delay({ data: car } as DirectusItemResponse<CarDetail>) as Promise<T>
  }

  // /items/cars (feed)
  if (path === '/items/cars') {
    // My listings: current user's own cars with status + stats.
    if (params.mine) {
      const mine: MyCarListItem[] = myCarsMock.map((c) => ({
        ...toListItem(c),
        moderation_status: c.moderation_status,
        views_global: c.views_global,
        likes_global: c.likes_global,
      }))
      return delay({
        data: mine,
        meta: { filter_count: mine.length },
      } as DirectusListResponse<MyCarListItem>) as Promise<T>
    }

    // Fetch-by-ids (favorites): preserve the requested order, skip pagination.
    if (params.ids) {
      const page = params.ids
        .map((id) => carsMock.find((c) => c.id === id))
        .filter((c): c is CarDetail => Boolean(c))
        .map(toListItem)
      return delay({
        data: page,
        meta: { filter_count: page.length },
      } as DirectusListResponse<CarListItem>) as Promise<T>
    }

    const filters = params.filters ?? {}
    const filtered = sortCars(
      carsMock.filter((c) => c.is_active && matchesFilters(c, filters)),
      params.sort,
    )
    const offset = params.offset ?? 0
    const limit = params.limit ?? 10
    const page = filtered.slice(offset, offset + limit).map(toListItem)
    return delay({
      data: page,
      meta: { filter_count: filtered.length },
    } as DirectusListResponse<CarListItem>) as Promise<T>
  }

  // reference collections
  if (path === '/items/cities') {
    return delay({ data: citiesMock } as DirectusListResponse<unknown>) as Promise<T>
  }
  if (path === '/items/regions') {
    return delay({ data: regionsMock } as DirectusListResponse<unknown>) as Promise<T>
  }
  if (path === '/items/car_brands') {
    return delay({ data: brandsMock } as DirectusListResponse<unknown>) as Promise<T>
  }
  if (path === '/items/car_models') {
    const list =
      params.brandId != null
        ? modelsMock.filter((m) => m.brand.id === params.brandId)
        : modelsMock
    return delay({ data: list } as DirectusListResponse<unknown>) as Promise<T>
  }

  return Promise.reject(new Error(`No mock handler for path: ${path}`))
}
