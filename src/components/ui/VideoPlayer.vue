<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import type Player from 'video.js/dist/types/player'

/**
 * Единый видеоплеер приложения (Video.js) — один и тот же минималистичный UI на
 * всех платформах, включая iOS (preferFullWindow вместо нативного плеера).
 * Никаких меню скорости/качества: они в Video.js появляются только если их
 * включить, так что просто не включаем. PiP-кнопка убрана.
 */
const props = defineProps<{ src: string; poster?: string | null }>()

const el = ref<HTMLVideoElement | null>(null)
let player: Player | null = null

onMounted(() => {
  player = videojs(el.value!, {
    controls: true,
    preload: 'none',
    fill: true, // fills the slide box; the video keeps its aspect via letterboxing
    playsinline: true,
    // iOS has no element-fullscreen API → Video.js would fall back to the native
    // player; full-window mode keeps our UI on every platform instead.
    preferFullWindow: true,
    poster: props.poster ?? undefined,
    sources: [{ src: props.src, type: 'video/mp4' }],
    controlBar: {
      pictureInPictureToggle: false,
      remainingTimeDisplay: false,
    },
  })

  // iOS letterboxes the video (aspect preserved) inside the full-window black
  // backdrop, but Video.js by default docks the control bar to the *screen*
  // bottom — leaving a dead gap between the video and the bar. The CSS below
  // turns the fullscreen player into a centered flex column sized to the
  // video's real aspect ratio, so the bar sits right on the video edge. It
  // needs that ratio as a CSS var since it isn't known until metadata loads.
  player.on('loadedmetadata', () => {
    const w = player!.videoWidth()
    const h = player!.videoHeight()
    if (w && h) {
      ;(player!.el() as HTMLElement).style.setProperty('--avata-video-ar', `${w} / ${h}`)
    }
  })
})

onBeforeUnmount(() => {
  player?.dispose()
  player = null
})

function pause() {
  player?.pause()
}
defineExpose({ pause })
</script>

<template>
  <div class="avata-player h-full w-full">
    <video ref="el" class="video-js" playsinline />
  </div>
</template>

<style>
/* Video.js в дизайн-токенах приложения: тёмный монохром, мягкие радиусы,
   полупрозрачные подложки с блюром — как остальные оверлеи (кнопки галереи). */
.avata-player .video-js {
  width: 100%;
  height: 100%;
  background: #000;
  font-size: 12px;
  font-family: inherit;
}

/* Big play: круглая кнопка по центру, как наша самодельная была */
.avata-player .vjs-big-play-button {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 56px;
  height: 56px;
  margin: 0;
  border: none;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1);
}
.avata-player .vjs-big-play-button .vjs-icon-placeholder::before {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
}
.avata-player .video-js:hover .vjs-big-play-button,
.avata-player .vjs-big-play-button:focus {
  background: rgba(0, 0, 0, 0.7);
}
.avata-player .vjs-big-play-button:active {
  transform: translate(-50%, -50%) scale(0.9);
}

/* Control bar: полупрозрачная тёмная полоса с блюром */
.avata-player .vjs-control-bar {
  height: 40px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
}

/* Полноэкранный/full-window режим. preferFullWindow вешает класс
   vjs-full-window на <body> (не на сам плеер), поэтому селекторы идут
   от body. Видео леттербоксится (сохраняет пропорции) внутри чёрного
   fullscreen-фона — по умолчанию Video.js при этом прибивает панель
   управления к низу ЭКРАНА, оставляя пустой зазор под самим видео.
   Вместо этого: контейнер становится центрирующим flex-столбцом, video
   получает высоту по своему реальному соотношению сторон (--avata-video-ar,
   выставляется в скрипте из loadedmetadata), а панель идёт следом в потоке
   и накладывается на нижний край видео отрицательным отступом — то есть
   реально лежит на видео, а не висит в черноте под ним. */
body.vjs-full-window .video-js.vjs-fullscreen {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
}
body.vjs-full-window .video-js.vjs-fullscreen .vjs-tech {
  position: static !important;
  width: 100% !important;
  height: auto !important;
  max-height: 100dvh;
  aspect-ratio: var(--avata-video-ar, 16 / 9);
}
body.vjs-full-window .vjs-control-bar,
.avata-player .video-js.vjs-fullscreen .vjs-control-bar {
  height: 64px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
}
body.vjs-full-window .video-js.vjs-fullscreen .vjs-control-bar {
  position: relative !important;
  width: 100%;
  margin-top: -64px;
  z-index: 2;
}
body.vjs-full-window .vjs-control-bar .vjs-control,
.avata-player .video-js.vjs-fullscreen .vjs-control-bar .vjs-control {
  width: 4em;
}
body.vjs-full-window .vjs-progress-control,
.avata-player .video-js.vjs-fullscreen .vjs-progress-control {
  height: 1.2em;
}

/* Прогресс и громкость — белые, как весь монохром */
.avata-player .vjs-play-progress,
.avata-player .vjs-volume-level {
  background: #fff;
}
.avata-player .vjs-slider {
  background: rgba(255, 255, 255, 0.25);
}
.avata-player .vjs-load-progress,
.avata-player .vjs-load-progress div {
  background: rgba(255, 255, 255, 0.35);
}

/* Спиннер загрузки в стиле приложения */
.avata-player .vjs-loading-spinner {
  border-color: rgba(255, 255, 255, 0.25);
}

/* Постер аккуратно заполняет слайд */
.avata-player .vjs-poster img {
  object-fit: cover;
}
</style>
