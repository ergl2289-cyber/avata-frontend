<script setup lang="ts">
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, SlidersHorizontal, MapPin, Dices } from 'lucide-vue-next'
import { getRandomCarId } from '@/api/cars.service'
import { useTelegram } from '@/composables/useTelegram'
import CarCard from '@/components/car/CarCard.vue'
import CarCardSkeleton from '@/components/car/CarCardSkeleton.vue'
import FilterSheet from '@/components/car/FilterSheet.vue'
import CityPickerSheet from '@/components/geo/CityPickerSheet.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PullToRefresh from '@/components/ui/PullToRefresh.vue'
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

const { haptic } = useTelegram()

const filterOpen = ref(false)
const cityPickerOpen = ref(false)
const lucky = ref(false)
// Entering search: collapse the action buttons + grow the search bar, then navigate.
const entering = ref(false)

/** "Мне повезёт": open a random listing. */
async function feelingLucky() {
  if (lucky.value) return
  lucky.value = true
  haptic('light')
  try {
    const id = await getRandomCarId()
    if (id != null) router.push({ name: 'car', params: { id } })
  } finally {
    lucky.value = false
  }
}

// Browser mode — need to pick a city first
const isBrowser = computed(() => !tg.initData)

const searchPlaceholder = computed(() =>
  profile.cityName ? `Поиск в ${profile.cityName}` : 'Поиск по объявлениям',
)

const { sentinel } = useInfiniteScroll(() => cars.loadMore())

/** Tap the search bar → animate the buttons collapsing, then open search. */
function enterSearch() {
  if (entering.value) return
  haptic('light')
  entering.value = true
  setTimeout(() => router.push({ name: 'search' }), 260)
}

function onFiltersApplied() {
  cars.reload()
}

/** Pull-to-refresh: silent reload (keeps the list visible while refreshing). */
async function onRefresh() {
  await cars.reload(true)
}

watch(() => profile.city, () => cars.reload(), { deep: true })

function onCityPicked(city: City) {
  cityPickerOpen.value = false
  profile.setCity(city)
}

onMounted(() => {
  // No city yet (incl. fresh Telegram users) → prompt, so it's saved to the DB
  // profile, which the backend uses to build the region feed.
  if (!profile.hasCity) {
    cityPickerOpen.value = true
  }
  cars.reload()
})

// Returning to Home (kept-alive) → restore the buttons (un-collapse the bar).
onActivated(() => {
  entering.value = false
})
</script>

<template>
  <main class="min-h-dvh pb-24">
    <!-- Sticky header -->
    <header class="sticky top-0 z-30 bg-bg/90 backdrop-blur-xl safe-top">
      <div class="flex items-center px-4 py-3">
        <div class="relative flex-1">
          <Search :size="20" class="pointer-events-none absolute left-3.5 top-2.5 text-text-muted" />
          <input
            readonly
            inputmode="none"
            :placeholder="searchPlaceholder"
            class="w-full cursor-pointer rounded-pill bg-surface-2 py-2.5 pl-11 pr-4 text-[15px] text-text placeholder:text-text-muted outline-none"
            @click="enterSearch"
            @focus="enterSearch"
          />
        </div>

        <!-- Action buttons collapse smoothly when entering search -->
        <div
          class="flex items-center gap-2.5 overflow-hidden"
          :class="entering ? 'ml-0 max-w-0 opacity-0' : 'ml-2.5 max-w-[112px] opacity-100'"
          :style="{
            transition:
              'max-width 0.34s cubic-bezier(0.16,1,0.3,1), margin 0.34s cubic-bezier(0.16,1,0.3,1), opacity 0.22s ease',
          }"
        >
          <button
            type="button"
            aria-label="Мне повезёт"
            :disabled="lucky"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-surface-2 transition-transform duration-fast ease-out-ios active:scale-90 disabled:opacity-50"
            @click="feelingLucky"
          >
            <Dices :size="20" :class="lucky ? 'animate-spin text-text-muted' : 'text-text'" />
          </button>

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
    <PullToRefresh v-if="!isBrowser || profile.hasCity" :on-refresh="onRefresh">
    <section class="px-4 pt-1">
      <!-- First load skeletons -->
      <div v-if="cars.loading" class="grid grid-cols-2 gap-x-3 gap-y-5">
        <CarCardSkeleton v-for="n in 6" :key="n" />
      </div>

      <!-- Empty -->
      <EmptyState
        v-else-if="!cars.items.length"
        title="Ничего не найдено"
        subtitle="Попробуйте изменить параметры поиска"
      />

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
    </PullToRefresh>

    <FilterSheet v-model:open="filterOpen" @apply="onFiltersApplied" />
  </main>
</template>
