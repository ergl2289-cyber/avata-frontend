<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Heart, ImageOff, Eye } from 'lucide-vue-next'
import type { CarListItem } from '@/types/car'
import { coverUrl } from '@/api/assets'
import { carTitle, formatListingDate, formatMileage, formatPrice } from '@/utils/format'
import { useTelegram } from '@/composables/useTelegram'

const props = defineProps<{ car: CarListItem }>()
const emit = defineEmits<{ remove: [id: number] }>()

const router = useRouter()
const { haptic } = useTelegram()

const cover = computed(() => coverUrl(props.car.files))
const title = computed(() => carTitle(props.car))
const meta = computed(() => `${props.car.year}, ${formatMileage(props.car.mileage)}`)
const date = computed(() => formatListingDate(props.car.date_created))

function open() {
  haptic('light')
  router.push({ name: 'car', params: { id: props.car.id } })
}

function onHeart() {
  haptic('light')
  emit('remove', props.car.id)
}
</script>

<template>
  <article
    class="flex cursor-pointer select-none gap-3 transition-transform duration-fast ease-out-ios active:scale-[0.99]"
    @click="open"
  >
    <!-- Photo -->
    <div class="relative h-28 w-28 shrink-0 overflow-hidden rounded-card bg-surface">
      <img
        v-if="cover"
        :src="cover"
        :alt="title"
        loading="lazy"
        class="h-full w-full object-cover"
      />
      <div v-else class="flex h-full w-full items-center justify-center text-text-faint">
        <ImageOff :size="24" :stroke-width="1.6" />
      </div>
    </div>

    <!-- Info -->
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-start gap-2">
        <p class="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-text line-clamp-2">
          {{ title }}
        </p>
        <button
          type="button"
          aria-label="Убрать из избранного"
          class="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-fast ease-out-ios active:scale-90"
          @click.stop.prevent="onHeart"
        >
          <Heart :size="22" :stroke-width="2" class="fill-like text-like" />
        </button>
      </div>

      <p class="mt-0.5 text-[13px] text-text-muted">{{ meta }}</p>
      <p class="mt-0.5 truncate text-[13px] text-text-muted">{{ car.city.name }}</p>
      <p v-if="date" class="mt-0.5 text-[12px] text-text-faint">{{ date }}</p>
      <p class="mt-0.5 flex items-center gap-2 text-[11px] text-text-faint">
        <span class="flex items-center gap-0.5"><Eye :size="12" /> {{ car.views_global }}</span>
        <span class="flex items-center gap-0.5"><Heart :size="12" /> {{ car.likes_global }}</span>
      </p>

      <p class="mt-auto pt-1.5 text-[17px] font-bold leading-none text-text">
        {{ formatPrice(car.price) }}
      </p>
    </div>
  </article>
</template>
