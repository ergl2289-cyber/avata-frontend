<script setup lang="ts">
/**
 * End-of-feed marker: a small faint Avata logo as the feed's closing touch.
 * Shared by every infinite list (home feed, search results).
 */
import logoUrl from '@/assets/logo-avata.webp'
</script>

<template>
  <div class="flex justify-center py-10">
    <img
      :src="logoUrl"
      alt=""
      draggable="false"
      class="w-16 select-none opacity-20"
    />
  </div>
</template>
