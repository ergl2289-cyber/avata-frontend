import type { CarFileJunction } from '@/types/directus'

const BASE = import.meta.env.VITE_DIRECTUS_URL ?? ''

/**
 * Build a usable image URL from a Directus file id.
 *
 * In mock mode the file `id` is already a full external URL (real car photos),
 * so we return it as-is. With the real API the id is a UUID and we build the
 * Directus assets path. This is the only place that knows the difference.
 */
export function assetUrl(fileId: string | null | undefined): string {
  if (!fileId) return ''
  // mock mode: full external URLs and inline data: URLs (draft photos) pass through
  if (/^(https?:\/\/|data:)/i.test(fileId)) return fileId
  return `${BASE}/assets/${fileId}`
}

/** First photo of a car (cover), or '' when there are none. */
export function coverUrl(files: CarFileJunction[] | null | undefined): string {
  const first = files?.[0]?.directus_files_id?.id
  return assetUrl(first)
}

/** All photo URLs in order (gallery). */
export function galleryUrls(files: CarFileJunction[] | null | undefined): string[] {
  return (files ?? []).map((f) => assetUrl(f.directus_files_id?.id)).filter(Boolean)
}
