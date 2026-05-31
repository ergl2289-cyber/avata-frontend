<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, MessageCircle, Car, Share2, Eye, Heart, Star } from 'lucide-vue-next'
import PhotoGallery from '@/components/car/PhotoGallery.vue'
import LikeButton from '@/components/car/LikeButton.vue'
import CarCard from '@/components/car/CarCard.vue'
import { getCarById, getSimilarCars, backend } from '@/api/cars.service'
import { getCachedCar, setCachedCar } from '@/api/cars.cache'
import { galleryUrls } from '@/api/assets'
import {
  carTitle,
  driveLabel,
  formatMileage,
  formatPrice,
  fuelLabel,
  transmissionLabel,
} from '@/utils/format'
import { useTelegram } from '@/composables/useTelegram'
import type { CarDetail, CarListItem } from '@/types/car'

// Similar lists are session-cached locally; the detail cache is shared (so an
// owner's edit can invalidate it) via @/api/cars.cache.
const similarCache = new Map<number, CarListItem[]>()

const props = defineProps<{ id: string }>()
const router = useRouter()
const { haptic, openSellerChat } = useTelegram()

const car = ref<CarDetail | null>(null)
const loading = ref(true)
const error = ref(false)
const similar = ref<CarListItem[]>([])

const descExpanded = ref(false)
const descEl = ref<HTMLElement | null>(null)
const descOverflows = ref(false)

const photos = computed(() => (car.value ? galleryUrls(car.value.files) : []))
const title = computed(() => (car.value ? carTitle(car.value) : ''))
const price = computed(() => (car.value ? formatPrice(car.value.price) : ''))
const subtitle = computed(() =>
  car.value ? `${car.value.year} · ${formatMileage(car.value.mileage)}` : '',
)

/** "Про автомобиль" — only the fields we actually have, no empty rows. */
const specs = computed(() => {
  const c = car.value
  if (!c) return [] as { label: string; value: string }[]
  const t = c.technical_specs
  const rows: { label: string; value: string }[] = [
    { label: 'Год выпуска', value: String(c.year) },
    { label: 'Пробег', value: formatMileage(c.mileage) },
  ]
  if (t?.body_type) rows.push({ label: 'Тип кузова', value: t.body_type })
  const engine = [
    t?.engine_volume != null ? `${t.engine_volume.toFixed(1)} л` : null,
    t?.engine_power != null ? `${t.engine_power} л.с.` : null,
    t?.fuel_type ? fuelLabel(t.fuel_type) : null,
  ]
    .filter(Boolean)
    .join(', ')
  if (engine) rows.push({ label: 'Двигатель', value: engine })
  if (t?.transmission) rows.push({ label: 'Коробка передач', value: transmissionLabel(t.transmission) })
  if (t?.drive_type) rows.push({ label: 'Привод', value: driveLabel(t.drive_type) })
  if (t?.color) rows.push({ label: 'Цвет', value: t.color })
  return rows
})

const sellerName = computed(() => {
  const s = car.value?.seller
  if (!s) return ''
  return [s.first_name, s.last_name].filter(Boolean).join(' ')
})
const sellerInitials = computed(() =>
  (car.value?.seller.first_name?.[0] ?? '?').toUpperCase(),
)
const sellerId = computed(() => car.value?.seller.id ?? null)
const sellerRating = ref<number | null>(null)
const sellerReviewCount = ref(0)

function openSeller() {
  const sid = sellerId.value
  if (!sid) return
  haptic('light')
  router.push({ name: 'seller', params: { id: sid } })
}

/** Show the toggle only when the collapsed text is actually clipped. */
function measureDesc() {
  const el = descEl.value
  if (!el) {
    descOverflows.value = false
    return
  }
  descOverflows.value = el.scrollHeight > el.clientHeight + 2
}

function toggleDesc() {
  haptic('light')
  descExpanded.value = !descExpanded.value
}

function write() {
  const s = car.value?.seller
  if (!s) return
  haptic('medium')
  openSellerChat(s.username, s.tg_id)
}

function goBack() {
  haptic('light')
  if (window.history.length > 1) router.back()
  else router.push({ name: 'home' })
}

const shared = ref(false)
const toastText = ref('')

