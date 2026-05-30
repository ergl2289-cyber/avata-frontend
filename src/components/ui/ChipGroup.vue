<script setup lang="ts" generic="T extends string | number">
import { useTelegram } from '@/composables/useTelegram'

defineProps<{
  modelValue: T | null
  options: { value: T; label: string }[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
const { selection } = useTelegram()

function pick(value: T) {
  selection()
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      class="rounded-xl px-4 py-2.5 text-[14px] font-medium transition-all duration-fast ease-out-ios active:scale-95"
      :class="
        modelValue === opt.value
          ? 'bg-text text-bg'
          : 'bg-surface text-text'
      "
      @click="pick(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
