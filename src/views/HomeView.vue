<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, SlidersHorizontal, X, SearchX, MapPin } from 'lucide-vue-next'
import CarCard from '@/components/car/CarCard.vue'
import CarCardSkeleton from '@/components/car/CarCardSkeleton.vue'
import FilterSheet from '@/components/car/FilterSheet.vue'
import CityPickerSheet from '@/components/geo/CityPickerSheet.vue'
import { useCarsStore } from '@/stores/cars'
import { useFiltersStore } from '@/stores/filters'
import { useProfileStore } from '@/stores/profile'
import { useTelegramStore } from '@/stores/telegram'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import type { City } from '@/types/car'

defineOptions({ name: 'HomeView' })

const router = useRouter()
const cars = useCarsStore()
const filters = useFiltersStore()
const profile = useProfileStore()
const tg = useTelegramStore()

const filterOpen = ref(false)
const searchText = ref('')
const cityPickerOpen = ref(false)

// Browser mode — need to pick a city first
const isBrowser = computed(() => !tg.initData)

const searchPlaceholder = computed(() =>
  profile.cityName ? `Поиск в ${profile.cityName}` : 'Поиск по объявлениям',
)

const { sentinel } = useInfiniteScroll(() => cars.loadMore())

function submitSearch() {
  const q = searchText.value.trim()
  router.push({ name: 'search', query: q ? { q } : {} })
}

function clearSearch() {
  searchText.value = ''
}

function onFiltersApplied() {
  cars.reload()
}

watch(() => profile.city, () => cars.reload(), { deep: true })

function onCityPicked(city: City) {
  cityPickerOpen.value = false
  profile.setCity(city)
}

onMounted(() => {
  if (isBrowser.value && !profile.hasCity) {
    cityPickerOpen.value = true
  }
  cars.reload()
})
</script>

<template>
  <main class="min-h-dvh pb-24">
    <!-- Sticky header -->
    <header class="sticky top-0 z-30 bg-bg/90 backdrop-blur-xl safe-top">
      <div class="flex items-center gap-2.5 px-4 py-3">
        <div class="relative flex-1">
          <Search :size="20" class="pointer-events-none absolute left-3.5 top-2.5 text-text-muted" />
          <input
            v-model="searchText"
            type="search"
            enterkeyhint="search"
            :placeholder="searchPlaceholder"
            class="w-full rounded-pill bg-surface-2 py-2.5 pl-11 pr-10 text-[15px] text-text placeholder:text-text-muted outline-none"
            @keyup.enter="submitSearch"
          />
          <button
            v-if="searchText"
            type="button"
            aria-label="Очистить"
            class="absolute right-2.5 top-2 flex h-6 w-6 items-center justify-center rounded-full text-text-muted active:scale-90"
            @click="clearSearch"
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
    </header>

    <!-- Browser: city picker -->
    <div v-if="isBrowser && !profile.hasCity" class="flex flex-col items-center gap-4 px-8 py-20 text-center">
      <MapPin :size="40" class="text-text-muted" />
      <p class="text-[15px] text-text">Выберите город, чтобы видеть объявления</p>
      <button class="rounded-pill bg-primary px-6 py-2.5 text-sm font-medium text-white" @click="cityPickerOpen = true">
        Выбрать город
      </button>
    </div>
    <CityPickerSheet :open="cityPickerOpen" :selected-id="profile.cityId" @update:open="cityPickerOpen = $event" @select="onCityPicked" />

    <!-- Feed (only when city selected or in Telegram) -->
    <section v-if="!isBrowser || profile.hasCity" class="px-4 pt-1">
      <!-- First load skeletons -->
      <div v-if="cars.loading" class="grid grid-cols-2 gap-x-3 gap-y-5">
        <CarCardSkeleton v-for="n in 6" :key="n" />
      </div>

      <!-- Empty -->
      <div
        v-else-if="!cars.items.length"
        class="flex flex-col items-center gap-3 px-8 py-24 text-center"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface">
          <SearchX :size="26" :stroke-width="1.6" class="text-text-muted" />
        </div>
        <p class="text-[15px] text-text">Ничего не найдено</p>
        <p class="text-[13px] text-text-muted">Попробуйте изменить параметры поиска</p>
      </div>

      <!-- Grid -->
      <template v-else>
        <div class="grid grid-cols-2 gap-x-3 gap-y-5">
          <CarCard v-for="car in cars.items" :key="car.id" :car="car" />
        </div>

        <!-- Load-more sentinel + spinner -->
        <div ref="sentinel" class="h-10" />
        <div v-if="cars.loadingMore" class="flex justify-center py-4">
          <span class="h-5 w-5 animate-spin rounded-full border-2 border-text-faint border-t-text" />
        </div>
        <p
          v-else-if="!cars.hasMore"
          class="py-6 text-center text-[13px] text-text-faint"
        >
          Больше объявлений нет
        </p>
      </template>
    </section>

    <FilterSheet v-model:open="filterOpen" @apply="onFiltersApplied" />
  </main>
</template>
