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

// Authenticate with backend BEFORE mounting the app.
// Without await — stores fire their requests before JWT is ready → 401 → empty feed.
;(async () => {
  if (tgStore.initData) {
    await tgStore.authenticate()
  } else {
    const DEV_USER_ID = 111111
    console.log(`[avata] dev mode — logging in as test user ${DEV_USER_ID}`)
    await tgStore.devAuth(DEV_USER_ID)
  }
  app.mount('#app')
})()
