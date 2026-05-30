<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useTelegram } from '@/composables/useTelegram'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    confirmText?: string
    cancelText?: string
    destructive?: boolean
  }>(),
  { message: '', confirmText: 'OK', cancelText: 'Отмена', destructive: false },
)

const emit = defineEmits<{ 'update:open': [v: boolean]; confirm: [] }>()
const { haptic } = useTelegram()

function confirm() {
  haptic('medium')
  emit('confirm')
  emit('update:open', false)
}
function cancel() {
  emit('update:open', false)
}

// lock page scroll while open; always restore on unmount
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
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-8 backdrop-blur-[2px]"
        @click.self="cancel"
      >
        <Transition name="pop" appear>
          <div
            v-if="open"
            class="w-full max-w-[300px] overflow-hidden rounded-2xl bg-surface p-5"
          >
            <h2 class="text-center text-[17px] font-semibold text-text">{{ title }}</h2>
            <p
              v-if="message"
              class="mx-auto mt-2 text-center text-[14px] leading-snug text-text-muted"
            >
              {{ message }}
            </p>

            <div class="mt-5 space-y-2.5">
              <button
                type="button"
                class="w-full rounded-xl py-3 text-[15px] font-semibold transition-transform duration-fast ease-out-ios active:scale-[0.98]"
                :class="destructive ? 'bg-like text-white' : 'bg-text text-bg'"
                @click="confirm"
              >
                {{ confirmText }}
              </button>
              <button
                type="button"
                class="w-full rounded-xl bg-surface-2 py-3 text-[15px] font-medium text-text transition-transform duration-fast ease-out-ios active:scale-[0.98]"
                @click="cancel"
              >
                {{ cancelText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.pop-enter-active {
  transition:
    opacity 220ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
.pop-leave-active {
  transition:
    opacity 160ms ease-in,
    transform 160ms ease-in;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.94);
}
</style>
