<script setup lang="ts">
import { ref } from 'vue'
import { ExternalLink } from 'lucide-vue-next'
import WebApp from '@twa-dev/sdk'
import logoUrl from '@/assets/logo-avata.webp'

const BOT_ID = '8669280661'
// Бот Mini App. ?startapp запускает приложение; если ссылку открыли на конкретном
// объявлении (/car/:id) — прокидываем startapp=car_<id>, чтобы Mini App открыл
// именно его (см. разбор start_param в main.ts). Внутри Telegram вход идёт по
// initData — это рабочий путь, когда ссылку открыли во встроенном браузере TG.
const BOT = 'https://t.me/AvataAuto_bot'
const startParam = (() => {
  const m = /^\/car\/(\d+)/.exec(window.location.pathname)
  return m ? `car_${m[1]}` : ''
})()
const BOT_URL = `${BOT}?startapp${startParam ? '=' + startParam : ''}`

const redirecting = ref(false)

// Are we running inside a Telegram environment (Mini App or in-app browser)?
const inTelegram = (() => {
  try {
    return !!WebApp.platform && WebApp.platform !== 'unknown'
  } catch {
    return false
  }
})()

/** Browser login via Telegram OAuth widget (works in Chrome/Safari, not in the
 *  Telegram in-app browser — there use «Открыть приложение» instead). */
function openOAuth() {
  redirecting.value = true
  const origin = window.location.origin
  const returnTo = window.location.origin + window.location.pathname + window.location.search
  const url = `https://oauth.telegram.org/auth?bot_id=${BOT_ID}&origin=${origin}&return_to=${encodeURIComponent(returnTo)}`
  window.location.href = url
}

/** Open the bot / Mini App in Telegram — the reliable path when the page was
 *  opened from inside Telegram (its in-app browser can't complete OAuth). */
function openApp() {
  if (inTelegram) {
    WebApp.openTelegramLink(BOT_URL)
  } else {
    window.open(BOT_URL, '_blank')
  }
}
</script>

<template>
  <main class="flex min-h-dvh flex-col items-center justify-center gap-7 px-6 pb-24 safe-bottom">
    <div class="flex flex-col items-center gap-4">
      <img :src="logoUrl" alt="Avata" class="w-44 select-none" draggable="false" />
      <p class="text-[15px] text-text-muted">Войдите, чтобы продолжить</p>
    </div>

    <template v-if="redirecting">
      <div class="flex flex-col items-center gap-3">
        <span class="h-6 w-6 animate-spin rounded-full border-2 border-[#2AABEE] border-t-transparent" />
        <p class="text-[14px] text-text-muted">Переход в Telegram…</p>
      </div>
    </template>

    <template v-else>
      <div class="flex w-full max-w-xs flex-col gap-3">
        <button
          class="flex w-full items-center justify-center gap-2.5 rounded-pill bg-[#2AABEE] px-6 py-3.5 text-[16px] font-semibold text-white shadow-lg shadow-black/20 transition-transform duration-fast ease-out-ios active:scale-[0.98]"
          @click="openOAuth"
        >
          <svg class="h-[22px] w-[22px]" viewBox="0 0 240 240" fill="currentColor" aria-hidden="true">
            <path d="M120 0C53.7 0 0 53.7 0 120s53.7 120 120 120 120-53.7 120-120S186.3 0 120 0Zm55.6 82.2-18.6 87.7c-1.4 6.2-5.1 7.7-10.3 4.8l-28.5-21-13.7 13.2c-1.5 1.5-2.8 2.8-5.7 2.8l2-29 52.8-47.7c2.3-2-.5-3.2-3.6-1.2l-65.2 41.1-28.1-8.8c-6.1-1.9-6.2-6.1 1.3-9l109.9-42.4c5.1-1.9 9.5 1.2 7.8 8.9Z"/>
          </svg>
          Войти через Telegram
        </button>

        <button
          class="flex w-full items-center justify-center gap-2 rounded-pill border border-border px-6 py-3.5 text-[15px] font-medium text-text transition-colors duration-fast active:bg-surface"
          @click="openApp"
        >
          <ExternalLink :size="18" :stroke-width="1.9" />
          Открыть приложение
        </button>
      </div>

      <p class="max-w-xs text-center text-[13px] leading-relaxed text-text-faint">
        В браузере — войдите через Telegram (на телефоне подтвердите вход, на компьютере отсканируйте QR-код).
        Если вы открыли ссылку внутри Telegram — нажмите «Открыть приложение».
      </p>
    </template>
  </main>
</template>
