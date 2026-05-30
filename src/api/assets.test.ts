import { describe, it, expect } from 'vitest'
import { assetUrl, coverUrl, galleryUrls } from './assets'
import type { CarFileJunction } from '@/types/directus'

function junction(id: string): CarFileJunction {
  return { id: 1, directus_files_id: { id } }
}

describe('assetUrl', () => {
  it('returns full external URLs as-is (mock mode)', () => {
    const url = 'https://images.unsplash.com/photo-1.jpg'
    expect(assetUrl(url)).toBe(url)
  })

  it('builds a Directus assets path for a UUID-like id', () => {
    // VITE_DIRECTUS_URL is unset in tests -> base is ''
    expect(assetUrl('abc-123')).toBe('/assets/abc-123')
  })

  it('returns empty string for nullish ids', () => {
    expect(assetUrl(null)).toBe('')
    expect(assetUrl(undefined)).toBe('')
  })
})

describe('coverUrl / galleryUrls', () => {
  const files = [junction('https://a.jpg'), junction('https://b.jpg')]

  it('coverUrl returns the first photo', () => {
    expect(coverUrl(files)).toBe('https://a.jpg')
    expect(coverUrl([])).toBe('')
    expect(coverUrl(null)).toBe('')
  })

  it('galleryUrls returns all photos in order', () => {
    expect(galleryUrls(files)).toEqual(['https://a.jpg', 'https://b.jpg'])
    expect(galleryUrls(null)).toEqual([])
  })
})
