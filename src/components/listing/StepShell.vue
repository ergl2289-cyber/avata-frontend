<script setup lang="ts">
import { X, ArrowLeft } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    isFirst?: boolean
    canContinue?: boolean
    continueLabel?: string
  }>(),
  { subtitle: '', isFirst: false, canContinue: true, continueLabel: 'Продолжить' },
)

const emit = defineEmits<{ back: []; saveExit: []; continue: [] }>()
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-bg">
    <!-- Top bar: top gap equals the side gap (16px) for symmetric corners -->
    <header
      class="flex items-center justify-between px-4 pb-3"
      style="padding-top: calc(16px + var(--safe-top))"
    >
      <button
        type="button"
        :aria-label="isFirst ? 'Закрыть' : 'Назад'"
        class="flex h-9 w-9 items-center justify-center rounded-full text-text transition-transform duration-fast ease-out-ios active:scale-90"
        @click="emit('back')"
      >
        <X v-if="isFirst" :size="24" />
        <ArrowLeft v-else :size="24" />
      </button>
      <button
        type="button"
        class="text-[15px] text-text-muted transition-colors active:text-text"
        @click="emit('saveExit')"
      >
        Сохранить и выйти
      </button>
    </header>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto px-4 pb-28">
      <h1 class="mt-2 text-[28px] font-bold leading-tight text-text">{{ title }}</h1>
      <p v-if="subtitle" class="mt-2 text-[15px] leading-snug text-text-muted">{{ subtitle }}</p>
      <div class="mt-6">
        <slot />
      </div>
    </div>

    <!-- Footer action -->
    <footer
      class="fixed inset-x-0 bottom-0 border-t border-border/60 bg-bg/95 px-4 pb-[calc(12px+var(--safe-bottom))] pt-3 backdrop-blur-xl"
    >
      <button
        type="button"
        :disabled="!canContinue"
        class="w-full rounded-pill py-3.5 text-[15px] font-semibold transition-all duration-fast ease-out-ios active:scale-[0.98] disabled:cursor-not-allowed"
        :class="canContinue ? 'bg-text text-bg' : 'bg-surface text-text-faint'"
        @click="emit('continue')"
      >
        {{ continueLabel }}
      </button>
    </footer>
  </div>
</template>
