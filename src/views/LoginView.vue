<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { Car } from 'lucide-vue-next'

const container = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref(false)

function retry() {
  error.value = false
  loading.value = true
  loadWidget()
}

function loadWidget() {
  if (!container.value) return
  container.value.innerHTML = ''
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://telegram.org/js/telegram-widget.js?22'
  script.setAttribute('data-telegram-login', 'avata_frontend_bot')
  script.setAttribute('data-size', 'large')
  script.setAttribute('data-auth-url', window.location.origin)
  script.setAttribute('data-onauth', 'onTelegramAuth(user)')
  script.onload = () => {
    loading.value = false
  }
  script.onerror = () => {
    error.value = true
    loading.value = false
  }
  container.value.appendChild(script)
}

onMounted(() => loadWidget())
onBeforeUnmount(() => {
  if (container.value) container.value.innerHTML = ''
})
</script>

<template>
  <main class="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 pb-24 safe-bottom">
    <div class="flex flex-col items-center gap-3">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface">
        <Car :size="32" :stroke-width="1.6" class="text-text" />
      </div>
      <h1 class="text-[22px] font-bold text-text">AVATA</h1>
      <p class="text-[15px] text-text-muted">Войдите, чтобы продолжить</p>
    </div>

    <div v-if="loading" class="flex flex-col items-center gap-3">
      <span class="h-6 w-6 animate-spin rounded-full border-2 border-text-faint border-t-text" />
      <p class="text-[13px] text-text-muted">Загрузка…</p>
    </div>

    <div v-else-if="error" class="flex flex-col items-center gap-4">
      <p class="text-[14px] text-red-400">Не удалось загрузить виджет</p>
      <button
        class="rounded-lg bg-primary px-4 py-2 text-sm text-white"
        @click="retry"
      >
        Повторить
      </button>
    </div>

    <div ref="container" class="flex justify-center" />
  </main>
</template>
