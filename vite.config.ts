import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Bind IPv4 + IPv6 loopback/interfaces. On Windows, Vite otherwise binds
    // IPv6-only ([::1]), but the SSH tunnel forwards to 127.0.0.1 (IPv4) → 502.
    host: true,
    port: 5173,
    strictPort: true,
    // Required for SSH-tunnel testing inside Telegram (backend requirement, Igor).
    allowedHosts: ['dev.avata.site'],
  },
})
