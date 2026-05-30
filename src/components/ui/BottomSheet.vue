<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useTelegram } from '@/composables/useTelegram'

const props = defineProps<{
  open: boolean
  title?: string
}>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { haptic } = useTelegram()

const scrollEl = ref<HTMLElement | null>(null)

const dragY = ref(0) // live translate during drag
const dragging = ref(false) // an active dismiss-drag is engaged
let startY = 0
let tracking = false // finger is down, deciding whether to drag
let canDrag = false // content was at top on touch start

const ENGAGE_DELTA = 6 // px of downward movement before we hijack as a drag
const CLOSE_THRESHOLD = 110 // px of finger travel needed to dismiss

// Progressive resistance: the sheet resists at the start (needs more effort)
// and eases toward 1:1 tracking further down — a soft guard against accidental
// closes. DRAG_BASE = how freely it moves at the very start (lower = stiffer);
// DRAG_EASE = px of finger travel over which it reaches full 1:1 follow.
const DRAG_BASE = 0.4
const DRAG_EASE = 120

function resist(delta: number): number {
  const factor = DRAG_BASE + (1 - DRAG_BASE) * Math.min(delta / DRAG_EASE, 1)
  return delta * factor
}

function close() {
  haptic('soft')
  emit('update:open', false)
}

function onTouchStart(e: TouchEvent) {
  startY = e.touches[0].clientY
  tracking = true
  dragging.value = false
  // only allow swipe-to-dismiss when the inner content is scrolled to the top,
  // so that scrolling long content doesn't accidentally close the sheet
  canDrag = (scrollEl.value?.scrollTop ?? 0) <= 0
}

function onTouchMove(e: TouchEvent) {
  if (!tracking) return
  const delta = e.touches[0].clientY - startY

  if (!dragging.value) {
    if (canDrag && delta > ENGAGE_DELTA) {
      dragging.value = true // engage dismiss-drag
    } else {
      return // let the content scroll normally
    }
  }

  // engaged: follow the finger (with start resistance) and block content scroll
  dragY.value = resist(Math.max(0, delta))
  e.preventDefault()
}

function onTouchEnd() {
  tracking = false
  if (dragging.value && dragY.value > CLOSE_THRESHOLD) close()
  dragging.value = false
  dragY.value = 0
}

// lock body scroll while open; always restore on unmount so a missed
// transition can never leave the page permanently unscrollable
watch(
  () => props.open,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  },
)
onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
        @click="close"
      />
    </Transition>

    <!-- Sheet -->
    <Transition name="sheet">
      <section
        v-if="open"
        class="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-sheet bg-surface safe-bottom"
        :style="{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : undefined,
        }"
        @touchstart.passive="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <!-- Drag handle -->
        <div class="flex shrink-0 justify-center pb-1 pt-2.5">
          <span class="h-1 w-10 rounded-full bg-text-faint" />
        </div>

        <header v-if="title || $slots.header" class="shrink-0 px-5 pb-3 pt-1">
          <slot name="header">
            <h2 class="text-center text-base font-semibold text-text">{{ title }}</h2>
          </slot>
        </header>

        <div ref="scrollEl" class="no-scrollbar flex-1 overflow-y-auto px-5">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="shrink-0 px-5 pb-3 pt-3">
          <slot name="footer" />
        </footer>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
}
</style>