async function doShare() {
  haptic('medium')
  const url = window.location.href
  const title = car.value ? carTitle(car.value) : 'AVATA'
  try {
    await navigator.share({ title, url })
  } catch {
    try {
      await navigator.clipboard.writeText(url)
      showToast('Ссылка скопирована')
    } catch {
      showToast('Не удалось скопировать')
    }
  }
}

function showToast(text: string) {
  toastText.value = text
  shared.value = true
  setTimeout(() => shared.value = false, 2000)
}

function loadSellerRating(sid: number | null | undefined) {
  if (!sid) return
  backend.getSellerRating(sid).then(r => {
    sellerRating.value = r.avg_rating
    sellerReviewCount.value = r.review_count
  }).catch(() => {})
}

function loadSimilar(id: number, brandId: number) {
  const cached = similarCache.get(id)
  if (cached) {
    similar.value = cached
    return
  }
  // Non-blocking; failure just hides the block.
  getSimilarCars(brandId)
    .then((r) => {
      const list = r.data.filter((c) => c.id !== id).slice(0, 6)
      similar.value = list
      similarCache.set(id, list)
    })
    .catch(() => {
      similar.value = []
    })
}

async function load() {
  const id = Number(props.id)
  error.value = false
  descExpanded.value = false
  similar.value = []

  // Cache hit → render instantly, no skeleton, no refetch.
  const cached = getCachedCar(id)
  if (cached) {
    car.value = cached
    loading.value = false
    await nextTick()
    measureDesc()
    loadSimilar(id, cached.model.brand.id)
    loadSellerRating(cached.seller?.id ? Number(cached.seller.id) : null)
    backend.recordView(id).catch(() => {})
    return
  }

  loading.value = true
  try {
    const res = await getCarById(id)
    setCachedCar(res.data)
    car.value = res.data
    loading.value = false
    await nextTick()
    measureDesc()
    loadSimilar(id, res.data.model.brand.id)
    loadSellerRating(res.data.seller?.id ? Number(res.data.seller.id) : null)
    backend.recordView(id).catch(() => {})
  } catch {
    error.value = true
    loading.value = false
  }
}

// Re-fetch when navigating between listings (e.g. tapping a "similar" card).
watch(() => props.id, load)
onMounted(load)
</script>

