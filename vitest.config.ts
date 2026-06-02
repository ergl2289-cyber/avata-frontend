import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    // Logic tests always run against the in-memory mocks, regardless of the
    // local .env (which may point at the real backend for Telegram testing).
    env: {
      VITE_USE_MOCKS: 'true',
      VITE_DIRECTUS_URL: '',
    },
  },
})
