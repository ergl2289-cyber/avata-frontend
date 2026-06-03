import { createApp } from 'vue'
import { createPinia } from 'pinia'
import WebApp from '@twa-dev/sdk'
import App from './App.vue'
import { router } from './router'
import { useTelegramStore } from './stores/telegram'
import { getToken } from './api/auth'
import './style.css'

// Telegram lifecycle. Single dark theme — we don't follow colorScheme.
try {
  WebApp.ready()
  WebApp.expand()
} catch {
  /* running outside Telegram (dev browser) */
}

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

const tgStore = useTelegramStore()
tgStore.init()

// All auth methods processed in order before mounting.
// 1. OAuth redirect (widget data-auth-url → #tgAuthResult hash)
// 2. Telegram Mini App initData
// 3. Saved JWT from previous browser session
;(async () => {
  let authed = false

  const hash = window.location.hash
  if (hash.startsWith('#tgAuthResult=')) {
    try {
      // base64url → base64, then decode as UTF-8 (Cyrillic names break a plain
      // JSON.parse(atob(...)), which left the user stuck on the login screen).
      const raw = hash.slice('#tgAuthResult='.length).split('&')[0]
      const b64 = decodeURIComponent(raw).replace(/-/g, '+').replace(/_/g, '/')
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const user = JSON.parse(new TextDecoder().decode(bytes))
      await tgStore.widgetAuth(user)
      authed = tgStore.isAuthenticated
    } catch {
      /* widget auth failed — fall through to the login screen */
    }
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }

  if (!authed && tgStore.initData) {
    await tgStore.authenticate()
    authed = tgStore.isAuthenticated
  }

  if (!authed && getToken()) {
    tgStore.isAuthenticated = true
  }

  app.mount('#app')

  // Deep link: Mini App launched via t.me/<bot>?startapp=car_<id> → open that
  // listing (carries the link target when opened from Telegram's in-app browser).
  try {
    const sp = WebApp.initDataUnsafe?.start_param
    const m = sp ? /^car_(\d+)$/.exec(sp) : null
    if (m) await router.push({ name: 'car', params: { id: m[1] } })
  } catch {
    /* not launched from a deep link */
  }
})()

// Telegram Login Widget popup-mode callback (data-onauth fallback).
;(window as any).onTelegramAuth = async (user: any) => {
  await tgStore.widgetAuth(user)
}
