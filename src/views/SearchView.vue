<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, X, SlidersHorizontal, ArrowUpDown, Car, ChevronRight } from 'lucide-vue-next'
import SearchResultCard from '@/components/car/SearchResultCard.vue'
import FilterSheet from '@/components/car/FilterSheet.vue'
import SortSheet from '@/components/car/SortSheet.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useSearchStore } from '@/stores/search'
import { useFiltersStore } from '@/stores/filters'
import { useProfileStore } from '@/stores/profile'
import { searchModels } from '@/api/cars.service'
import type { SearchModelResult } from '@/api/backend'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useTelegram } from '@/composables/useTelegram'

const props = defineProps<{ q: string }>()

const router = useRouter()
const search = useSearchStore()
const filters = useFiltersStore()
const profile = useProfileStore()
const { haptic } = useTelegram()

const searchText = ref(props.q)
const filterOpen = ref(false)
const sortOpen = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)
const resolving = ref(false)
const noMatch = ref(false)

// As-you-type model suggestions (Avito-style dropdown).
const suggestions = ref<SearchModelResult[]>([])
const showSuggestions = ref(false)
let sugTimer: ReturnType<typeof setTimeout> | null = null
// Skip the next watch tick when we set searchText programmatically (select/submit).
let suppressSuggest = false

watch(searchText, (val) => {
  if (suppressSuggest) { suppressSuggest = false; return }
  const q = val.trim()
  if (q.length < 2) {
    suggestions.value = []
    showSuggestions.value = false
    if (sugTimer) clearTimeout(sugTimer)
    return
  }
  if (sugTimer) clearTimeout(sugTimer)
  sugTimer = setTimeout(async () => {
    try {
      const res = await searchModels(q, profile.cityId)
      // Ignore stale responses (query moved on while the request was in flight).
      if (searchText.value.trim() !== q) return
      suggestions.value = res
      showSuggestions.value = true
    } catch {
      suggestions.value = []
    }
  }, 200)
})

/** Pick a suggestion → show that model's listings directly. */
function selectSuggestion(s: SearchModelResult) {
  haptic('light')
  suppressSuggest = true
  searchText.value = `${s.brand_name} ${s.model_name}`.trim()
  showSuggestions.value = false
  noMatch.value = false
  inputEl.value?.blur()
  router.replace({ name: 'search', query: { q: searchText.value } })
  filters.apply({ brandId: null, modelId: s.model_id })
  search.reload()
}

function hideSuggestions() {
  showSuggestions.value = false
  if (sugTimer) clearTimeout(sugTimer)
}

onBeforeUnmount(() => {
  if (sugTimer) clearTimeout(sugTimer)
})

