import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getCarsByIds } from '@/api/cars.service'
import type { CarListItem } from '@/types/car'

const STORAGE_KEY = 'avata:favorites'

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
 * Liked listings (car_likes). Ids are kept as an ordered array (newest first)
 * and persisted locally so the like toggle works end-to-end on mocks; later this
 * moves behind a favorites.service calling Directus car_likes — the store API
 * (isLiked/toggle/count/items/load/remove) stays the same.
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
      /* storage unavailable — ignore */
    }
  }

  function isLiked(id: number): boolean {
    return ids.value.includes(id)
  }

  /** Toggle like. New likes go to the front so the favorites list shows newest first. */
  function toggle(id: number): boolean {
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
  function remove(id: number) {
    ids.value = ids.value.filter((x) => x !== id)
    items.value = items.value.filter((c) => c.id !== id)
    persist()
  }

  return { ids, items, loading, count, isLiked, toggle, loadItems, remove }
})
