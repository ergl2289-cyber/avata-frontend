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
// Telegram's photo_url is only handed to us transiently (initData on each launch,
// or once in the OAuth widget payload) — the backend doesn't store it. Cache the
// last seen URL so the user's own avatar survives a browser refresh instead of
// flickering away. See profile.loadFromServer (browser branch).
const TG_PHOTO_KEY = 'avata:tgphoto'
export function rememberPhoto(url: string) {
  try {
    localStorage.setItem(TG_PHOTO_KEY, url)
  } catch {
    /* ignore */
  }
}
export function recallPhoto(): string | null {
  try {
    return localStorage.getItem(TG_PHOTO_KEY)
  } catch {
    return null
  }
}

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
      if (u.photo_url) rememberPhoto(u.photo_url)
    }
  }

  /**
   * Send initData to backend — validates HMAC and returns a fresh JWT.
   * We always re-login on launch (initData is fresh and cheap): trusting a cached
   * token blindly left users stuck on a stale JWT after the backend DB was reset
   * → every request 401'd with "User not found". A fresh login binds the token to
   * the current backend user. Falls back to a stored token only if login fails
   * (e.g. auth endpoint briefly unreachable).
   */
  async function authenticate(): Promise<boolean> {
    if (!initData.value) {
      authError.value = 'Init data not available'
      return false
    }
    authLoading.value = true
    authError.value = null
    try {
      await apiLogin(initData.value)
      isAuthenticated.value = true
      return true
    } catch (e) {
      if (getToken()) {
        isAuthenticated.value = true
        return true
      }
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
      if (widgetUser.photo_url) rememberPhoto(widgetUser.photo_url)
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
    try {
      localStorage.removeItem(TG_PHOTO_KEY)
    } catch {
      /* ignore */
    }
    sessionStorage.setItem('avata:loggedOut', '1')
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
