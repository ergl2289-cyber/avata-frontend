import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getCarsByIds } from '@/api/cars.service'
import { backend, feedItemToList } from '@/api/cars.service'
import type { CarListItem } from '@/types/car'
import { useCarsStore } from './cars'
import { useSearchStore } from './search'

const STORAGE_KEY = 'avata:favorites'
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

function load(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is number => typeof x === 'number') : []
  } catch {
    return []
  }
}

/**
 * Liked listings (car_likes). When VITE_USE_MOCKS=false, like state is persisted
 * server-side via POST /api/cars/{id}/like. Local ids array acts as a cache.
 */
export const useFavoritesStore = defineStore('favorites', () => {
  const ids = ref<number[]>(load())
  const items = ref<CarListItem[]>([])
  const loading = ref(false)

  const count = computed(() => ids.value.length)

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.value))
    } catch {
      /* storage unavailable */
    }
  }

  function isLiked(id: number): boolean {
    return ids.value.includes(id)
  }

  /** Reflect a like change on the feed/search cards (exact count, or ±1). */
  function syncFeedLike(id: number, opts: { count?: number; delta?: number }) {
    const cars = useCarsStore()
    const search = useSearchStore()
    if (opts.count != null) {
      cars.setLikeCount(id, opts.count)
      search.setLikeCount(id, opts.count)
    } else if (opts.delta) {
      cars.updateLikeCount(id, opts.delta)
      search.updateLikeCount(id, opts.delta)
    }
  }

  /** Add/remove a like locally (mock/offline mode — no backend). */
  function toggleLocal(id: number): boolean {
    if (ids.value.includes(id)) {
      ids.value = ids.value.filter((x) => x !== id)
      items.value = items.value.filter((c) => c.id !== id)
      persist()
      return false
    }
    ids.value = [id, ...ids.value]
    persist()
    return true
  }

  /** Toggle like — server-backed when real; local-only in mock mode. */
  async function toggle(id: number): Promise<boolean> {
    if (USE_MOCKS) {
      const liked = toggleLocal(id)
      syncFeedLike(id, { delta: liked ? 1 : -1 })
      return liked
    }
    const prev = isLiked(id)
    try {
      const result = await backend.toggleLike(id)
      if (result.is_liked) {
        if (!ids.value.includes(id)) {
          ids.value = [id, ...ids.value]
        }
      } else {
        ids.value = ids.value.filter((x) => x !== id)
        items.value = items.value.filter((c) => c.id !== id)
      }
      persist()
      syncFeedLike(id, { count: result.likes_count })
      return result.is_liked
    } catch {
      // On network error, toggle locally as fallback
      const nowLiked = !prev
      if (prev) {
        ids.value = ids.value.filter((x) => x !== id)
        items.value = items.value.filter((c) => c.id !== id)
      } else {
        ids.value = [id, ...ids.value]
      }
      persist()
      syncFeedLike(id, { delta: nowLiked ? 1 : -1 })
      return nowLiked
    }
  }

  /** Load full card data for all liked ids, preserving order. */
  async function loadItems() {
    loading.value = true
    try {
      const res = await getCarsByIds(ids.value)
      items.value = res.data
    } finally {
      loading.value = false
    }
  }

  /** Sync liked IDs from server — called on auth to replace localStorage state. */
  async function syncFromServer() {
    if (USE_MOCKS) return
    try {
      const result = await backend.getLikedCars()
      const serverIds = result.items.map(c => c.id)
      ids.value = serverIds
      if (result.items.length) {
        items.value = result.items.map(feedItemToList)
      }
      persist()
    } catch {
      /* server unavailable — keep current state */
    }
  }

  /** Remove a listing from favorites (used by the Favorites screen). */
  async function remove(id: number) {
    if (!USE_MOCKS) {
      try {
        const result = await backend.toggleLike(id)
        syncFeedLike(id, { count: result.likes_count })
      } catch {
        /* ignore network error — keep local state consistent */
        syncFeedLike(id, { delta: -1 })
      }
    } else {
      syncFeedLike(id, { delta: -1 })
    }
    ids.value = ids.value.filter((x) => x !== id)
    items.value = items.value.filter((c) => c.id !== id)
    persist()
  }

  return { ids, items, loading, count, isLiked, toggle, loadItems, syncFromServer, remove }
})
