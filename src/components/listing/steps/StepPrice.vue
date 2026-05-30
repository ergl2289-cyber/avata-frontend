<script setup lang="ts">
import { computed } from 'vue'
import type { ListingForm } from '@/types/listing'
import { groupThousands } from '@/utils/format'

const props = defineProps<{ form: ListingForm }>()

const hint = computed(() =>
  props.form.price != null && props.form.price > 0
    ? `${groupThousands(props.form.price)} ₽`
    : 'Укажите цену в рублях',
)
</script>

<template>
  <div>
    <div class="flex items-center gap-2 rounded-xl bg-surface px-4 py-4">
      <input
        v-model.number="form.price"
        type="number"
        inputmode="numeric"
        placeholder="0"
        class="min-w-0 flex-1 bg-transparent text-[22px] font-bold text-text placeholder:text-text-faint outline-none"
      />
      <span class="text-[22px] font-bold text-text-muted">₽</span>
    </div>
    <p class="mt-2 text-[13px] text-text-muted">{{ hint }}</p>
  </div>
</template>
