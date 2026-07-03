<script setup lang="ts">
import { ref } from 'vue'
import { Camera, Video, X } from 'lucide-vue-next'
import type { ListingForm } from '@/types/listing'
import { useTelegram } from '@/composables/useTelegram'
import { useListingVideo, VIDEO_MAX_SECONDS } from '@/composables/useListingVideo'

const props = defineProps<{ form: ListingForm }>()
const { haptic } = useTelegram()
const {
  videoPreviewUrl,
  videoPreviewPosterUrl,
  videoError,
  existingPosterUrl,
  setVideo,
  clearVideo,
} = useListingVideo()

const MAX = 10
const input = ref<HTMLInputElement | null>(null)
const videoInput = ref<HTMLInputElement | null>(null)

function pick() {
  input.value?.click()
}

function pickVideo() {
  videoInput.value?.click()
}

async function onVideo(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!f) return
  if (await setVideo(f)) haptic('light')
}

function removeVideo() {
  haptic('light')
  clearVideo()
}

function onFiles(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  const room = MAX - props.form.photos.length
  Array.from(files)
    .slice(0, room)
    .forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') props.form.photos.push(reader.result)
      }
      reader.readAsDataURL(file)
    })
  ;(e.target as HTMLInputElement).value = ''
}

function remove(i: number) {
  haptic('light')
  props.form.photos.splice(i, 1)
}
</script>

<template>
  <div>
    <p class="mb-3 text-[15px] font-semibold text-text">Фотографии</p>
    <div class="grid grid-cols-3 gap-3">
      <!-- existing photos -->
      <div
        v-for="(photo, i) in form.photos"
        :key="i"
        class="relative aspect-square overflow-hidden rounded-card bg-surface"
      >
        <img :src="photo" alt="" class="h-full w-full object-cover" />
        <button
          type="button"
          aria-label="Удалить фото"
          class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md active:scale-90"
          @click="remove(i)"
        >
          <X :size="15" />
        </button>
      </div>

      <!-- add tile -->
      <button
        v-if="form.photos.length < MAX"
        type="button"
        class="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-card bg-surface text-text-muted transition-transform duration-fast ease-out-ios active:scale-95"
        @click="pick"
      >
        <Camera :size="26" :stroke-width="1.6" />
        <span class="text-[13px]">Добавить</span>
      </button>
    </div>

    <p class="mt-3 text-[13px] text-text-muted">До {{ MAX }} фото. Первое станет обложкой.</p>

    <!-- Video (one clip; compressed server-side). Same rhythm as the photos block:
         semibold title, tiles, then a muted hint. Height kept compact (h-28) so the
         hint below never falls off-screen. -->
    <p class="mb-3 mt-5 text-[15px] font-semibold text-text">Видео</p>

    <!-- Picked (or existing) clip: 16:9 tile, ~2/3 width so the hint stays on screen -->
    <div
      v-if="videoPreviewUrl || existingPosterUrl"
      class="relative aspect-video w-2/3 overflow-hidden rounded-card bg-surface"
    >
      <!-- Title frame of the clip (like a photo thumbnail); <video> as fallback.
           The #t=0.5 fragment makes the fallback show a real frame, not black. -->
      <img
        v-if="videoPreviewPosterUrl || existingPosterUrl"
        :src="(videoPreviewPosterUrl ?? existingPosterUrl)!"
        alt=""
        class="h-full w-full object-cover"
      />
      <video
        v-else
        :src="videoPreviewUrl! + '#t=0.5'"
        muted
        playsinline
        preload="auto"
        class="h-full w-full object-cover"
      />
      <span
        class="pointer-events-none absolute bottom-2 left-2 rounded-pill bg-black/55 px-2 py-0.5 text-[12px] text-white backdrop-blur-md"
      >
        {{ videoPreviewUrl ? 'Загрузится при публикации' : 'Видео загружено' }}
      </span>
      <button
        type="button"
        aria-label="Удалить видео"
        class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md active:scale-90"
        @click="removeVideo"
      >
        <X :size="15" />
      </button>
    </div>

    <!-- Add tile: same 16:9 shape as the preview -->
    <button
      v-else
      type="button"
      class="flex aspect-video w-2/3 flex-col items-center justify-center gap-1.5 rounded-card bg-surface text-text-muted transition-transform duration-fast ease-out-ios active:scale-[0.98]"
      @click="pickVideo"
    >
      <Video :size="26" :stroke-width="1.6" />
      <span class="text-[13px]">Добавить видео</span>
    </button>

    <p class="mt-3 text-[13px]" :class="videoError ? 'text-like' : 'text-text-muted'">
      {{ videoError ?? `Одно видео до ${VIDEO_MAX_SECONDS} секунд и 100 МБ.` }}
    </p>

    <input
      ref="input"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="onFiles"
    />
    <input
      ref="videoInput"
      type="file"
      accept="video/*"
      class="hidden"
      @change="onVideo"
    />
  </div>
</template>
