import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import WebApp from '@twa-dev/sdk'

export interface TelegramUser {
  telegram_id: number
  username: string | null
  first_name: string
  last_name: string | null
  photo_url: string | null
}

/**
 * Holds the authenticated Telegram user (from initData). No forms, no passwords.
 * Signature validation happens on the backend; the frontend only reads identity.
 */
export const useTelegramStore = defineStore('telegram', () => {
  const user = ref<TelegramUser | null>(null)
  const initData = ref<string>('')

  function init() {
    initData.value = WebApp.initData ?? ''
    const u = WebApp.initDataUnsafe?.user
    if (u) {
      user.value = {
        telegram_id: u.id,
        username: u.username ?? null,
        first_name: u.first_name,
        last_name: u.last_name ?? null,
        photo_url: u.photo_url ?? null,
      }
    }
  }

  const fullName = computed(() =>
    user.value ? [user.value.first_name, user.value.last_name].filter(Boolean).join(' ') : '',
  )

  return { user, initData, init, fullName }
})
