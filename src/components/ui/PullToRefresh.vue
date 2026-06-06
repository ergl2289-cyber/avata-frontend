<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTelegram } from '@/composables/useTelegram'

/**
 * Pull-to-refresh wrapper (Avito-style). Wrap a scrollable section; when the page
 * is at the top, a downward drag reveals a spinner and — past the threshold —
 * runs `onRefresh`. Minimal, with progressive resistance and haptic feedback.
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

const THRESHOLD = 64 // px of (resisted) pull needed to trigger
const MAX = 92 // px the indicator/content can travel

const pull = ref(0)
const refreshing = ref(false)
const dragging = ref(false)

let startY = 0
let armed = false
let passed = false

const atTop = () => window.scrollY <= 0
const progress = computed(() => Math.min(1, pull.value / THRESHOLD))

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
  // Progressive resistance: easy at first, then stiffer near MAX.
  pull.value = Math.min(MAX, Math.pow(dy, 0.86) * 0.85)
  dragging.value = true
  if (e.cancelable) e.preventDefault()
  if (!passed && pull.value >= THRESHOLD) {
    passed = true
    haptic('light')
  } else if (passed && pull.value < THRESHOLD) {
    passed = false
  }
}

async function onEnd() {
  if (!armed) return
  armed = false
  dragging.value = false
  if (pull.value >= THRESHOLD) {
    refreshing.value = true
    pull.value = THRESHOLD
    try {
      await props.onRefresh()
    } finally {
      refreshing.value = false
      pull.value = 0
    }
  } else {
    pull.value = 0
  }
}
</script>

<template>
  <div
    class="relative"
    @touchstart.passive="onStart"
    @touchmove="onMove"
    @touchend="onEnd"
    @touchcancel="onEnd"
  >
    <!-- Indicator -->
    <div
      class="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
      :style="{
        transform: `translateY(${pull - 30}px)`,
        opacity: refreshing ? 1 : progress,
        transition: dragging
          ? 'none'
          : 'transform 0.32s cubic-bezier(0.16,1,0.3,1), opacity 0.2s linear',
      }"
    >
      <span
        class="block h-6 w-6 rounded-full border-2 border-text-faint border-t-text"
        :class="refreshing ? 'animate-spin' : ''"
        :style="
          refreshing
            ? {}
            : {
                transform: `rotate(${pull * 4}deg) scale(${0.6 + 0.4 * progress})`,
                opacity: 0.35 + 0.65 * progress,
              }
        "
      />
    </div>

    <!-- Content -->
    <div
      :style="{
        transform: `translateY(${pull}px)`,
        transition: dragging ? 'none' : 'transform 0.32s cubic-bezier(0.16,1,0.3,1)',
      }"
    >
      <slot />
    </div>
  </div>
</template>
