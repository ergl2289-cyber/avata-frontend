<script setup lang="ts">
import { Car } from 'lucide-vue-next'
import ScreenPlaceholder from '@/components/layout/ScreenPlaceholder.vue'

defineProps<{ id: string }>()
</script>

<template>
  <ScreenPlaceholder
    :icon="Car"
    title="Карточка объявления"
    :subtitle="`Объявление #${id} — экран в разработке`"
  />
</template>
