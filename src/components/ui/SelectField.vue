<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

defineProps<{ label?: string; disabled?: boolean }>()
// number | null model (our ids); string also accepted
const model = defineModel<number | string | null>()
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1.5 block text-[13px] text-text-muted">{{ label }}</span>
    <div class="relative">
      <select
        v-model="model"
        :disabled="disabled"
        class="w-full appearance-none rounded-xl bg-surface px-4 py-3.5 text-[15px] text-text outline-none disabled:opacity-40"
      >
        <slot />
      </select>
      <ChevronDown
        :size="18"
        class="pointer-events-none absolute right-3.5 top-4 text-text-muted"
      />
    </div>
  </label>
</template>
