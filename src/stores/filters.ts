import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { CarFilters } from '@/types/car'

const EMPTY: CarFilters = {
  brandId: null,
  modelId: null,
  yearFrom: null,
  yearTo: null,
  priceFrom: null,
  priceTo: null,
  cityId: null,
  search: null,
}

/** Active feed filters (driven by the search bar + filter bottom sheet). */
export const useFiltersStore = defineStore('filters', () => {
  const filters = ref<CarFilters>({ ...EMPTY })

  const activeCount = computed(() => {
    const f = filters.value
    return [
      f.brandId,
      f.modelId,
      f.yearFrom,
      f.yearTo,
      f.priceFrom,
      f.priceTo,
      f.cityId,
    ].filter((v) => v != null).length
  })

  function apply(next: Partial<CarFilters>) {
    filters.value = { ...filters.value, ...next }
  }

  function setSearch(value: string) {
    filters.value.search = value.trim() || null
  }

  function reset() {
    filters.value = { ...EMPTY }
  }

  return { filters, activeCount, apply, setSearch, reset }
})
