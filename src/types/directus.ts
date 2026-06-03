/**
 * Directus response envelopes & primitives.
 *
 * Every service response mirrors Directus exactly so that swapping mocks for the
 * real API (see `src/api/directus.ts`) requires zero changes in stores/components.
 *
 * - List endpoints  -> { data: T[], meta?: {...} }
 * - Single endpoints -> { data: T }
 * - Relations are nested OBJECTS (not ids)
 * - M2M file fields are arrays of junction rows
 */

export interface DirectusListResponse<T> {
  data: T[]
  meta?: {
    /** number of items matching the current filter */
    filter_count?: number
    /** total number of items in the collection */
    total_count?: number
    /** cursor for the next page (real backend). null = no more pages. */
    next_cursor?: number | null
  }
}

export interface DirectusItemResponse<T> {
  data: T
}

/** A row from the directus_files collection (only fields the frontend touches). */
export interface DirectusFile {
  id: string
  filename_download?: string
  title?: string
  width?: number
  height?: number
}

/**
 * Junction row for the cars.files M2M field.
 * Directus returns the related file nested under the related collection key.
 */
export interface CarFileJunction {
  id: number
  directus_files_id: DirectusFile
}
