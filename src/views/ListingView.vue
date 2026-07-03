<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import WebApp from '@twa-dev/sdk'
import { ChevronLeft, MessageCircle, Share2, Eye, Heart, Star, ChevronsUp, Pencil } from 'lucide-vue-next'
import logoUrl from '@/assets/logo-avata.webp'
import PhotoGallery from '@/components/car/PhotoGallery.vue'
import LikeButton from '@/components/car/LikeButton.vue'
import CarCard from '@/components/car/CarCard.vue'
import BoostBadge from '@/components/car/BoostBadge.vue'
import BoostSheet from '@/components/car/BoostSheet.vue'
import { getCarById, getSimilarCars, recordCarView, backend } from '@/api/cars.service'
import { getCachedCar, setCachedCar } from '@/api/cars.cache'
import { galleryUrls } from '@/api/assets'
import {
  carTitle,
  driveLabel,
  formatMileage,
  formatPrice,
  fuelLabel,
  groupThousands,
  transmissionLabel,
} from '@/utils/format'
import { useFavoritesStore } from '@/stores/favorites'
import { useProfileStore } from '@/stores/profile'
import { useTelegramStore } from '@/stores/telegram'
import { useTelegram } from '@/composables/useTelegram'
import type { CarDetail, CarListItem } from '@/types/car'

// Similar lists are session-cached locally; the detail cache is shared (so an
// owner's edit can invalidate it) via @/api/cars.cache.
const similarCache = new Map<number, CarListItem[]>()

const props = defineProps<{ id: string }>()
const router = useRouter()
const favorites = useFavoritesStore()
const profile = useProfileStore()
const tgStore = useTelegramStore()
const { haptic, openSellerChat } = useTelegram()

const car = ref<CarDetail | null>(null)
const loading = ref(true)
const error = ref(false)
const similar = ref<CarListItem[]>([])

/* Live counters (reactivity). `likeBase`/`likedAtLoad` are the server truth at
 * (re)load; the displayed like count adds the user's pending optimistic toggle
 * so the number jumps instantly with the heart, then reconciles on revalidate. */
const likeBase = ref(0)
const likedAtLoad = ref(false)
const liked = computed(() => favorites.isLiked(Number(props.id)))
const displayLikes = computed(() =>
  Math.max(0, likeBase.value + (liked.value ? 1 : 0) - (likedAtLoad.value ? 1 : 0)),
)
const displayViews = computed(() => car.value?.views_global ?? 0)

/** Snapshot the server-side like truth for the optimistic display. */
function syncCounters(c: CarDetail) {
  // Trust the server's is_liked over the local cache (cross-device consistency).
  if (c.is_liked != null) favorites.reconcile(c.id, c.is_liked)
  likeBase.value = c.likes_global
  likedAtLoad.value = favorites.isLiked(c.id)
}

const descExpanded = ref(false)
const descEl = ref<HTMLElement | null>(null)
const descOverflows = ref(false)

const photos = computed(() => (car.value ? galleryUrls(car.value.files, 1280) : []))
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

// NOTE: «Документы и проверки» (VIN / гос. номер / ДТП / розыск / ограничения)
// намеренно НЕ выводятся. Данные приходят с бэка (car.value.legal), но сейчас они
// засеяны вручную и не проходят реальную проверку (нет интеграции ГИБДД/Автокод),
// а публичный показ VIN+номера небезопасен. Включим, когда появится настоящий
// источник проверки и маскирование чувствительных полей.

const sellerName = computed(() => {
  const s = car.value?.seller
  if (!s) return ''
  return [s.first_name, s.last_name].filter(Boolean).join(' ')
})
const sellerInitials = computed(() =>
  (car.value?.seller.first_name?.[0] ?? '?').toUpperCase(),
)
const sellerId = computed(() => car.value?.seller.id ?? null)
const isMyListing = computed(
  () => profile.userId != null && car.value?.seller.id === String(profile.userId),
)
// Prefer the seller avatar the backend returns; for your OWN listing fall back to
// your freshly-set profile photo / Telegram avatar.
const sellerAvatar = computed(
  () =>
    car.value?.seller.avatar_url ??
    (isMyListing.value ? profile.avatarUrl ?? tgStore.user?.photo_url ?? null : null),
)
const sellerRating = ref<number | null>(null)
const sellerReviewCount = ref(0)

