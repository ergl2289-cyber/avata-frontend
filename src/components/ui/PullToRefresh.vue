<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTelegram } from '@/composables/useTelegram'

/**
 * Pull-to-refresh wrapper (Avito-style). Wrap a scrollable section; when the page
 * is at the top, a downward drag opens a gap, the spinner floats centered in it,
 * and — past the threshold — `onRefresh` runs. Smooth exponential resistance,
 * haptic at the threshold, gentle spring-back.
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

const offset = ref(0) // current gap height (content translateY)
const refreshing = ref(false)
const dragging = ref(false)

let startY = 0
let armed = false
let passed = false

const atTop = () => window.scrollY <= 0
const progress = computed(() => Math.min(1, offset.value / THRESHOLD))
// Keep the spinner centered in the opening gap → equal space above and below it.
const spinnerY = computed(() => offset.value / 2 - SPIN / 2)

function onStart(e: TouchEvent) {
  if (refreshing.value || props.disabled || e.touches.length !== 1 || !atTop()) {
    armed = false
    return
  }
  startY = e.touches[0].clientY
  armed = true
  passed = false
}

function onMove(e: TouchEvent) {
  if (!armed) return
  const dy = e.touches[0].clientY - startY
  if (dy <= 0 || !atTop()) {
    if (!dragging.value) armed = false
    return
  }
  // Exponential resistance: smoothly approaches MAX, never snaps.
  offset.value = MAX * (1 - Math.exp(-dy / DAMP))
  dragging.value = true
  if (e.cancelable) e.preventDefault()
  if (!passed && offset.value >= THRESHOLD) {
    passed = true
    haptic('light')
  } else if (passed && offset.value < THRESHOLD) {
    passed = false
  }
}

async function onEnd() {
  if (!armed) return
  armed = false
  dragging.value = false
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
    <!-- Indicator (floats centered in the opening gap) -->
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
        transform: `translate3d(0, ${offset}px, 0)`,
        transition: dragging ? 'none' : `transform 0.4s ${ease}`,
        willChange: 'transform',
      }"
    >
      <slot />
    </div>
  </div>
</template>
