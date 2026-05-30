<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useTelegram } from '@/composables/useTelegram'
import type { SortKey } from '@/types/car'

defineProps<{ open: boolean; selected: SortKey }>()
const emit = defineEmits<{ 'update:open': [v: boolean]; select: [key: SortKey] }>()

const { haptic } = useTelegram()

const options: { key: SortKey; label: string }[] = [
  { key: 'date_desc', label: 'Сначала новые' },
  { key: 'price_asc', label: 'Сначала дешевле' },
  { key: 'price_desc', label: 'Сначала дороже' },
  { key: 'year_desc', label: 'Год: новее' },
  { key: 'mileage_asc', label: 'Пробег: меньше' },
]

function choose(key: SortKey) {
  haptic('light')
  emit('select', key)
  emit('update:open', false)
}
</script>

<template>
  <BottomSheet :open="open" title="Сортировка" @update:open="emit('update:open', $event)">
    <div class="pb-1">
      <button
        v-for="o in options"
        :key="o.key"
        type="button"
        class="flex w-full items-center justify-between border-b border-border/60 py-3.5 text-left last:border-b-0 active:opacity-70"
        @click="choose(o.key)"
      >
        <span class="text-[15px]" :class="selected === o.key ? 'text-text' : 'text-text-muted'">
          {{ o.label }}
        </span>
        <Check v-if="selected === o.key" :size="18" class="text-text" />
      </button>
    </div>
  </BottomSheet>
</template>
