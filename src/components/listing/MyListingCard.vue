<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, Heart, ImageOff, Pencil } from 'lucide-vue-next'
import type { MyCarListItem } from '@/types/car'
import { coverUrl } from '@/api/assets'
import { carTitle, formatPrice, groupThousands } from '@/utils/format'
import { useTelegram } from '@/composables/useTelegram'
import StatusChip from './StatusChip.vue'

const props = defineProps<{ car: MyCarListItem }>()

const router = useRouter()
const { haptic } = useTelegram()

const cover = computed(() => coverUrl(props.car.files))
const title = computed(() => carTitle(props.car))

function open() {
  haptic('light')
  router.push({ name: 'car', params: { id: props.car.id } })
}
function edit() {
  haptic('light')
  // editing reuses the creation wizard, prefilled from this listing
  router.push({ name: 'post', query: { car: props.car.id } })
}
</script>

<template>
  <article
    class="flex cursor-pointer select-none gap-3 transition-transform duration-fast ease-out-ios active:scale-[0.99]"
    @click="open"
  >
    <div class="relative h-24 w-24 shrink-0 overflow-hidden rounded-card bg-surface">
      <img v-if="cover" :src="cover" :alt="title" loading="lazy" class="h-full w-full object-cover" />
      <div v-else class="flex h-full w-full items-center justify-center text-text-faint">
        <ImageOff :size="22" :stroke-width="1.6" />
      </div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-start gap-2">
        <p class="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-text line-clamp-2">
          {{ title }}
        </p>
        <button
          type="button"
          aria-label="Редактировать"
          class="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-transform duration-fast ease-out-ios active:scale-90"
          @click.stop.prevent="edit"
        >
          <Pencil :size="18" :stroke-width="2" />
        </button>
      </div>

      <p class="mt-0.5 text-[16px] font-bold leading-none text-text">{{ formatPrice(car.price) }}</p>

      <div class="mt-auto flex items-center gap-3 pt-2">
        <StatusChip :status="car.moderation_status" />
        <span class="flex items-center gap-1 text-[12px] text-text-muted">
          <Eye :size="14" :stroke-width="1.8" /> {{ groupThousands(car.views_global) }}
        </span>
        <span class="flex items-center gap-1 text-[12px] text-text-muted">
          <Heart :size="14" :stroke-width="1.8" /> {{ groupThousands(car.likes_global) }}
        </span>
      </div>
    </div>
  </article>
</template>
