import { createApp } from 'vue'
import { createPinia } from 'pinia'
import WebApp from '@twa-dev/sdk'
import App from './App.vue'
import { router } from './router'
import { useTelegramStore } from './stores/telegram'
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
// Browser: no auth, app works in anonymous mode.
;(async () => {
  if (tgStore.initData) {
    await tgStore.authenticate()
  }
  app.mount('#app')
})()
