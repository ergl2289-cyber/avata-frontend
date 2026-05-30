import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getCarsByIds } from '@/api/cars.service'
import { backend } from '@/api/cars.service'
import type { CarListItem } from '@/types/car'

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
    if (USE_MOCKS) return toggleLocal(id)
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
      return result.is_liked
    } catch {
      // On network error, toggle locally as fallback
      if (prev) {
        ids.value = ids.value.filter((x) => x !== id)
        items.value = items.value.filter((c) => c.id !== id)
        persist()
        return false
      }
      ids.value = [id, ...ids.value]
      persist()
      return true
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

  /** Remove a listing from favorites (used by the Favorites screen). */
  async function remove(id: number) {
    if (!USE_MOCKS) {
      try {
        await backend.toggleLike(id)
      } catch {
        /* ignore network error — keep local state consistent */
      }
    }
    ids.value = ids.value.filter((x) => x !== id)
    items.value = items.value.filter((c) => c.id !== id)
    persist()
  }

  return { ids, items, loading, count, isLiked, toggle, loadItems, remove }
})
