<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Car, ExternalLink } from 'lucide-vue-next'

const BOT_ID = '8669280661'
const redirecting = ref(false)
const wasLoggedOut = ref(false)
const showOtherHint = ref(false)

onMounted(() => {
  wasLoggedOut.value = sessionStorage.getItem('avata:loggedOut') === '1'
  sessionStorage.removeItem('avata:loggedOut')
})

function openOAuth() {
  redirecting.value = true
  const origin = window.location.origin
  const returnTo = window.location.origin + window.location.pathname + window.location.search
  const url = `https://oauth.telegram.org/auth?bot_id=${BOT_ID}&origin=${origin}&return_to=${encodeURIComponent(returnTo)}`
  window.location.href = url
}
</script>

<template>
  <main class="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 pb-24 safe-bottom">
    <div class="flex flex-col items-center gap-3">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface">
        <Car :size="32" :stroke-width="1.6" class="text-text" />
      </div>
      <h1 class="text-[22px] font-bold text-text">AVATA</h1>
      <p class="text-[15px] text-text-muted">Войдите, чтобы продолжить</p>
    </div>

    <template v-if="redirecting">
      <div class="flex flex-col items-center gap-3">
        <span class="h-6 w-6 animate-spin rounded-full border-2 border-[#2AABEE] border-t-transparent" />
        <p class="text-[14px] text-text-muted">Переход в Telegram…</p>
      </div>
    </template>

    <template v-else>
      <button
        class="flex w-full max-w-xs items-center justify-center gap-2.5 rounded-pill bg-[#2AABEE] px-6 py-3.5 text-[16px] font-semibold text-white shadow-lg shadow-black/20 transition-transform duration-fast ease-out-ios active:scale-[0.98]"
        @click="openOAuth"
      >
        <svg class="h-[22px] w-[22px]" viewBox="0 0 240 240" fill="currentColor" aria-hidden="true">
          <path d="M120 0C53.7 0 0 53.7 0 120s53.7 120 120 120 120-53.7 120-120S186.3 0 120 0Zm55.6 82.2-18.6 87.7c-1.4 6.2-5.1 7.7-10.3 4.8l-28.5-21-13.7 13.2c-1.5 1.5-2.8 2.8-5.7 2.8l2-29 52.8-47.7c2.3-2-.5-3.2-3.6-1.2l-65.2 41.1-28.1-8.8c-6.1-1.9-6.2-6.1 1.3-9l109.9-42.4c5.1-1.9 9.5 1.2 7.8 8.9Z"/>
        </svg>
        Войти через Telegram
      </button>

      <p class="max-w-xs text-center text-[13px] leading-relaxed text-text-faint">
        Откроется страница Telegram. На телефоне — подтверждение в приложении, на компьютере — отсканируйте QR-код.
      </p>

      <!-- Logged out hint -->
      <div
        v-if="wasLoggedOut"
        class="max-w-xs rounded-card border border-border bg-surface px-4 py-3 text-center"
      >
        <p class="text-[13px] leading-relaxed text-text-muted">
          Чтобы войти под другим аккаунтом, откройте сайт в
          <span class="font-medium text-text">приватном режиме</span>
          (Ctrl+Shift+N) или используйте другой браузер.
        </p>
      </div>

      <div class="flex w-full max-w-xs items-center gap-3">
        <div class="h-px flex-1 bg-border" />
        <span class="text-[12px] text-text-faint">или</span>
        <div class="h-px flex-1 bg-border" />
      </div>

      <button
        class="flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-[15px] text-text-muted transition-colors active:bg-surface"
        @click="showOtherHint = !showOtherHint"
      >
        <ExternalLink :size="16" :stroke-width="1.8" />
        Другой аккаунт
      </button>

      <div
        v-if="showOtherHint"
        class="max-w-xs rounded-card bg-surface px-4 py-3 text-center"
      >
        <p class="text-[13px] leading-relaxed text-text-muted">
          Telegram запоминает авторизацию для этого домена. Чтобы войти под другим аккаунтом,
          откройте этот сайт в <span class="font-medium text-text">приватном режиме</span>
          (Ctrl+Shift+N) или в другом браузере.
        </p>
      </div>
    </template>
  </main>
</template>
