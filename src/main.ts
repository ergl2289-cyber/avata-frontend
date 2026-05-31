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

// Authenticate with backend before mounting.
// Telegram: validates initData via HMAC → JWT.
// Browser: check saved JWT → mark as authenticated, otherwise show LoginView.
;(async () => {
  if (tgStore.initData) {
    await tgStore.authenticate()
  } else if (getToken()) {
    tgStore.isAuthenticated = true
  }
  app.mount('#app')
})()

// Telegram Login Widget calls this after successful auth in browser mode.
;(window as any).onTelegramAuth = async (user: any) => {
  await tgStore.widgetAuth(user)
}
