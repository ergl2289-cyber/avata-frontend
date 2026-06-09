import type { CarFileJunction } from '@/types/directus'

const BASE = import.meta.env.VITE_DIRECTUS_URL ?? ''

/**
 * Build a usable image URL from a Directus file id.
 *
 * In mock mode the file `id` is already a full external URL (real car photos),
 * so we return it as-is. With the real API the id is a UUID and we build the
 * Directus assets path. This is the only place that knows the difference.
 *
 * `width` (optional) requests a downscaled WebP from Directus on the fly —
 * full-resolution phone photos (2–5 MB) become tens of KB, which is the single
 * biggest win for feed/scroll smoothness. Aspect ratio is preserved (no `fit`);
 * cropping is done by CSS `object-cover`. External/data URLs can't be
 * transformed and pass through untouched.
 */
export function assetUrl(
  fileId: string | null | undefined,
  width?: number,
  quality = 68,
): string {
  if (!fileId) return ''
  // mock mode: full external URLs and inline data: URLs (draft photos) pass through
  if (/^(https?:\/\/|data:)/i.test(fileId)) return fileId
  const url = `${BASE}/assets/${fileId}`
  if (!width) return url
  return `${url}?width=${width}&format=webp&quality=${quality}`
}

/** First photo of a car (cover thumbnail). */
export function coverUrl(files: CarFileJunction[] | null | undefined, width = 480): string {
  const first = files?.[0]?.directus_files_id?.id
  return assetUrl(first, width)
}

/** All photo URLs in order (gallery). `width` sizes them to the display context. */
export function galleryUrls(
  files: CarFileJunction[] | null | undefined,
  width = 800,
): string[] {
  return (files ?? []).map((f) => assetUrl(f.directus_files_id?.id, width)).filter(Boolean)
}
