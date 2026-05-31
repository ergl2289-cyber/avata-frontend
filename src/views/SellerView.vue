<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Car, Star, MessageSquare } from 'lucide-vue-next'
import CarCard from '@/components/car/CarCard.vue'
import { backend } from '@/api/cars.service'
import type { CarListItem } from '@/types/car'
import { useTelegram } from '@/composables/useTelegram'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { haptic } = useTelegram()

const tab = ref<'listings' | 'reviews'>('listings')
const loading = ref(true)
const sellerName = ref('')
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
const reviewSubmitting = ref(false)
const reviewError = ref<string | null>(null)

function openReviewForm() {
  reviewRating.value = 5
  reviewText.value = ''
  reviewError.value = null
  reviewOpen.value = true
}

async function submitReview() {
  reviewSubmitting.value = true
  reviewError.value = null
  try {
    await backend.createReview({
      seller_id: Number(props.id),
      rating: reviewRating.value,
      text: reviewText.value.trim() || null,
    })
    reviewOpen.value = false
    reviewText.value = ''
    // Reload reviews + rating
    await Promise.all([
      loadReviews(),
      backend.getSellerRating(Number(props.id)).then(r => {
        sellerRating.value = r.avg_rating
        reviewCount.value = r.review_count
      }),
    ])
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
    sellerName.value = carsRes.items[0]?.model_name ? `${carsRes.items[0].brand_name}` : ''
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
  <main class="min-h-dvh bg-bg">
    <header class="sticky top-0 z-30 bg-bg/90 backdrop-blur-xl safe-top">
      <div class="flex items-center gap-3 px-3 py-3">
        <button
          type="button"
          aria-label="Назад"
          class="flex h-10 w-9 shrink-0 items-center justify-center rounded-full text-text transition-transform duration-fast ease-out-ios active:scale-90"
          @click="goBack"
        >
          <ChevronLeft :size="24" />
        </button>
        <div v-if="!loading" class="min-w-0 flex-1">
          <h1 class="truncate text-[17px] font-semibold text-text">{{ sellerName }}</h1>
          <p class="text-[12px] text-text-muted">
            <template v-if="sellerRating != null">
              <Star :size="12" class="mb-px inline text-yellow-400" fill="currentColor" />
              {{ sellerRating.toFixed(1) }} · {{ reviewCount }} {{ reviewCount === 1 ? 'отзыв' : reviewCount < 5 ? 'отзыва' : 'отзывов' }}
            </template>
            <template v-else>Нет отзывов</template>
          </p>
        </div>
      </div>

      <nav class="flex gap-5 px-4">
        <button
          v-for="t in ([
            { key: 'listings' as const, label: 'Объявления', count: listings.length },
            { key: 'reviews' as const, label: 'Отзывы', count: reviewCount },
          ])"
          :key="t.key"
          type="button"
          class="relative -mb-px pb-2.5 pt-1 text-[16px] font-semibold transition-colors duration-fast"
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

    <section class="px-4 pt-4">
      <div v-if="loading" class="flex justify-center py-12">
        <span class="h-6 w-6 animate-spin rounded-full border-2 border-text-faint border-t-text" />
      </div>

      <!-- Listings -->
      <template v-else-if="tab === 'listings'">
        <div v-if="!listings.length" class="flex flex-col items-center gap-3 py-20 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface">
            <Car :size="26" :stroke-width="1.6" class="text-text-muted" />
          </div>
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
                <Star :size="14" class="text-yellow-400" fill="currentColor" /> {{ r.rating }}
              </span>
            </div>
            <p v-if="r.text" class="mt-2 text-[14px] leading-relaxed text-text">{{ r.text }}</p>
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
  </main>
</template>
