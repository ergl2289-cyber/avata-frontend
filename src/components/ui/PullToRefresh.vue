<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTelegram } from '@/composables/useTelegram'

/**
 * Pull-to-refresh wrapper (Avito-style) — works on BOTH edges, identically.
 *
 * Top: at the top of the page, a downward drag opens a gap, the spinner floats
 * centered in it, and — past the threshold — `onRefresh` runs while the spinner
 * spins in the held-open gap, then everything springs back.
 *
 * Bottom: exact mirror. When the page is scrolled to the end, an upward drag
 * opens the same gap below the last card with the same ring; past the threshold
 * it runs the same `onRefresh` (silent reload — the list stays in place, no
 * jump to the top), spinner spins in the held gap, then springs back.
 *
 * Both use smooth exponential resistance, haptic at the threshold, gentle
 * spring-back.
 *
 * NOTE: only wrap content BELOW a sticky header — a CSS transform on a `position:
 * sticky` ancestor breaks the stickiness.
 */
const props = withDefaults(
  defineProps<{
    onRefresh: () => Promise<unknown> | unknown
    disabled?: boolean
  }>(),
  { disabled: false },
)

const { haptic } = useTelegram()

const THRESHOLD = 70 // resisted px needed to trigger
const MAX = 130 // max travel of the gap
const HOLD = 88 // gap height held while refreshing (room around the spinner)
const SPIN = 26 // spinner box size (px)
const DAMP = 150 // higher = looser/smoother resistance

const offset = ref(0) // top gap height (content translateY down)
const bottomOffset = ref(0) // bottom gap height (content translateY up)
const refreshing = ref(false) // top refresh in progress
const bottomRefreshing = ref(false) // bottom refresh in progress
const dragging = ref(false)

let startY = 0
let armed = false
let mode: 'top' | 'bottom' | null = null
let passed = false

const atTop = () => window.scrollY <= 0
const atBottom = () =>
  window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1

const progress = computed(() => Math.min(1, offset.value / THRESHOLD))
const bottomProgress = computed(() => Math.min(1, bottomOffset.value / THRESHOLD))
// Keep the spinner centered in the opening gap → equal space above and below it.
const spinnerY = computed(() => offset.value / 2 - SPIN / 2)
const bottomSpinnerY = computed(() => -(bottomOffset.value / 2 - SPIN / 2))

function onStart(e: TouchEvent) {
  if (
    refreshing.value ||
    bottomRefreshing.value ||
    props.disabled ||
    e.touches.length !== 1
  ) {
    armed = false
    return
  }
  startY = e.touches[0].clientY
  armed = true
  mode = null
  passed = false
}

function onMove(e: TouchEvent) {
  if (!armed) return
  const dy = e.touches[0].clientY - startY

  // First real movement decides the edge for the rest of the gesture.
  if (mode === null) {
    if (dy > 4 && atTop()) mode = 'top'
    else if (dy < -4 && atBottom()) mode = 'bottom'
    else return
  }

  // Mirror: top uses the downward distance, bottom the upward one.
  const pull = mode === 'top' ? dy : -dy
  const edgeStillActive = mode === 'top' ? atTop() : atBottom()
  if (pull <= 0 || !edgeStillActive) {
    if (!dragging.value) armed = false
    return
  }

  // Exponential resistance: smoothly approaches MAX, never snaps.
  const value = MAX * (1 - Math.exp(-pull / DAMP))
  if (mode === 'top') offset.value = value
  else bottomOffset.value = value
  dragging.value = true
  if (e.cancelable) e.preventDefault()

  if (!passed && value >= THRESHOLD) {
    passed = true
    haptic('light')
  } else if (passed && value < THRESHOLD) {
    passed = false
  }
}

async function onEnd() {
  if (!armed) return
  armed = false
  dragging.value = false

  if (mode === 'top') {
    if (offset.value >= THRESHOLD) {
      refreshing.value = true
      offset.value = HOLD
      try {
        await props.onRefresh()
      } finally {
        refreshing.value = false
        offset.value = 0
      }
    } else {
      offset.value = 0
    }
  } else if (mode === 'bottom') {
    if (bottomOffset.value >= THRESHOLD) {
      bottomRefreshing.value = true
      bottomOffset.value = HOLD
      try {
        await props.onRefresh()
      } finally {
        bottomRefreshing.value = false
        bottomOffset.value = 0
      }
    } else {
      bottomOffset.value = 0
    }
  }
  mode = null
}

const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'
</script>

<template>
  <div
    class="relative"
    @touchstart.passive="onStart"
    @touchmove="onMove"
    @touchend="onEnd"
    @touchcancel="onEnd"
  >
    <!-- Top indicator (floats centered in the opening gap) -->
    <div
      class="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
      :style="{
        transform: `translate3d(0, ${spinnerY}px, 0)`,
        opacity: refreshing ? 1 : progress,
        transition: dragging ? 'none' : `transform 0.4s ${ease}, opacity 0.25s ease`,
      }"
    >
      <span
        class="block rounded-full border-2 border-text-faint border-t-text"
        :class="refreshing ? 'animate-spin' : ''"
        :style="{
          width: `${SPIN}px`,
          height: `${SPIN}px`,
          transform: refreshing
            ? 'none'
            : `rotate(${offset * 3.2}deg) scale(${0.5 + 0.5 * progress})`,
        }"
      />
    </div>

    <!-- Content -->
    <div
      :style="{
        transform: `translate3d(0, ${offset - bottomOffset}px, 0)`,
        transition: dragging ? 'none' : `transform 0.4s ${ease}`,
        willChange: 'transform',
      }"
    >
      <slot />
    </div>

    <!-- Bottom indicator (exact mirror of the top one) -->
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center"
      :style="{
        transform: `translate3d(0, ${bottomSpinnerY}px, 0)`,
        opacity: bottomRefreshing ? 1 : bottomProgress,
        transition: dragging ? 'none' : `transform 0.4s ${ease}, opacity 0.25s ease`,
      }"
    >
      <span
        class="block rounded-full border-2 border-text-faint border-t-text"
        :class="bottomRefreshing ? 'animate-spin' : ''"
        :style="{
          width: `${SPIN}px`,
          height: `${SPIN}px`,
          transform: bottomRefreshing
            ? 'none'
            : `rotate(${-bottomOffset * 3.2}deg) scale(${0.5 + 0.5 * bottomProgress})`,
        }"
      />
    </div>
  </div>
</template>
