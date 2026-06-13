<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, Star, MessageSquare, ImagePlus } from 'lucide-vue-next'
import CarCard from '@/components/car/CarCard.vue'
import { backend } from '@/api/cars.service'
import type { CarListItem } from '@/types/car'
import { assetUrl } from '@/api/assets'
import logoUrl from '@/assets/logo-avata.webp'
import { useTelegram } from '@/composables/useTelegram'
import { useTelegramStore } from '@/stores/telegram'
import { useProfileStore } from '@/stores/profile'

const props = defineProps<{ id: string }>()
const route = useRoute()
const router = useRouter()
const { haptic } = useTelegram()
const tg = useTelegramStore()
const profile = useProfileStore()

// Avatar comes from the car detail (passed via ?avatar=…). For your own profile,
// fall back to your freshly-set profile photo / Telegram avatar.
const isSelf = computed(() => profile.userId != null && Number(props.id) === profile.userId)
const sellerAvatar = computed(
  () =>
    (route.query.avatar as string | undefined) ||
    (isSelf.value ? profile.avatarUrl ?? tg.user?.photo_url ?? null : null),
)
// If the avatar URL fails to load (e.g. an expired Telegram photo link), fall
// back to the initial instead of showing an empty circle.
const avatarBroken = ref(false)

const tab = ref<'listings' | 'reviews'>('listings')
const loading = ref(true)
// Name passed from the listing card (the backend has no seller-profile endpoint yet).
const sellerName = ref<string>((route.query.name as string) || '')
const sellerInitial = computed(() => (sellerName.value.trim()[0] ?? '?').toUpperCase())
const sellerRating = ref<number | null>(null)
const reviewCount = ref(0)
const listings = ref<CarListItem[]>([])
const reviews = ref<backend.ReviewItem[]>([])

function goBack() {
  haptic('light')
  if (window.history.length > 1) router.back()
  else router.push({ name: 'home' })
}

function switchTab(t: 'listings' | 'reviews') {
  haptic('light')
  tab.value = t
  if (t === 'reviews' && !reviews.value.length) loadReviews()
}

const reviewOpen = ref(false)
const reviewRating = ref(5)
const reviewText = ref('')
const reviewFiles = ref<File[]>([])
const reviewSubmitting = ref(false)
const reviewError = ref<string | null>(null)
const reviewPhotoUrls = ref<string[]>([])

const fileInput = ref<HTMLInputElement | null>(null)

const galleryOpen = ref(false)
const galleryPhotos = ref<string[]>([])
const galleryIndex = ref(0)

function openGallery(photos: string[], idx: number) {
  galleryPhotos.value = photos
  galleryIndex.value = idx
  galleryOpen.value = true
}

function openReviewForm() {
  reviewRating.value = 5
  reviewText.value = ''
  reviewFiles.value = []
  reviewPhotoUrls.value = []
  reviewError.value = null
  reviewOpen.value = true
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const newFiles = Array.from(input.files)
  reviewFiles.value = reviewFiles.value.concat(newFiles)
  newFiles.forEach(f => {
    const url = URL.createObjectURL(f)
    reviewPhotoUrls.value.push(url)
  })
  input.value = ''
}

function removeReviewFile(idx: number) {
  URL.revokeObjectURL(reviewPhotoUrls.value[idx])
  reviewPhotoUrls.value.splice(idx, 1)
  reviewFiles.value.splice(idx, 1)
}