function openSeller() {
  const sid = sellerId.value
  if (!sid) return
  haptic('light')
  // Pass name + avatar through — there's no seller-profile endpoint, so the
  // SellerView hero reuses what we already have from the car detail.
  const query: Record<string, string> = {}
  if (sellerName.value) query.name = sellerName.value
  if (car.value?.seller.avatar_url) query.avatar = car.value.seller.avatar_url
  router.push({ name: 'seller', params: { id: sid }, query })
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

/* ---- Owner actions: boost / edit ---- */
const boostOpen = ref(false)
const isBoosted = computed(() => {
  const c = car.value
  if (!c?.is_boosted) return false
  return !c.boosted_until || new Date(c.boosted_until).getTime() > Date.now()
})
function openBoost() {
  haptic('light')
  boostOpen.value = true
}
function onBoosted() {
  // Optimistic: mark as boosted; exact boosted_until refreshes on next open.
  if (car.value) car.value.is_boosted = true
}
function editOwnListing() {
  if (!car.value) return
  haptic('light')
  router.push({ name: 'post', query: { car: car.value.id } })
}

function goBack() {
  haptic('light')
  if (window.history.length > 1) router.back()
  else router.push({ name: 'home' })
}

const shared = ref(false)
const toastText = ref('')

const BOT = 'https://t.me/AvataAuto_bot'

function inTelegram() {
  try {
    return !!WebApp.platform && WebApp.platform !== 'unknown'
  } catch {
    return false
  }
}

async function doShare() {
  haptic('medium')
  // Deep link: opens the Mini App straight on this listing (no in-app-browser detour).
  const url = `${BOT}?startapp=car_${props.id}`
  const title = car.value ? carTitle(car.value) : 'AVATA'

  // Inside Telegram → native «отправить в чат» picker.
  if (inTelegram()) {
    WebApp.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    )
    return
  }

  // Browser → Web Share API, fallback to clipboard.
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

/** Record a view + pull fresh counters in the background (stale-while-revalidate). */
async function revalidate(id: number) {
  recordCarView(id) // fire-and-forget; bumps the server-side views counter
  try {
    const res = await getCarById(id)
    setCachedCar(res.data)
    if (Number(props.id) !== id || !car.value) return // navigated away
    // Refresh only the live counters — avoid disrupting gallery/description.
    car.value.views_global = res.data.views_global
    car.value.likes_global = res.data.likes_global
    syncCounters(res.data)
  } catch {
    /* keep the cached numbers on a failed refresh */
  }
}

async function load() {
  const id = Number(props.id)
  error.value = false
  descExpanded.value = false
  similar.value = []

  // Cache hit → render instantly, then revalidate counters in the background.
  const cached = getCachedCar(id)
  if (cached) {
    car.value = cached
    syncCounters(cached)
    loading.value = false
    await nextTick()
    measureDesc()
    loadSimilar(id, cached.model.brand.id)
    loadSellerRating(cached.seller?.id ? Number(cached.seller.id) : null)
    void revalidate(id) // records the view (session-deduped) + refreshes counters
    return
  }

  loading.value = true
  try {
    const res = await getCarById(id)
    setCachedCar(res.data)
    car.value = res.data
    syncCounters(res.data)
    loading.value = false
    await nextTick()
    measureDesc()
    loadSimilar(id, res.data.model.brand.id)
    loadSellerRating(res.data.seller?.id ? Number(res.data.seller.id) : null)
    void recordCarView(id) // already-fresh data; just count the view
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
      <img :src="logoUrl" alt="Avata" class="w-28 select-none opacity-90" draggable="false" />
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
        <PhotoGallery
          :photos="photos"
          :alt="title"
          :video-url="car.video_url"
          :video-poster-url="car.video_poster_url"
        />
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
          <BoostBadge :boosted="car.is_boosted" :until="car.boosted_until" class="mb-2" />
          <p class="text-[26px] font-bold leading-none text-text">{{ price }}</p>
          <h1 class="mt-2 text-[19px] font-semibold leading-snug text-text">{{ title }}</h1>
          <p class="mt-1 text-[14px] text-text-muted">{{ subtitle }}</p>
          <p class="mt-0.5 text-[13px] text-text-muted">{{ car.city.name }}</p>

          <!-- Live counters: views grow on each visit, likes jump optimistically. -->
          <div class="mt-3 flex items-center gap-4 text-[13px] text-text-faint">
            <span class="flex items-center gap-1.5">
              <Eye :size="15" :stroke-width="1.8" /> {{ groupThousands(displayViews) }}
            </span>
            <span class="flex items-center gap-1.5" :class="liked ? 'text-like' : ''">
              <Heart :size="15" :stroke-width="1.8" :class="liked ? 'fill-like' : ''" />
              {{ groupThousands(displayLikes) }}
            </span>
          </div>
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
        <!-- Owner: boost + edit. Visitor: seller info + write. -->
        <div
          v-if="isMyListing"
          class="flex items-center gap-3 px-4 pt-3"
          style="padding-bottom: calc(12px + var(--safe-bottom))"
        >
          <button
            type="button"
            aria-label="Редактировать"
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-text transition-transform duration-fast ease-out-ios active:scale-95"
            @click="editOwnListing"
          >
            <Pencil :size="19" :stroke-width="2" />
          </button>
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-2 rounded-pill px-5 py-3 text-[15px] font-semibold transition-transform duration-fast ease-out-ios active:scale-[0.98]"
            :class="isBoosted ? 'bg-surface-2 text-text' : 'bg-text text-bg'"
            @click="openBoost"
          >
            <ChevronsUp :size="20" :stroke-width="2.4" />
            {{ isBoosted ? 'Продлить в топе' : 'Поднять в топ' }}
          </button>
        </div>

        <div
          v-else
          class="flex items-center gap-3 px-4 pt-3"
          style="padding-bottom: calc(12px + var(--safe-bottom))"
        >
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-[16px] font-semibold text-text-muted cursor-pointer active:scale-95 transition-transform duration-fast"
            @click="openSeller"
          >
            <img v-if="sellerAvatar" :src="sellerAvatar" alt="" class="h-full w-full object-cover" />
            <template v-else>{{ sellerInitials }}</template>
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

    <BoostSheet v-model:open="boostOpen" :car-id="car ? car.id : null" @boosted="onBoosted" />
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
