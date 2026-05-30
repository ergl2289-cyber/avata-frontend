import type { DriveType, FuelType, Transmission } from './car'

/**
 * In-progress data for the listing creation wizard. Mirrors the fields we'll send
 * to Directus on publish (cars + car_technical_specs). All optional so a draft can
 * be saved at any step (auto-save / "Сохранить и выйти").
 */
export interface ListingForm {
  photos: string[] // mock: data URLs; real: uploaded directus_files ids
  brandId: number | null
  modelId: number | null
  year: number | null
  mileage: number | null
  bodyType: string | null
  transmission: Transmission | null
  fuelType: FuelType | null
  driveType: DriveType | null
  engineVolume: number | null
  color: string | null
  price: number | null
  cityId: number | null
  description: string
}

/** A saved draft (Архив). Persisted in localStorage until published or deleted. */
export interface DraftListing {
  id: string // local id, e.g. "draft-1717000000000"
  updatedAt: string // ISO
  /** Derived display snapshot for the Архив card (computed on save). */
  title: string
  cover: string
  form: ListingForm
}

export function emptyListingForm(): ListingForm {
  return {
    photos: [],
    brandId: null,
    modelId: null,
    year: null,
    mileage: null,
    bodyType: null,
    transmission: null,
    fuelType: null,
    driveType: null,
    engineVolume: null,
    color: null,
    price: null,
    cityId: null,
    description: '',
  }
}
