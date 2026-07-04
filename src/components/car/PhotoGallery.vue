<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { ImageOff } from 'lucide-vue-next'

// Video.js подтягивается только когда в объявлении реально есть видео —
// не раздуваем чанки экранов без него.
const VideoPlayer = defineAsyncComponent(() => import('@/components/ui/VideoPlayer.vue'))

const props = withDefaults(
  defineProps<{
    photos: string[]
    alt: string
    ratio?: 'tall' | 'wide'
    /** Optional listing video: becomes the first slide (poster + tap-to-play). */
    videoUrl?: string | null
    videoPosterUrl?: string | null
  }>(),
  { ratio: 'tall', videoUrl: null, videoPosterUrl: null },
)

// Static classes so Tailwind keeps them; "tall" = detail hero, "wide" = feed.
const ratioClass = computed(() => (props.ratio === 'wide' ? 'aspect-[16/10]' : 'aspect-[4/3]'))

const hasVideo = computed(() => !!props.videoUrl)
const slideCount = computed(() => props.photos.length + (hasVideo.value ? 1 : 0))

const current = ref(0)
const track = ref<HTMLElement | null>(null)
const playerRef = ref<{ pause: () => void } | null>(null)

// Native scroll-snap carousel; the active index follows the scroll position.
function onScroll() {
  const el = track.value
  if (!el || !el.clientWidth) return
  current.value = Math.round(el.scrollLeft / el.clientWidth)
  // Swiping away from the video slide pauses it.
  if (hasVideo.value && current.value !== 0) {
    playerRef.value?.pause()
  }
}
</script>

<template>
  <div class="relative select-none bg-surface">
    <div
      v-if="slideCount"
      ref="track"
      class="no-scrollbar flex w-full snap-x snap-mandatory overflow-x-auto"
      :class="ratioClass"
      @scroll.passive="onScroll"
    >
      <!-- Видео-слайд (первый): свой плеер. snap-always — иначе на iOS Safari
           карусель с этим слайдом может «залипать» на полпути между слайдами
           вместо чёткого прилипания к одному кадру. -->
      <div v-if="hasVideo" class="relative h-full w-full shrink-0 snap-center snap-always">
        <VideoPlayer ref="playerRef" :src="videoUrl!" :poster="videoPosterUrl" />
      </div>

      <img
        v-for="(url, i) in photos"
        :key="i"
        :src="url"
        :alt="alt"
        :draggable="false"
        :loading="i === 0 && !hasVideo ? 'eager' : 'lazy'"
        decoding="async"
        class="h-full w-full shrink-0 snap-center snap-always object-cover"
      />
    </div>

    <div
      v-else
      class="flex w-full items-center justify-center text-text-faint"
      :class="ratioClass"
    >
      <ImageOff :size="40" :stroke-width="1.4" />
    </div>

    <!-- Position dots — hidden on the video slide, its own control bar sits there -->
    <div
      v-if="slideCount > 1 && !(hasVideo && current === 0)"
      class="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5"
    >
      <span
        v-for="i in slideCount"
        :key="i"
        class="h-1.5 rounded-full transition-all duration-fast ease-out-ios"
        :class="i - 1 === current ? 'w-4 bg-white' : 'w-1.5 bg-white/45'"
      />
    </div>
  </div>
</template>