const SORT_LABELS: Record<string, string> = {
  date_desc: 'Сначала новые',
  popularity: 'По популярности',
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

/** «Отменить» — close the search screen (Avito-style). */
function cancel() {
  inputEl.value?.blur()
  hideSuggestions()
  goBack()
}

/**
 * Resolve a free-text query → brand/model filter (the backend feed has no text
 * search, only /api/search model lookup), then show the listings feed directly.
 * Brand-only query ("bmw") → all cars of that brand; otherwise the matched model.
 */
async function runSearch(raw: string) {
  const query = raw.trim()
  noMatch.value = false

  if (!query) {
    filters.apply({ brandId: null, modelId: null })
    search.reload()
    return
  }

  resolving.value = true
  try {
    const results = await searchModels(query, profile.cityId)
    if (!results.length) {
      noMatch.value = true
      return
    }
    const top = results[0]
    const ql = query.toLowerCase()
    const brandLower = top.brand_name.toLowerCase()
    // "bmw" / "au" → user typed (a prefix of) the brand → show the whole brand.
    if (brandLower.startsWith(ql) || ql === brandLower) {
      filters.apply({ brandId: top.brand_id, modelId: null })
    } else {
      filters.apply({ brandId: null, modelId: top.model_id })
    }
    search.reload()
  } catch {
    noMatch.value = true
  } finally {
    resolving.value = false
  }
}

function submit() {
  inputEl.value?.blur()
  hideSuggestions()
  router.replace({ name: 'search', query: searchText.value.trim() ? { q: searchText.value.trim() } : {} })
  runSearch(searchText.value)
}

function clearText() {
  suppressSuggest = true
  searchText.value = ''
  noMatch.value = false
  hideSuggestions()
  suggestions.value = []
  filters.apply({ brandId: null, modelId: null })
  router.replace({ name: 'search' })
  search.reload()
  inputEl.value?.focus()
}

onMounted(() => {
  searchText.value = props.q
  if (props.q.trim()) {
    runSearch(props.q)
  } else {
    search.reload()
    // Fresh search (opened from Home) → focus so the keyboard is ready right away.
    requestAnimationFrame(() => inputEl.value?.focus())
  }
})
</script>

<template>
  <main class="min-h-dvh pb-24">
    <!-- Sticky header: back + search + filters -->
    <header class="sticky top-0 z-30 bg-bg/90 backdrop-blur-xl safe-top">
      <div class="flex items-center gap-1 px-3 py-3">
        <div class="relative flex-1">
          <Search :size="20" class="pointer-events-none absolute left-3.5 top-2.5 text-text-muted" />
          <input
            ref="inputEl"
            v-model="searchText"
            type="search"
            enterkeyhint="search"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="none"
            spellcheck="false"
            name="avata-search"
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
          class="shrink-0 px-2.5 py-1 text-[15px] text-text transition-opacity duration-fast active:opacity-60"
          @click="cancel"
        >
          Отменить
        </button>
      </div>

      <!-- Sort + filters row -->
      <div class="flex items-center justify-between px-4 pb-2.5">
        <button
          type="button"
          class="flex items-center gap-1.5 text-[14px] text-text transition-colors active:text-text-muted"
          @click="sortOpen = true"
        >
          <ArrowUpDown :size="16" :stroke-width="2" />
          {{ sortLabel }}
        </button>
        <button
          type="button"
          class="relative flex items-center gap-1.5 text-[14px] text-text transition-colors active:text-text-muted"
          @click="filterOpen = true"
        >
          <SlidersHorizontal :size="16" :stroke-width="2" />
          Фильтры
          <span
            v-if="filters.activeCount"
            class="ml-0.5 min-w-[18px] rounded-full bg-text px-1 text-center text-[11px] font-bold leading-[18px] text-bg"
          >
            {{ filters.activeCount }}
          </span>
        </button>
      </div>
    </header>

    <!-- As-you-type suggestions (tap → that model's listings) -->
    <section v-if="showSuggestions && suggestions.length" class="px-2 pt-1">
      <button
        v-for="(s, i) in suggestions"
        :key="s.model_id"
        type="button"
        class="flex w-full items-center gap-3 px-2 py-3 text-left transition-colors active:bg-surface"
        :class="i ? 'border-t border-border/60' : ''"
        @click="selectSuggestion(s)"
      >
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2">
          <Car :size="18" class="text-text-muted" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[15px] text-text">{{ s.brand_name }} {{ s.model_name }}</span>
          <span class="block text-[12px] text-text-muted">
            Автомобили<template v-if="s.car_count"> · {{ s.car_count }}</template>
          </span>
        </span>
        <ChevronRight :size="18" class="shrink-0 text-text-faint" />
      </button>
    </section>

    <!-- Results -->
    <section v-else class="px-4 pt-1">
      <!-- Loading (resolving the query or loading the feed) -->
      <div v-if="resolving || search.loading" class="space-y-6">
        <div v-for="n in 4" :key="n" class="animate-pulse">
          <div class="aspect-[16/10] w-full rounded-card bg-surface" />
          <div class="space-y-2 pt-3">
            <div class="h-5 w-1/3 rounded bg-surface" />
            <div class="h-4 w-3/5 rounded bg-surface" />
            <div class="h-3 w-2/5 rounded bg-surface" />
          </div>
        </div>
      </div>

      <!-- Nothing matched the query / filters -->
      <EmptyState
        v-else-if="noMatch || !search.items.length"
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
        <!-- End of feed: same spacing/ring as the loading spinner, mirrored (static, flipped). -->
        <div v-else-if="!search.hasMore" class="flex justify-center py-4">
          <span class="h-5 w-5 rotate-180 rounded-full border-2 border-text-faint border-t-text" />
        </div>
      </template>
    </section>

    <FilterSheet v-model:open="filterOpen" @apply="search.reload()" />
    <SortSheet v-model:open="sortOpen" :selected="search.sort" @select="search.setSort($event)" />
  </main>
</template>
