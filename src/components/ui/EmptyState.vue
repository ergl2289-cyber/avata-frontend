<script setup lang="ts">
/**
 * Unified empty / no-results placeholder (see CLAUDE.md — one component per
 * pattern). Minimalist, no icons: a composed, centered text block that sits in
 * the empty space so it feels placed, not stranded. Title + a light supporting
 * line, gentle fade-in.
 */
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="empty flex min-h-[58dvh] flex-col items-center justify-center px-8 text-center">
    <p class="text-[20px] font-semibold leading-snug text-text">{{ title }}</p>
    <p
      v-if="subtitle"
      class="mt-2 max-w-[270px] text-[14px] leading-relaxed text-text-muted"
    >
      {{ subtitle }}
    </p>
  </div>
</template>

<style scoped>
.empty {
  animation: empty-in 450ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes empty-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .empty {
    animation: none;
  }
}
</style>
