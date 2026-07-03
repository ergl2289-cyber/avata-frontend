<script setup lang="ts">
/**
 * End-of-feed marker: a small dot with hairlines fading out to the sides and a
 * soft caption. Shared by every infinite list (home feed, search results).
 */
withDefaults(defineProps<{ label?: string }>(), { label: 'Вы посмотрели всё' })
</script>

<template>
  <div class="flex flex-col items-center gap-2.5 py-8">
    <div class="flex w-full max-w-[220px] items-center gap-3">
      <span class="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
      <span class="h-1 w-1 rounded-full bg-text-faint" />
      <span class="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
    </div>
    <p class="text-[13px] text-text-faint">{{ label }}</p>
  </div>
</template>
