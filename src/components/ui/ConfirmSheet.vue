<script setup lang="ts">
import BottomSheet from './BottomSheet.vue'
import { useTelegram } from '@/composables/useTelegram'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    confirmText?: string
    cancelText?: string
    destructive?: boolean
  }>(),
  {
    message: '',
    confirmText: 'Удалить',
    cancelText: 'Отмена',
    destructive: true,
  },
)

const emit = defineEmits<{ 'update:open': [value: boolean]; confirm: [] }>()
const { haptic } = useTelegram()

function onConfirm() {
  haptic('medium')
  emit('confirm')
  emit('update:open', false)
}

function onCancel() {
  emit('update:open', false)
}
</script>

<template>
  <BottomSheet :open="open" @update:open="emit('update:open', $event)">
    <div class="px-1 pb-2 pt-1 text-center">
      <h2 class="text-[17px] font-semibold text-text">{{ title }}</h2>
      <p v-if="message" class="mx-auto mt-2 max-w-xs text-[14px] leading-snug text-text-muted">
        {{ message }}
      </p>
    </div>

    <template #footer>
      <div class="space-y-2.5">
        <button
          type="button"
          class="w-full rounded-xl py-3.5 text-[15px] font-semibold transition-transform duration-fast ease-out-ios active:scale-[0.98]"
          :class="destructive ? 'bg-like text-white' : 'bg-text text-bg'"
          @click="onConfirm"
        >
          {{ confirmText }}
        </button>
        <button
          type="button"
          class="w-full rounded-xl bg-surface-2 py-3.5 text-[15px] font-medium text-text transition-transform duration-fast ease-out-ios active:scale-[0.98]"
          @click="onCancel"
        >
          {{ cancelText }}
        </button>
      </div>
    </template>
  </BottomSheet>
</template>