<template>
  <main class="min-h-dvh bg-bg">
    <!-- Loading -->
    <div v-if="loading" class="animate-pulse">
      <div class="aspect-[4/3] w-full bg-surface" />
      <div class="space-y-3 px-4 pt-4">
        <div class="h-7 w-40 rounded-lg bg-surface" />
        <div class="h-5 w-56 rounded-lg bg-surface" />
        <div class="h-40 w-full rounded-card bg-surface" />
      </div>
    </div>

    <!-- Error -->
    <div
      v-else-if="error || !car"
      class="flex min-h-dvh flex-col items-center justify-center gap-3 px-8 text-center"
    >
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface">
        <Car :size="26" :stroke-width="1.6" class="text-text-muted" />
      </div>
      <p class="text-[15px] text-text">Объявление не найдено</p>
      <button
        type="button"
        class="mt-1 rounded-pill bg-surface-2 px-5 py-2 text-[14px] text-text active:scale-95"
        @click="goBack"
      >
        Назад
      </button>
    </div>

    <!-- Listing -->
    <template v-else>
      <!-- Gallery + overlay controls -->
      <div class="relative">
        <PhotoGallery :photos="photos" :alt="title" />
        <div class="pointer-events-none absolute inset-x-0 top-0 safe-top">
          <div class="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              aria-label="Назад"
              class="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-transform duration-fast ease-out-ios active:scale-90"
              @click="goBack"
            >
              <ChevronLeft :size="22" />
            </button>
            <div class="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                aria-label="Поделиться"
                class="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-transform duration-fast ease-out-ios active:scale-90"
                @click="doShare"
              >
                <Share2 :size="18" />
              </button>
              <LikeButton :car-id="car.id" />
            </div>
          </div>
        </div>
      </div>

      <!-- Scrollable body (bottom padding clears the fixed seller bar) -->
      <div class="px-4 pb-28">
        <!-- Price + title -->
        <section class="pt-4">
          <p class="text-[26px] font-bold leading-none text-text">{{ price }}</p>
          <h1 class="mt-2 text-[19px] font-semibold leading-snug text-text">{{ title }}</h1>
          <p class="mt-1 text-[14px] text-text-muted">{{ subtitle }}</p>
          <p class="mt-0.5 text-[13px] text-text-muted">{{ car.city.name }}</p>
          <p class="mt-1.5 flex items-center gap-3 text-[13px] text-text-faint">
            <span class="flex items-center gap-1"><Eye :size="14" /> {{ car.views_global }}</span>
            <span class="flex items-center gap-1"><Heart :size="14" /> {{ car.likes_global }}</span>
          </p>
        </section>

        <!-- Specs -->
        <section class="mt-7">
          <h2 class="mb-3 text-[17px] font-semibold text-text">Про автомобиль</h2>
          <div class="overflow-hidden rounded-card bg-surface">
            <div
              v-for="(row, i) in specs"
              :key="row.label"
              class="flex items-start justify-between gap-4 px-4 py-3"
              :class="i ? 'border-t border-border' : ''"
            >
              <span class="text-[14px] text-text-muted">{{ row.label }}</span>
              <span class="text-right text-[14px] text-text">{{ row.value }}</span>
            </div>
          </div>
        </section>

        <!-- Description -->
        <section v-if="car.description" class="mt-7">
          <h2 class="mb-2 text-[17px] font-semibold text-text">Описание</h2>
          <p
            ref="descEl"
            class="whitespace-pre-line text-[15px] leading-relaxed text-text"
            :class="descExpanded ? '' : 'line-clamp-5'"
          >
            {{ car.description }}
          </p>
          <button
            v-if="descOverflows"
            type="button"
            class="mt-2 text-[14px] font-medium text-text-muted transition-colors active:text-text"
            @click="toggleDesc"
          >
            {{ descExpanded ? 'Свернуть' : 'Показать полностью' }}
          </button>
        </section>

        <!-- Similar -->
        <section v-if="similar.length" class="mt-9">
          <h2 class="mb-3 text-[17px] font-semibold text-text">Похожие предложения</h2>
          <div class="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            <div v-for="c in similar" :key="c.id" class="w-40 shrink-0">
              <CarCard :car="c" />
            </div>
          </div>
        </section>
      </div>

      <!-- Fixed seller bar -->
      <div
        class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur-xl"
      >
        <div
          class="flex items-center gap-3 px-4 pt-3"
          style="padding-bottom: calc(12px + var(--safe-bottom))"
        >
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-[16px] font-semibold text-text-muted cursor-pointer active:scale-95 transition-transform duration-fast"
            @click="openSeller"
          >
            {{ sellerInitials }}
          </div>
          <div class="min-w-0 flex-1 cursor-pointer" @click="openSeller">
            <p class="truncate text-[15px] font-semibold text-text">{{ sellerName }}</p>
            <p class="flex items-center gap-1 text-[12px] text-text-muted">
              <template v-if="sellerRating != null">
                <Star :size="12" class="text-yellow-400" fill="currentColor" />
                {{ sellerRating.toFixed(1) }}
                <span class="text-text-faint">·</span>
                {{ sellerReviewCount }} {{ sellerReviewCount === 1 ? 'отзыв' : sellerReviewCount < 5 ? 'отзыва' : 'отзывов' }}
              </template>
              <template v-else>Продавец</template>
            </p>
          </div>
          <button
            type="button"
            class="flex shrink-0 items-center gap-2 rounded-pill bg-text px-5 py-2.5 text-[15px] font-semibold text-bg transition-transform duration-fast ease-out-ios active:scale-95"
            @click="write"
          >
            <MessageCircle :size="18" :stroke-width="2.2" />
            Написать
          </button>
        </div>
      </div>
    </template>

    <transition name="toast">
      <div
        v-if="shared"
        class="pointer-events-none fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-pill bg-text px-5 py-2.5 text-[14px] text-bg shadow-lg"
      >
        {{ toastText }}
      </div>
    </transition>
  </main>
</template>

<style scoped>
.toast-enter-active {
  transition:
    opacity 200ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-leave-active {
  transition:
    opacity 150ms ease-in,
    transform 150ms ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, 8px);
}
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 4px);
}
</style>
