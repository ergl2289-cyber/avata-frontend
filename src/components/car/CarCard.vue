<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ImageOff } from 'lucide-vue-next'
import type { CarListItem } from '@/types/car'
import { coverUrl } from '@/api/assets'
import { carTitle, formatMileage, formatPrice } from '@/utils/format'
import { useTelegram } from '@/composables/useTelegram'
import { useTelegramStore } from '@/stores/telegram'
import LikeButton from './LikeButton.vue'

const props = defineProps<{ car: CarListItem }>()

const router = useRouter()
const { haptic } = useTelegram()
const tg = useTelegramStore()

const cover = computed(() => coverUrl(props.car.files))
const title = computed(() => carTitle(props.car))
const price = computed(() => formatPrice(props.car.price))
const meta = computed(() => `${props.car.year}, ${formatMileage(props.car.mileage)}`)

function open() {
  haptic('light')
  if (!tg.initData) {
    alert('Откройте объявление в Telegram: @avata_bot')
    return
  }
  router.push({ name: 'car', params: { id: props.car.id } })
}
</script>

<template>
  <article
    class="group cursor-pointer select-none transition-transform duration-fast ease-out-ios active:scale-[0.98]"
    @click="open"
  >
    <!-- Photo -->
    <div class="relative overflow-hidden rounded-card bg-surface">
      <div class="aspect-[4/5] w-full">
        <img
          v-if="cover"
          :src="cover"
          :alt="title"
          loading="lazy"
          class="h-full w-full object-cover"
        />
        <div v-else class="flex h-full w-full items-center justify-center text-text-faint">
          <ImageOff :size="28" :stroke-width="1.6" />
        </div>
      </div>
      <div class="absolute right-2 top-2">
        <LikeButton :car-id="car.id" />
      </div>
    </div>

    <!-- Info -->
    <div class="px-0.5 pt-2">
      <p class="text-[15px] font-semibold leading-snug text-text line-clamp-2">
        {{ title }}
      </p>
      <p class="mt-0.5 text-[13px] text-text-muted">{{ meta }}</p>
      <p class="mt-1.5 text-[17px] font-bold leading-none text-text">{{ price }}</p>
      <p class="mt-1.5 text-[13px] text-text-muted line-clamp-1">{{ car.city.name }}</p>
    </div>
  </article>
</template>
