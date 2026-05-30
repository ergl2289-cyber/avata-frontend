<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title: string
  subtitle?: string
  icon: Component
}>()
</script>

<template>
  <main class="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 pb-24 text-center">
    <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface">
      <component :is="icon" :size="28" :stroke-width="1.6" class="text-text-muted" />
    </div>
    <div>
      <h1 class="text-lg font-semibold text-text">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 text-sm text-text-muted">{{ subtitle }}</p>
    </div>
  </main>
</template>