async function submitReview() {
  reviewSubmitting.value = true
  reviewError.value = null
  const text = reviewText.value.trim() || null
  try {
    const res = await backend.createReview({
      seller_id: Number(props.id),
      rating: reviewRating.value,
      text,
    })
    let uploadedPhotos: backend.PhotoInfo[] = []
    if (reviewFiles.value.length) {
      const fileIds = await backend.uploadReviewPhotos(res.review_id, reviewFiles.value)
      uploadedPhotos = fileIds.map(id => ({ id, url: assetUrl(id) }))
    }
    reviewOpen.value = false
    reviewPhotoUrls.value.forEach(u => URL.revokeObjectURL(u))
    reviewPhotoUrls.value = []
    reviewText.value = ''
    // Prepend new review locally (pending wont appear from server)
    const wasEmpty = reviews.value.length === 0
    reviews.value.unshift({
      id: res.review_id,
      author_id: 0,
      author_name: tg.user ? [tg.user.first_name, tg.user.last_name].filter(Boolean).join(' ') : 'Вы',
      seller_id: Number(props.id),
      car_id: null,
      rating: reviewRating.value,
      text,
      status: 'pending',
      date_created: new Date().toISOString(),
      photos: uploadedPhotos,
    })
    tab.value = 'reviews'
    reviewCount.value++
    // Load approved reviews from server if this is the first one
    if (wasEmpty) loadReviews()
  } catch {
    reviewError.value = 'Не удалось отправить отзыв'
  } finally {
    reviewSubmitting.value = false
  }
}

onMounted(async () => {
  const sellerId = Number(props.id)
  try {
    const [carsRes, ratingRes] = await Promise.all([
      backend.getCarsFeed({ seller_id: sellerId, limit: 30 }),
      backend.getSellerRating(sellerId),
    ])
    sellerRating.value = ratingRes.avg_rating
    reviewCount.value = ratingRes.review_count
    listings.value = carsRes.items.map((f) => ({
      id: f.id,
      model: { id: 0, name: f.model_name, brand: { id: 0, name: f.brand_name } },
      year: f.year,
      mileage: f.mileage,
      price: f.price,
      is_active: true,
      date_created: f.date_created,
      city: { id: 0, name: f.city_name },
      files: f.first_photo_url
        ? [{ id: 0, directus_files_id: { id: f.first_photo_url } }]
        : [],
      views_global: f.views_global,
      likes_global: f.likes_global,
      technical_specs: null,
    }))
  } catch {
    /* ignore */
  } finally {
    loading.value = false
  }
})

