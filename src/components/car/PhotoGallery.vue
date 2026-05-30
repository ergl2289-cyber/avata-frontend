<script setup lang="ts">
import { computed, ref } from 'vue'
import { ImageOff } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{ photos: string[]; alt: string; ratio?: 'tall' | 'wide' }>(),
  { ratio: 'tall' },
)

// Static classes so Tailwind keeps them; "tall" = detail hero, "wide" = feed.
const ratioClass = computed(() => (props.ratio === 'wide' ? 'aspect-[16/10]' : 'aspect-[4/3]'))

const current = ref(0)
const track = ref<HTMLElement | null>(null)

// Native scroll-snap carousel; the active index follows the scroll position.
function onScroll() {
  const el = track.value
  if (!el || !el.clientWidth) return
  current.value = Math.round(el.scrollLeft / el.clientWidth)
}
</script>

<template>
  <div class="relative select-none bg-surface">
    <div
      v-if="photos.length"
      ref="track"
      class="no-scrollbar flex w-full snap-x snap-mandatory overflow-x-auto"
      :class="ratioClass"
      @scroll.passive="onScroll"
    >
      <img
        v-for="(url, i) in photos"
        :key="i"
        :src="url"
        :alt="alt"
        :draggable="false"
        class="h-full w-full shrink-0 snap-center object-cover"
      />
    </div>

    <div
      v-else
      class="flex w-full items-center justify-center text-text-faint"
      :class="ratioClass"
    >
      <ImageOff :size="40" :stroke-width="1.4" />
    </div>

    <!-- Position dots -->
    <div
      v-if="photos.length > 1"
      class="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5"
    >
      <span
        v-for="(_, i) in photos"
        :key="i"
        class="h-1.5 rounded-full transition-all duration-fast ease-out-ios"
        :class="i === current ? 'w-4 bg-white' : 'w-1.5 bg-white/45'"
      />
    </div>
  </div>
</template>
