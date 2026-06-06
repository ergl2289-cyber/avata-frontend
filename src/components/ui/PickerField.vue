<script setup lang="ts">
/**
 * Trigger field for a BottomSheet-based picker. Looks like SelectField but is a
 * plain button (no native <select>) so the dropdown styling is identical across
 * iOS / Android / Windows. Pair with OptionPickerSheet.
 */
import { ChevronDown } from 'lucide-vue-next'

defineProps<{
  label?: string
  placeholder?: string
  value?: string | null
  disabled?: boolean
  /** Field background — `surface` (default, on dark pages) or `surface-2` (inside sheets). */
  bg?: 'surface' | 'surface-2'
}>()
const emit = defineEmits<{ open: [] }>()
</script>

<template>
  <div class="block">
    <span v-if="label" class="mb-1.5 block text-[13px] text-text-muted">{{ label }}</span>
    <button
      type="button"
      :disabled="disabled"
      class="relative flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left text-[15px] outline-none transition-transform duration-fast ease-out-ios active:scale-[0.99] disabled:opacity-40"
      :class="bg === 'surface-2' ? 'bg-surface-2' : 'bg-surface'"
      @click="emit('open')"
    >
      <span class="truncate" :class="value ? 'text-text' : 'text-text-muted'">
        {{ value || placeholder }}
      </span>
      <ChevronDown :size="18" class="shrink-0 text-text-muted" />
    </button>
  </div>
</template>
