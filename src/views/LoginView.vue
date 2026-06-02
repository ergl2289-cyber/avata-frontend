<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Car, ExternalLink, Send } from 'lucide-vue-next'

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
        <span class="h-6 w-6 animate-spin rounded-full border-2 border-text border-t-transparent" />
        <p class="text-[14px] text-text-muted">Переход в Telegram…</p>
      </div>
    </template>

    <template v-else>
      <button
        class="flex w-full max-w-xs items-center justify-center gap-2.5 rounded-pill bg-text px-6 py-3.5 text-[16px] font-semibold text-bg transition-transform duration-fast ease-out-ios active:scale-[0.98]"
        @click="openOAuth"
      >
        <Send :size="19" :stroke-width="2" />
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
