<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from 'lucide-vue-next'

/**
 * Единый видеоплеер приложения — полностью свой UI на native <video>, без
 * стороннего скина. Ключевое решение: «полноэкранный» режим — это НЕ вызов
 * браузерного/нативного Fullscreen API (на iPhone он всегда подменяется
 * системным AVKit-плеером со своими контролами — от него мы и уходим), а
 * просто CSS-оверлей на весь экран (position: fixed) с тем же <video>
 * элементом, перемещённым через Teleport. Плавно, одинаково на всех
 * платформах, без чужого UI.
 */
const { src, poster } = defineProps<{ src: string; poster?: string | null }>()

const videoEl = ref<HTMLVideoElement | null>(null)
const playing = ref(false)
const muted = ref(false)
const duration = ref(0)
const currentTime = ref(0)
const fullscreen = ref(false)

const progressPct = () => (duration.value ? (currentTime.value / duration.value) * 100 : 0)

function togglePlay() {
  const v = videoEl.value
  if (!v) return
  if (v.paused) v.play().catch(() => {})
  else v.pause()
}

function onTimeUpdate() {
  currentTime.value = videoEl.value?.currentTime ?? 0
}

function onLoadedMetadata() {
  duration.value = videoEl.value?.duration || 0
}

function onSeek(e: Event) {
  const v = videoEl.value
  if (!v) return
  v.currentTime = Number((e.target as HTMLInputElement).value)
}

function toggleMute() {
  muted.value = !muted.value
  if (videoEl.value) videoEl.value.muted = muted.value
}

function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && fullscreen.value) fullscreen.value = false
}

watch(fullscreen, (on) => {
  document.body.style.overflow = on ? 'hidden' : ''
  if (on) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})

function formatTime(s: number): string {
  if (!Number.isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function pause() {
  videoEl.value?.pause()
}
defineExpose({ pause })
</script>

<template>
  <Teleport to="body" :disabled="!fullscreen">
    <div
      class="avata-player select-none"
      :class="
        fullscreen
          ? 'fixed inset-0 z-[999] flex items-center justify-center bg-black'
          : 'relative h-full w-full bg-black'
      "
    >
      <video
        ref="videoEl"
        :src="src"
        :poster="poster ?? undefined"
        playsinline
        preload="none"
        :muted="muted"
        class="pointer-events-none"
        style="touch-action: pan-x"
        :class="fullscreen ? 'max-h-full max-w-full' : 'h-full w-full object-cover'"
        @play="playing = true"
        @pause="playing = false"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
      />

      <!-- Прозрачный слой поверх <video>: WebKit игнорирует touch-action на самом
           video (своя системная обработка жестов), из-за чего вертикальный
           свайп по видео «утаскивал» его за рамки. Касания принимает этот слой
           (video — pointer-events-none), тут touch-action реально работает. -->
      <button
        type="button"
        aria-label="Смотреть / пауза"
        class="absolute inset-0"
        style="touch-action: pan-x"
        @click="togglePlay"
      />

      <!-- Big play button — shown until first play -->
      <div
        v-if="!playing"
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span
          class="flex items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition-transform duration-fast ease-out-ios active:scale-90"
          :class="fullscreen ? 'h-16 w-16' : 'h-14 w-14'"
        >
          <Play :size="fullscreen ? 30 : 26" :stroke-width="2" class="ml-1" fill="currentColor" />
        </span>
      </div>

      <!-- Exit fullscreen (top-left, only in fullscreen) -->
      <button
        v-if="fullscreen"
        type="button"
        aria-label="Свернуть"
        class="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md active:scale-90"
        style="top: calc(12px + env(safe-area-inset-top, 0px))"
        @click="toggleFullscreen"
      >
        <Minimize2 :size="18" />
      </button>

      <!-- Control bar -->
      <div
        class="absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-black/55 px-3 backdrop-blur-md"
        :style="{
          height: fullscreen ? '64px' : '40px',
          paddingBottom: fullscreen ? 'env(safe-area-inset-bottom, 0px)' : '0px',
        }"
      >
        <button
          type="button"
          :aria-label="playing ? 'Пауза' : 'Смотреть'"
          class="flex shrink-0 items-center justify-center text-white active:scale-90"
          @click="togglePlay"
        >
          <Pause v-if="playing" :size="fullscreen ? 22 : 18" fill="currentColor" />
          <Play v-else :size="fullscreen ? 22 : 18" fill="currentColor" />
        </button>

        <input
          type="range"
          class="avata-seek min-w-0 flex-1"
          :min="0"
          :max="duration || 0"
          :value="currentTime"
          step="0.1"
          :style="{ '--pct': `${progressPct()}%` }"
          @input="onSeek"
        />

        <span v-if="fullscreen" class="shrink-0 text-[12px] tabular-nums text-white/80">
          {{ formatTime(currentTime) }}
        </span>

        <button
          type="button"
          :aria-label="muted ? 'Включить звук' : 'Выключить звук'"
          class="flex shrink-0 items-center justify-center text-white active:scale-90"
          @click="toggleMute"
        >
          <VolumeX v-if="muted" :size="fullscreen ? 20 : 16" />
          <Volume2 v-else :size="fullscreen ? 20 : 16" />
        </button>

        <button
          type="button"
          aria-label="На весь экран"
          class="flex shrink-0 items-center justify-center text-white active:scale-90"
          @click="toggleFullscreen"
        >
          <Minimize2 v-if="fullscreen" :size="18" />
          <Maximize2 v-else :size="16" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Кастомный <input type="range"> в стиле приложения: белый прогресс поверх
   полупрозрачного трека, маленький белый бегунок — тот же язык, что и
   остальные слайдеры/полосы прогресса в проекте. */
.avata-seek {
  -webkit-appearance: none;
  appearance: none;
  height: 3px;
  border-radius: 9999px;
  background: linear-gradient(
    to right,
    #fff var(--pct),
    rgba(255, 255, 255, 0.3) var(--pct)
  );
  outline: none;
}
.avata-seek::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  background: #fff;
}
.avata-seek::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: none;
  border-radius: 9999px;
  background: #fff;
}
.avata-seek::-moz-range-track {
  height: 3px;
  border-radius: 9999px;
  background: transparent;
}
</style>
