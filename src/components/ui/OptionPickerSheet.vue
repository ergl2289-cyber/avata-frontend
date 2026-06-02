<script setup lang="ts">
/**
 * Single-level option picker built on the shared BottomSheet (see CLAUDE.md —
 * all sheets go through one component). Replaces native <select> dropdowns so
 * the look is consistent across platforms. For multi-level use CityPickerSheet.
 */
import { Check } from 'lucide-vue-next'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useTelegram } from '@/composables/useTelegram'

interface Option {
  id: number
  name: string
}

defineProps<{
  open: boolean
  title?: string
  options: Option[]
  selectedId: number | null
}>()
const emit = defineEmits<{ 'update:open': [v: boolean]; select: [option: Option] }>()

const { haptic } = useTelegram()

function choose(o: Option) {
  haptic('light')
  emit('select', o)
  emit('update:open', false)
}
</script>

<template>
  <BottomSheet :open="open" :title="title" @update:open="emit('update:open', $event)">
    <button
      v-for="o in options"
      :key="o.id"
      type="button"
      class="flex w-full items-center justify-between border-b border-border/60 py-3.5 text-left active:opacity-70"
      @click="choose(o)"
    >
      <span class="text-[15px] text-text">{{ o.name }}</span>
      <Check v-if="selectedId === o.id" :size="18" class="text-text" />
    </button>
    <p v-if="!options.length" class="py-10 text-center text-[14px] text-text-muted">
      Ничего не найдено
    </p>
  </BottomSheet>
</template>
