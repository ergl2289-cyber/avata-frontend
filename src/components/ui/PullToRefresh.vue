<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTelegram } from '@/composables/useTelegram'

/**
 * Pull-to-refresh wrapper (Avito-style), with a matching bounce at the bottom.
 *
 * Top: when the page is at the top, a downward drag opens a gap, the spinner
 * floats centered in it, and — past the threshold — `onRefresh` runs.
 *
 * Bottom: when the page is scrolled to the end, an upward drag past the last
 * card opens the same kind of gap with the same ring — purely a "you've hit
 * the end" bounce, it always springs back and never fires `onRefresh`.
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

const offset = ref(0) // top gap height (content translateY)
const bottomOffset = ref(0) // bottom gap height (bounce only, never triggers a load)
const refreshing = ref(false)
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
const bottomSpinnerY = computed(() => -bottomOffset.value / 2 + SPIN / 2)

function onStart(e: TouchEvent) {
  if (refreshing.value || props.disabled || e.touches.length !== 1) {
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

  // First real movement decides the direction/mode for the rest of the gesture.
  if (mode === null) {
    if (dy > 4 && atTop()) mode = 'top'
    else if (dy < -4 && atBottom()) mode = 'bottom'
    else return
  }

  if (mode === 'top') {
    if (dy <= 0 || !atTop()) {
      if (!dragging.value) armed = false
      return
    }
    offset.value = MAX * (1 - Math.exp(-dy / DAMP))
    dragging.value = true
    if (e.cancelable) e.preventDefault()
    if (!passed && offset.value >= THRESHOLD) {
      passed = true
      haptic('light')
    } else if (passed && offset.value < THRESHOLD) {
      passed = false
    }
  } else {
    const up = -dy
    if (up <= 0 || !atBottom()) {
      if (!dragging.value) armed = false
      return
    }
    bottomOffset.value = MAX * (1 - Math.exp(-up / DAMP))
    dragging.value = true
    if (e.cancelable) e.preventDefault()
    if (!passed && bottomOffset.value >= THRESHOLD) {
      passed = true
      haptic('light')
    } else if (passed && bottomOffset.value < THRESHOLD) {
      passed = false
    }
  }
}

async function onEnd() {
  if (!armed) return
  armed = false
  dragging.value = false

  if (mode === 'bottom') {
    // Always a bounce — spring back, no refresh action.
    bottomOffset.value = 0
    mode = null
    return
  }

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

    <!-- Bottom indicator (same ring, mirrored — bounce only, never spins/loads) -->
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center"
      :style="{
        transform: `translate3d(0, ${bottomSpinnerY}px, 0)`,
        opacity: bottomProgress,
        transition: dragging ? 'none' : `transform 0.4s ${ease}, opacity 0.25s ease`,
      }"
    >
      <span
        class="block rounded-full border-2 border-text-faint border-t-text"
        :style="{
          width: `${SPIN}px`,
          height: `${SPIN}px`,
          transform: `rotate(${-bottomOffset * 3.2}deg) scale(${0.5 + 0.5 * bottomProgress})`,
        }"
      />
    </div>
  </div>
</template>
