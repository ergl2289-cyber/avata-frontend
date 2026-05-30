<script setup lang="ts">
import type { ListingForm } from '@/types/listing'

defineProps<{ form: ListingForm }>()
</script>

<template>
  <div>
    <textarea
      v-model="form.description"
      rows="7"
      maxlength="3000"
      placeholder="Расскажите о состоянии автомобиля, комплектации, истории обслуживания"
      class="w-full resize-none rounded-xl bg-surface px-4 py-3.5 text-[15px] leading-snug text-text placeholder:text-text-faint outline-none"
    />
    <p class="mt-2 text-right text-[12px] text-text-faint">{{ form.description.length }} / 3000</p>
  </div>
</template>
