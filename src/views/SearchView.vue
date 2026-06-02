<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-vue-next'
import SearchResultCard from '@/components/car/SearchResultCard.vue'
import FilterSheet from '@/components/car/FilterSheet.vue'
import SortSheet from '@/components/car/SortSheet.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useSearchStore } from '@/stores/search'
import { useFiltersStore } from '@/stores/filters'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useTelegram } from '@/composables/useTelegram'

const props = defineProps<{ q: string }>()

const router = useRouter()
const search = useSearchStore()
const filters = useFiltersStore()
const { haptic } = useTelegram()

const searchText = ref(props.q)
const filterOpen = ref(false)
const sortOpen = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)

const SORT_LABELS: Record<string, string> = {
  date_desc: 'Сначала новые',
  price_asc: 'Сначала дешевле',
  price_desc: 'Сначала дороже',
  year_desc: 'Год: новее',
  mileage_asc: 'Пробег: меньше',
}
const sortLabel = computed(() => SORT_LABELS[search.sort] ?? 'Сортировка')

const { sentinel } = useInfiniteScroll(() => search.loadMore())

function goBack() {
  haptic('light')
  if (window.history.length > 1) router.back()
  else router.push({ name: 'home' })
}

function submit() {
  const q = searchText.value.trim()
  router.replace({ name: 'search', query: q ? { q } : {} })
  search.setQuery(q)
  // Drop focus so the on-screen keyboard closes and the bottom tab bar returns
  // (the search screen lives under the Home tab) — otherwise it's a dead-end.
  inputEl.value?.blur()
}

function clearText() {
  searchText.value = ''
  submit()
}

onMounted(() => {
  search.query = props.q
  searchText.value = props.q
  search.reload()
  // Arriving from the Home search field: drop any lingering focus so the
  // keyboard closes and the bottom tab bar is visible on the results.
  ;(document.activeElement as HTMLElement | null)?.blur?.()
})
</script>

<template>
  <main class="min-h-dvh pb-24">
    <!-- Sticky header: back + search + filters -->
    <header class="sticky top-0 z-30 bg-bg/90 backdrop-blur-xl safe-top">
      <div class="flex items-center gap-2 px-3 py-3">
        <button
          type="button"
          aria-label="Назад"
          class="flex h-10 w-9 shrink-0 items-center justify-center rounded-full text-text transition-transform duration-fast ease-out-ios active:scale-90"
          @click="goBack"
        >
          <ChevronLeft :size="24" />
        </button>

        <div class="relative flex-1">
          <Search :size="20" class="pointer-events-none absolute left-3.5 top-2.5 text-text-muted" />
          <input
            ref="inputEl"
            v-model="searchText"
            type="search"
            enterkeyhint="search"
            placeholder="Поиск"
            class="w-full rounded-pill bg-surface-2 py-2.5 pl-11 pr-10 text-[15px] text-text placeholder:text-text-muted outline-none"
            @keyup.enter="submit"
          />
          <button
            v-if="searchText"
            type="button"
            aria-label="Очистить"
            class="absolute right-2.5 top-2 flex h-6 w-6 items-center justify-center rounded-full text-text-muted active:scale-90"
            @click="clearText"
          >
            <X :size="18" />
          </button>
        </div>

        <button
          type="button"
          aria-label="Фильтры"
          class="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-surface-2 transition-transform duration-fast ease-out-ios active:scale-90"
          @click="filterOpen = true"
        >
          <SlidersHorizontal :size="20" class="text-text" />
          <span
            v-if="filters.activeCount"
            class="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-text px-1 text-center text-[11px] font-bold leading-[18px] text-bg"
          >
            {{ filters.activeCount }}
          </span>
        </button>
      </div>

      <!-- Sort row -->
      <div class="flex items-center px-4 pb-2.5">
        <button
          type="button"
          class="flex items-center gap-1.5 text-[14px] text-text transition-colors active:text-text-muted"
          @click="sortOpen = true"
        >
          <ArrowUpDown :size="16" :stroke-width="2" />
          {{ sortLabel }}
        </button>
      </div>
    </header>

    <!-- Results -->
    <section class="px-4 pt-1">
      <!-- First load skeletons -->
      <div v-if="search.loading" class="space-y-6">
        <div v-for="n in 4" :key="n" class="animate-pulse">
          <div class="aspect-[16/10] w-full rounded-card bg-surface" />
          <div class="space-y-2 pt-3">
            <div class="h-5 w-1/3 rounded bg-surface" />
            <div class="h-4 w-3/5 rounded bg-surface" />
            <div class="h-3 w-2/5 rounded bg-surface" />
          </div>
        </div>
      </div>

      <!-- Empty -->
      <EmptyState
        v-else-if="!search.items.length"
        title="Ничего не найдено"
        subtitle="Измените запрос или сбросьте фильтры"
      />

      <!-- List -->
      <template v-else>
        <div class="space-y-6">
          <SearchResultCard v-for="car in search.items" :key="car.id" :car="car" />
        </div>

        <div ref="sentinel" class="h-10" />
        <div v-if="search.loadingMore" class="flex justify-center py-4">
          <span class="h-5 w-5 animate-spin rounded-full border-2 border-text-faint border-t-text" />
        </div>
        <p v-else-if="!search.hasMore" class="py-6 text-center text-[13px] text-text-faint">
          Больше объявлений нет
        </p>
      </template>
    </section>

    <FilterSheet v-model:open="filterOpen" @apply="search.reload()" />
    <SortSheet v-model:open="sortOpen" :selected="search.sort" @select="search.setSort($event)" />
  </main>
</template>
