<script setup lang="ts">
import starUrl from '@/assets/tg-star.webp'

withDefaults(defineProps<{ size?: number }>(), { size: 16 })
</script>

<template>
  <img
    :src="starUrl"
    alt="★"
    draggable="false"
    class="inline-block select-none align-[-0.15em]"
    :style="{ width: size + 'px', height: size + 'px' }"
  />
</template>
