<script setup lang="ts">
import { computed, ref } from 'vue'
import { ImageOff, Play } from 'lucide-vue-next'

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
const videoEl = ref<HTMLVideoElement | null>(null)
const playing = ref(false)

// Native scroll-snap carousel; the active index follows the scroll position.
function onScroll() {
  const el = track.value
  if (!el || !el.clientWidth) return
  current.value = Math.round(el.scrollLeft / el.clientWidth)
  // Swiping away from the video slide pauses it.
  if (hasVideo.value && current.value !== 0 && playing.value) {
    videoEl.value?.pause()
  }
}

function playVideo() {
  const v = videoEl.value
  if (!v) return
  v.play().catch(() => {
    /* autoplay restrictions — the native controls remain available */
  })
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
      <!-- Video slide (first): poster with a play button → native player -->
      <div v-if="hasVideo" class="relative h-full w-full shrink-0 snap-center">
        <video
          ref="videoEl"
          :src="videoUrl!"
          :poster="videoPosterUrl ?? undefined"
          playsinline
          preload="none"
          controls
          class="h-full w-full object-cover"
          @play="playing = true"
          @pause="playing = false"
        />
        <button
          v-if="!playing"
          type="button"
          aria-label="Смотреть видео"
          class="absolute inset-0 flex items-center justify-center"
          @click="playVideo"
        >
          <span
            class="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition-transform duration-fast ease-out-ios active:scale-90"
          >
            <Play :size="26" :stroke-width="2" class="ml-1" fill="currentColor" />
          </span>
        </button>
      </div>

      <img
        v-for="(url, i) in photos"
        :key="i"
        :src="url"
        :alt="alt"
        :draggable="false"
        :loading="i === 0 && !hasVideo ? 'eager' : 'lazy'"
        decoding="async"
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
      v-if="slideCount > 1"
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
