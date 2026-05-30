<script setup lang="ts">
import { computed } from 'vue'
import { Heart } from 'lucide-vue-next'
import { useFavoritesStore } from '@/stores/favorites'
import { useTelegram } from '@/composables/useTelegram'

const props = defineProps<{ carId: number }>()

const favorites = useFavoritesStore()
const { haptic } = useTelegram()

const liked = computed(() => favorites.isLiked(props.carId))

function onToggle() {
  haptic('light')
  favorites.toggle(props.carId)
}
</script>

<template>
  <button
    type="button"
    :aria-pressed="liked"
    aria-label="В избранное"
    class="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 backdrop-blur-md transition-transform duration-fast ease-out-ios active:scale-90"
    @click.stop.prevent="onToggle"
  >
    <Heart
      :size="20"
      :stroke-width="2"
      class="transition-colors duration-fast"
      :class="liked ? 'fill-like text-like' : 'fill-transparent text-white'"
    />
  </button>
</template>
