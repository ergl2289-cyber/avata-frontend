import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import WebApp from '@twa-dev/sdk'
import { login as apiLogin, loginTest, loginWidget, getToken, logout as apiLogout, type WidgetUser } from '@/api/auth'

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
  const authLoading = ref(false)
  const authError = ref<string | null>(null)
  const isAuthenticated = ref(false)

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

  /** Send initData to backend — validates HMAC and returns JWT. */
  async function authenticate(): Promise<boolean> {
    if (!initData.value) {
      authError.value = 'Init data not available'
      return false
    }
    if (getToken()) {
      isAuthenticated.value = true
      return true
    }
    authLoading.value = true
    authError.value = null
    try {
      await apiLogin(initData.value)
      isAuthenticated.value = true
      return true
    } catch (e) {
      authError.value = e instanceof Error ? e.message : 'Auth failed'
      return false
    } finally {
      authLoading.value = false
    }
  }

  /** Development-only auth without real Telegram. */
  async function devAuth(tgId: number): Promise<boolean> {
    authLoading.value = true
    authError.value = null
    try {
      await loginTest(tgId)
      isAuthenticated.value = true
      return true
    } catch (e) {
      authError.value = e instanceof Error ? e.message : 'Auth failed'
      return false
    } finally {
      authLoading.value = false
    }
  }

  /** Browser Widget auth — user from Telegram Login Widget. */
  async function widgetAuth(widgetUser: WidgetUser): Promise<boolean> {
    authLoading.value = true
    authError.value = null
    try {
      await loginWidget(widgetUser)
      user.value = {
        telegram_id: widgetUser.id,
        username: widgetUser.username ?? null,
        first_name: widgetUser.first_name ?? widgetUser.id.toString(),
        last_name: widgetUser.last_name ?? null,
        photo_url: widgetUser.photo_url ?? null,
      }
      isAuthenticated.value = true
      return true
    } catch (e) {
      authError.value = e instanceof Error ? e.message : 'Widget auth failed'
      return false
    } finally {
      authLoading.value = false
    }
  }

  function logout() {
    apiLogout()
    isAuthenticated.value = false
    user.value = null
  }

  const fullName = computed(() =>
    user.value ? [user.value.first_name, user.value.last_name].filter(Boolean).join(' ') : '',
  )

  return {
    user, initData, init,
    authLoading, authError, isAuthenticated,
    authenticate, devAuth, widgetAuth, logout,
    fullName,
  }
})