async function loadReviews() {
  const sellerId = Number(props.id)
  try {
    reviews.value = await backend.getSellerReviews(sellerId)
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <main class="relative min-h-dvh bg-bg">
    <!-- Floating back button over the hero -->
    <button
      type="button"
      aria-label="Назад"
      class="absolute left-1.5 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-surface/70 text-text backdrop-blur-md transition-transform duration-fast ease-out-ios active:scale-90"
      style="top: calc(8px + var(--safe-top))"
      @click="goBack"
    >
      <ChevronLeft :size="24" />
    </button>

    <!-- Hero: big avatar + name + stats (centered composition) -->
    <section
      class="flex flex-col items-center px-6 pb-6 text-center"
      style="padding-top: calc(28px + var(--safe-top))"
    >
      <div
        class="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-[34px] font-semibold text-text-muted ring-1 ring-border"
      >
        <img
          v-if="sellerAvatar && !avatarBroken"
          :src="sellerAvatar"
          alt=""
          class="h-full w-full object-cover"
          @error="avatarBroken = true"
        />
        <template v-else>{{ sellerInitial }}</template>
      </div>

      <h1 class="mt-4 text-[24px] font-bold leading-tight text-text">
        {{ sellerName || 'Продавец' }}
      </h1>
      <p class="mt-1 text-[14px] text-text-muted">
        <template v-if="sellerRating != null">
          <Star :size="13" class="mb-px inline text-yellow-400" fill="currentColor" />
          {{ sellerRating.toFixed(1) }} · {{ reviewCount }} {{ reviewCount === 1 ? 'отзыв' : reviewCount < 5 ? 'отзыва' : 'отзывов' }}
        </template>
        <template v-else>Нет отзывов</template>
      </p>

      <!-- Stats: 3-column composition -->
      <div class="mt-6 grid w-full max-w-[330px] grid-cols-3 overflow-hidden rounded-card bg-surface">
        <div class="flex flex-col items-center gap-1 py-4">
          <span class="text-[21px] font-bold leading-none text-text">{{ listings.length }}</span>
          <span class="text-[12px] text-text-muted">Объявления</span>
        </div>
        <div class="flex flex-col items-center gap-1 border-x border-border py-4">
          <span class="text-[21px] font-bold leading-none text-text">{{ reviewCount }}</span>
          <span class="text-[12px] text-text-muted">Отзывы</span>
        </div>
        <div class="flex flex-col items-center gap-1 py-4">
          <span class="flex items-center gap-1 text-[21px] font-bold leading-none text-text">
            <Star :size="15" class="text-yellow-400" fill="currentColor" />
            {{ sellerRating != null ? sellerRating.toFixed(1) : '—' }}
          </span>
          <span class="text-[12px] text-text-muted">Рейтинг</span>
        </div>
      </div>
    </section>

    <!-- Sticky tabs -->
    <header class="sticky top-0 z-30 bg-bg/90 backdrop-blur-xl">
      <nav class="flex gap-5 px-4">
        <button
          v-for="t in ([
            { key: 'listings' as const, label: 'Объявления', count: listings.length },
            { key: 'reviews' as const, label: 'Отзывы', count: reviewCount },
          ])"
          :key="t.key"
          type="button"
          class="relative -mb-px pb-2.5 pt-2.5 text-[16px] font-semibold transition-colors duration-fast"
          :class="tab === t.key ? 'text-text' : 'text-text-muted'"
          @click="switchTab(t.key)"
        >
          {{ t.label }}
          <span v-if="t.count" class="ml-1 text-[11px] text-text-muted">{{ t.count }}</span>
          <span v-if="tab === t.key" class="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-text" />
        </button>
      </nav>
      <div class="h-px w-full bg-border" />
    </header>

    <section class="px-4 pt-4" style="padding-bottom: calc(32px + var(--safe-bottom))">
      <div v-if="loading" class="flex justify-center py-12">
        <span class="h-6 w-6 animate-spin rounded-full border-2 border-text-faint border-t-text" />
      </div>

      <!-- Listings -->
      <template v-else-if="tab === 'listings'">
        <div v-if="!listings.length" class="flex flex-col items-center gap-3 py-20 text-center">
          <img :src="logoUrl" alt="Avata" class="w-28 select-none opacity-90" draggable="false" />
          <p class="text-[15px] text-text">Нет объявлений</p>
        </div>
        <div v-else class="grid grid-cols-2 gap-x-3 gap-y-5">
          <CarCard v-for="car in listings" :key="car.id" :car="car" />
        </div>
      </template>

      <!-- Reviews -->
      <template v-else-if="tab === 'reviews'">
        <div class="flex items-center justify-between pb-4">
          <span v-if="sellerRating != null" class="text-[15px] text-text">
            <Star :size="16" class="mb-0.5 inline text-yellow-400" fill="currentColor" />
            {{ sellerRating.toFixed(1) }} · {{ reviewCount }} {{ reviewCount === 1 ? 'отзыв' : reviewCount < 5 ? 'отзыва' : 'отзывов' }}
          </span>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-pill bg-text px-4 py-2 text-[14px] font-medium text-bg transition-transform duration-fast active:scale-95"
            @click="openReviewForm"
          >
            <MessageSquare :size="15" :stroke-width="2" />
            Написать отзыв
          </button>
        </div>
        <div v-if="!reviews.length" class="flex flex-col items-center gap-3 py-16 text-center">
          <img :src="logoUrl" alt="Avata" class="w-28 select-none opacity-90" draggable="false" />
          <p class="text-[15px] text-text">Отзывов пока нет</p>
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="r in reviews"
            :key="r.id"
            class="rounded-card border border-border bg-surface p-4"
          >
            <div class="flex items-center justify-between">
              <span class="text-[14px] font-medium text-text">{{ r.author_name || 'Пользователь' }}</span>
              <span class="flex items-center gap-1 text-[13px] text-text-muted">
                <template v-if="r.status === 'pending'">
                  <span class="text-[11px] text-text-faint">На модерации</span>
                </template>
                <template v-else>
                  <Star :size="14" class="text-yellow-400" fill="currentColor" /> {{ r.rating }}
                </template>
              </span>
            </div>
            <p v-if="r.text" class="mt-2 text-[14px] leading-relaxed text-text">{{ r.text }}</p>
            <div v-if="r.photos?.length" class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="(photo, pi) in r.photos"
                :key="photo.id"
                type="button"
                class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2 transition-transform active:scale-95"
                @click="openGallery(r.photos!.map(p => p.url), pi)"
              >
                <img :src="photo.url" alt="" class="h-full w-full object-cover" loading="lazy" />
              </button>
            </div>
            <p class="mt-2 text-[11px] text-text-faint">{{ new Date(r.date_created).toLocaleDateString('ru-RU') }}</p>
          </div>
        </div>
      </template>
    </section>

    <!-- Review modal -->
    <div
      v-if="reviewOpen"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 pb-8"
      @click.self="reviewOpen = false"
    >
      <div
        class="w-full max-w-sm rounded-2xl bg-bg px-5 pb-4 pt-5"
        @click.stop
      >
        <h2 class="text-center text-[17px] font-semibold text-text">Написать отзыв</h2>

        <div class="mt-5 flex justify-center gap-1">
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            class="p-1 transition-transform duration-fast active:scale-110"
            @click="reviewRating = n"
          >
            <Star
              :size="32"
              :class="n <= reviewRating ? 'text-yellow-400' : 'text-text-faint'"
              :fill="n <= reviewRating ? 'currentColor' : 'none'"
            />
          </button>
        </div>

        <textarea
          v-model="reviewText"
          placeholder="Ваш отзыв (необязательно)"
          rows="4"
          class="mt-4 w-full resize-none rounded-xl bg-surface-2 px-4 py-3 text-[15px] text-text placeholder:text-text-faint outline-none"
        />

        <!-- Photo picker -->
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-2 text-text-muted transition-colors active:bg-surface"
            @click="fileInput?.click()"
          >
            <ImagePlus :size="22" />
          </button>
          <div
            v-for="(url, idx) in reviewPhotoUrls"
            :key="idx"
            class="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-2"
          >
            <img :src="url" alt="" class="h-full w-full object-cover" />
            <button
              type="button"
              class="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white text-[11px] opacity-0 transition-opacity group-hover:opacity-100"
              @click="removeReviewFile(idx)"
            >
              ✕
            </button>
          </div>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          @change="onFilesSelected"
        />

        <p v-if="reviewError" class="mt-2 text-center text-[13px] text-red-400">{{ reviewError }}</p>

        <button
          type="button"
          :disabled="reviewSubmitting"
          class="mt-4 w-full rounded-pill bg-text py-3 text-[15px] font-semibold text-bg transition-transform duration-fast active:scale-[0.98] disabled:opacity-50"
          @click="submitReview"
        >
          {{ reviewSubmitting ? 'Отправка…' : 'Отправить' }}
        </button>
      </div>
    </div>

    <!-- Photo gallery overlay -->
    <div
      v-if="galleryOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      @click="galleryOpen = false"
    >
      <div class="relative flex h-full w-full items-center justify-center">
        <img
          :src="galleryPhotos[galleryIndex]"
          alt=""
          class="max-h-full max-w-full object-contain"
        />
        <button
          v-if="galleryPhotos.length > 1"
          type="button"
          class="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 px-3 py-6 text-white backdrop-blur-sm transition-colors active:bg-white/40"
          @click.stop="galleryIndex = galleryIndex > 0 ? galleryIndex - 1 : galleryPhotos.length - 1"
        >
          ‹
        </button>
        <button
          v-if="galleryPhotos.length > 1"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 px-3 py-6 text-white backdrop-blur-sm transition-colors active:bg-white/40"
          @click.stop="galleryIndex = galleryIndex < galleryPhotos.length - 1 ? galleryIndex + 1 : 0"
        >
          ›
        </button>
      </div>
      <div class="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-sm text-white/60">
        {{ galleryIndex + 1 }} / {{ galleryPhotos.length }}
      </div>
    </div>
  </main>
</template>
