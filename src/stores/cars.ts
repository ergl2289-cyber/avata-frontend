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
  const offset = ref(0)

  const filtersStore = useFiltersStore()
  const profileStore = useProfileStore()

  /** Reset and load the first page (called on mount and when filters change). */
  async function reload() {
    loading.value = true
    error.value = null
    offset.value = 0
    hasMore.value = true
    try {
      const res = await getCars({
        limit: PAGE_SIZE,
        offset: 0,
        ...filtersStore.filters,
        regionId: profileStore.regionId,
      } as any)
      items.value = res.data
      offset.value = res.data.length
      hasMore.value = res.data.length === PAGE_SIZE
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
        ...filtersStore.filters,
        regionId: profileStore.regionId,
      } as any)
      items.value = items.value.concat(res.data)
      offset.value += res.data.length
      hasMore.value = res.data.length === PAGE_SIZE
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

  return { items, loading, loadingMore, hasMore, error, reload, loadMore, updateLikeCount }
})
