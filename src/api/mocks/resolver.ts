import type {
  CarDetail,
  CarFilters,
  CarListItem,
  MyCarListItem,
} from '@/types/car'
import type { DirectusItemResponse, DirectusListResponse } from '@/types/directus'
import { carsMock } from './cars.mock'
import { myCarsMock } from './myCars.mock'
import { brandsMock, modelsMock } from './brands.mock'
import { citiesMock, regionsMock } from './geo.mock'

export interface MockParams {
  limit?: number
  offset?: number
  filters?: CarFilters
  brandId?: number | null
  /** Fetch specific cars by id, preserving the given order (favorites). */
  ids?: number[]
  /** Fetch the current user's own listings (My listings screen). */
  mine?: boolean
}

/** Simulated network latency so loading/skeleton states are exercised. */
function delay<T>(value: T, ms = 320): Promise<T> {
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
        }
      : null,
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
    const car = carsMock.find((c) => c.id === id)
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
    const filtered = carsMock.filter((c) => c.is_active && matchesFilters(c, filters))
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
