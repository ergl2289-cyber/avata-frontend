import type { CarFileJunction } from './directus'

export type { CarFileJunction } from './directus'

/* ----------------------------------------------------------------------------
 * Reference data (nested relations as Directus returns them)
 * ------------------------------------------------------------------------- */

export interface CarBrand {
  id: number
  name: string
}

export interface CarModel {
  id: number
  name: string
  brand: CarBrand
}

export interface Region {
  id: number
  name: string
}

export interface City {
  id: number
  name: string
  region: Region | null
}

/**
 * Seller (users collection). NOTE: `phone` and `rating` exist in the DB but are
 * intentionally NOT modeled here — the frontend must never read them.
 */
export interface SellerUser {
  id: string
  tg_id: string
  username: string | null
  first_name: string
  last_name: string | null
  city: City | null
}

/* ----------------------------------------------------------------------------
 * Enums (car_technical_specs)
 * ------------------------------------------------------------------------- */

export type Transmission = 'manual' | 'automatic' | 'robot' | 'cvt'
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid'
export type DriveType = 'fwd' | 'rwd' | 'awd'

/** Listing lifecycle status (cars.moderation_status). */
export type ModerationStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export interface TechnicalSpecs {
  vehicle_category: string | null
  body_type: string | null
  engine_volume: number | null // litres, e.g. 2.0
  engine_power: number | null // hp
  transmission: Transmission | null
  fuel_type: FuelType | null
  drive_type: DriveType | null
  color: string | null
}

/* ----------------------------------------------------------------------------
 * Car — two shapes
 * ------------------------------------------------------------------------- */

/**
 * Lightweight item for the feed. Mirrors a Directus `cars` row requested with a
 * reduced `fields` set. Carries just enough to render a card:
 * title ("BMW 3 серия 2.0 AT"), year, mileage, price, city, first photo.
 */
export interface CarListItem {
  id: number
  model: CarModel
  year: number
  mileage: number
  price: number
  is_active: boolean
  date_created: string // ISO datetime (Directus system field)
  city: Pick<City, 'id' | 'name'>
  files: CarFileJunction[]
  technical_specs: Pick<
    TechnicalSpecs,
    'engine_volume' | 'transmission' | 'engine_power' | 'fuel_type' | 'drive_type' | 'body_type'
  > | null
}

/**
 * Full item for the listing screen (next stage). Mirrors a Directus `cars` row
 * with deep `fields`: full specs, description, gallery, seller.
 * `car_legal_data` is intentionally omitted (future scope).
 */
export interface CarDetail extends Omit<CarListItem, 'technical_specs' | 'city'> {
  description: string | null
  views_global: number
  likes_global: number
  moderation_status: ModerationStatus
  city: City
  seller: SellerUser
  technical_specs: TechnicalSpecs | null
}

/**
 * Lightweight item for the "My listings" screen: feed fields + lifecycle status
 * and stats. Mirrors a `cars` row of the current user with a reduced `fields` set.
 */
export interface MyCarListItem extends CarListItem {
  moderation_status: ModerationStatus
  views_global: number
  likes_global: number
}

/* ----------------------------------------------------------------------------
 * Query params (kept frontend-friendly; mapped to Directus query in services)
 * ------------------------------------------------------------------------- */

export interface CarFilters {
  brandId?: number | null
  modelId?: number | null
  yearFrom?: number | null
  yearTo?: number | null
  priceFrom?: number | null
  priceTo?: number | null
  cityId?: number | null
  regionId?: number | null
  search?: string | null
}

/** Sort options for the search-results screen. */
export type SortKey = 'date_desc' | 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc'

export interface CarListParams extends CarFilters {
  limit: number
  offset: number
  sort?: SortKey
}
