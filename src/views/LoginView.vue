<script setup lang="ts">
import { ref } from 'vue'
import { Car, QrCode } from 'lucide-vue-next'

const BOT_ID = '8669280661'
const redirecting = ref(false)

function openOAuth() {
  redirecting.value = true
  const origin = window.location.origin
  const returnTo = window.location.href
  const url = `https://oauth.telegram.org/auth?bot_id=${BOT_ID}&origin=${origin}&return_to=${encodeURIComponent(returnTo)}`
  window.location.href = url
}
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

    <template v-if="redirecting">
      <div class="flex flex-col items-center gap-3">
        <span class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p class="text-[14px] text-text-muted">Переходим в Telegram…</p>
      </div>
    </template>

    <template v-else>
      <button
        class="flex w-full max-w-xs items-center justify-center gap-3 rounded-xl bg-[#54a9eb] px-6 py-3.5 text-[16px] font-medium text-white shadow-lg shadow-black/20 transition-transform duration-fast ease-out-ios active:scale-[0.98]"
        @click="openOAuth"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.66-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.04-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.87 7.98-3.42 3.8-1.58 4.59-1.85 5.1-1.86.11 0 .37.03.54.16.14.11.18.26.2.4.01.14.03.29 0 .44z"/>
        </svg>
        Войти через Telegram
      </button>

      <div class="flex items-center gap-2">
        <QrCode :size="16" class="text-text-muted" />
        <p class="text-[13px] text-text-muted">На компьютере — отсканируйте QR-код</p>
      </div>
    </template>
  </main>
</template>
