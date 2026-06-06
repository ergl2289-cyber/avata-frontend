<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, Heart } from 'lucide-vue-next'
import PhotoGallery from './PhotoGallery.vue'
import LikeButton from './LikeButton.vue'
import BoostBadge from './BoostBadge.vue'
import type { CarListItem } from '@/types/car'
import { galleryUrls } from '@/api/assets'
import { carSpecLine, carTitle, formatMileage, formatPrice, formatListingDate } from '@/utils/format'
import { useTelegram } from '@/composables/useTelegram'

const props = defineProps<{ car: CarListItem }>()

const router = useRouter()
const { haptic } = useTelegram()

const photos = computed(() => galleryUrls(props.car.files))
const price = computed(() => formatPrice(props.car.price))
const title = computed(() => `${carTitle(props.car)}, ${props.car.year}`)
const specLine = computed(() => carSpecLine(props.car.technical_specs))
const meta = computed(() => formatMileage(props.car.mileage))

function open() {
  haptic('light')
  router.push({ name: 'car', params: { id: props.car.id } })
}
</script>

<template>
  <article class="select-none">
    <!-- Photo gallery (swipeable) + like. A tap bubbles to open; a horizontal
         drag scrolls the gallery and fires no click, so swipe still works. -->
    <div class="relative overflow-hidden rounded-card" @click="open">
      <PhotoGallery :photos="photos" :alt="title" ratio="wide" />
      <div class="absolute right-2.5 top-2.5">
        <LikeButton :car-id="car.id" />
      </div>
      <BoostBadge
        :boosted="car.is_boosted"
        :until="car.boosted_until"
        class="absolute left-2.5 top-2.5"
      />
    </div>

    <!-- Info -->
    <button
      type="button"
      class="block w-full px-0.5 pt-2.5 text-left transition-transform duration-fast ease-out-ios active:scale-[0.99]"
      @click="open"
    >
      <p class="text-[22px] font-bold leading-none text-text">{{ price }}</p>
      <p class="mt-2 text-[15px] font-semibold leading-snug text-text">{{ title }}</p>
      <p v-if="specLine" class="mt-1 text-[13px] leading-snug text-text-muted">{{ specLine }}</p>
      <p class="mt-1.5 text-[13px] text-text-muted">{{ meta }}</p>
      <p class="mt-1.5 text-[13px] text-text-muted">{{ car.city.name }}</p>
      <p class="mt-0.5 text-[12px] text-text-faint">{{ formatListingDate(car.date_created) }}</p>
      <p class="mt-0.5 flex items-center gap-2 text-[11px] text-text-faint">
        <span class="flex items-center gap-0.5"><Eye :size="12" /> {{ car.views_global }}</span>
        <span class="flex items-center gap-0.5"><Heart :size="12" /> {{ car.likes_global }}</span>
      </p>
    </button>
  </article>
</template>
