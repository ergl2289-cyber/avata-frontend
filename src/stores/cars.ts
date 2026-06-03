import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCars } from '@/api/cars.service'
import type { CarListItem } from '@/types/car'
import { useFiltersStore } from './filters'
import { useProfileStore } from './profile'

const PAGE_SIZE = 8

/** Feed state: list, pagination, loading flags. Powers the infinite scroll. */
export const useCarsStore = defineStore('cars', () => {
  const items = ref<CarListItem[]>([])
  const loading = ref(false) // first page / reload
  const loadingMore = ref(false) // subsequent pages
  const hasMore = ref(true)
  const error = ref<string | null>(null)
  const offset = ref(0) // mock pagination
  const cursor = ref<number | null>(null) // real backend pagination

  const filtersStore = useFiltersStore()
  const profileStore = useProfileStore()

  /**
   * Advance pagination state from a response. Real backend → cursor (meta carries
   * `next_cursor`); mock → offset + "full page" heuristic.
   */
  function advance(res: Awaited<ReturnType<typeof getCars>>) {
    offset.value = items.value.length
    if (res.meta && 'next_cursor' in res.meta) {
      cursor.value = res.meta.next_cursor ?? null
      hasMore.value = res.meta.next_cursor != null
    } else {
      hasMore.value = res.data.length === PAGE_SIZE
    }
  }

  /** Reset and load the first page (called on mount and when filters change). */
  async function reload() {
    loading.value = true
    error.value = null
    offset.value = 0
    cursor.value = null
    hasMore.value = true
    try {
      const res = await getCars({
        limit: PAGE_SIZE,
        offset: 0,
        cursor: null,
        ...filtersStore.filters,
        regionId: profileStore.regionId,
      } as any)
      items.value = res.data
      advance(res)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить ленту'
    } finally {
      loading.value = false
    }
  }

  /** Append the next page (called by the infinite-scroll sentinel). */
  async function loadMore() {
    if (loading.value || loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    try {
      const res = await getCars({
        limit: PAGE_SIZE,
        offset: offset.value,
        cursor: cursor.value,
        ...filtersStore.filters,
        regionId: profileStore.regionId,
      } as any)
      items.value = items.value.concat(res.data)
      advance(res)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Ошибка загрузки'
    } finally {
      loadingMore.value = false
    }
  }

  function updateLikeCount(carId: number, delta: number) {
    const item = items.value.find(i => i.id === carId)
    if (item) item.likes_global = Math.max(0, item.likes_global + delta)
  }

  /** Set an exact like count on a feed card (from the backend's likes_count). */
  function setLikeCount(carId: number, count: number) {
    const item = items.value.find((i) => i.id === carId)
    if (item) item.likes_global = Math.max(0, count)
  }

  return { items, loading, loadingMore, hasMore, error, reload, loadMore, updateLikeCount, setLikeCount }
})
