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
      const encoded = hash.replace('#tgAuthResult=', '').split('&')[0]
      const user = JSON.parse(atob(encoded))
      await tgStore.widgetAuth(user)
      authed = true
    } catch {
      /* widget auth failed */
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
})()

// Telegram Login Widget popup-mode callback (data-onauth fallback).
;(window as any).onTelegramAuth = async (user: any) => {
  await tgStore.widgetAuth(user)
}
