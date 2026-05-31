import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCars } from '@/api/cars.service'
import type { CarListItem, SortKey } from '@/types/car'
import { useFiltersStore } from './filters'
import { useProfileStore } from './profile'

const PAGE_SIZE = 8

/**
 * Search-results feed (separate from the home grid). Combines the shared
 * brand/price/city filters with its own text query and sort order, in a
 * single-column layout.
 */
export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const sort = ref<SortKey>('date_desc')

  const items = ref<CarListItem[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const hasMore = ref(true)
  const error = ref<string | null>(null)
  const offset = ref(0)

  const filtersStore = useFiltersStore()
  const profileStore = useProfileStore()

  function params(off: number) {
    return {
      limit: PAGE_SIZE,
      offset: off,
      sort: sort.value,
      ...filtersStore.filters,
      regionId: profileStore.regionId,
      search: query.value.trim() || null,
    }
  }

  /** Reset and load the first page (on enter, new query, sort or filter change). */
  async function reload() {
    loading.value = true
    error.value = null
    offset.value = 0
    hasMore.value = true
    try {
      const res = await getCars(params(0))
      items.value = res.data
      offset.value = res.data.length
      hasMore.value = res.data.length === PAGE_SIZE
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось выполнить поиск'
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    if (loading.value || loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    try {
      const res = await getCars(params(offset.value))
      items.value = items.value.concat(res.data)
      offset.value += res.data.length
      hasMore.value = res.data.length === PAGE_SIZE
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Ошибка загрузки'
    } finally {
      loadingMore.value = false
    }
  }

  /** Set the query and reload (no-op reload still runs to reflect filters/sort). */
  function setQuery(value: string) {
    query.value = value
    return reload()
  }

  function setSort(value: SortKey) {
    if (sort.value === value) return Promise.resolve()
    sort.value = value
    return reload()
  }

  function updateLikeCount(carId: number, delta: number) {
    const item = items.value.find(i => i.id === carId)
    if (item) item.likes_global = Math.max(0, item.likes_global + delta)
  }

  return {
    query,
    sort,
    items,
    loading,
    loadingMore,
    hasMore,
    error,
    reload,
    loadMore,
    setQuery,
    setSort,
    updateLikeCount,
  }
})
