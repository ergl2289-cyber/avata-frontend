import type { CarDetail } from '@/types/car'

/**
 * Tiny in-memory cache for car detail, so re-opening a listing (back from a
 * "similar" card, etc.) is instant. Invalidated when the owner edits a listing.
 * Session-scoped — cleared on full reload.
 */
const detailCache = new Map<number, CarDetail>()

export function getCachedCar(id: number): CarDetail | undefined {
  return detailCache.get(id)
}

export function setCachedCar(car: CarDetail): void {
  detailCache.set(car.id, car)
}

export function invalidateCar(id: number): void {
  detailCache.delete(id)
}
