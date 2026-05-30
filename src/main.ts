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

// Authenticate with backend.
// In Telegram: validates initData via HMAC → returns JWT.
// In dev browser: falls back to test auth via /api/auth/test.
if (tgStore.initData) {
  tgStore.authenticate()
} else {
  // Development — no real Telegram WebApp, use test user
  const DEV_USER_ID = 111111
  console.log(`[avata] dev mode — logging in as test user ${DEV_USER_ID}`)
  tgStore.devAuth(DEV_USER_ID)
}

app.mount('#app')
