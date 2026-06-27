import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    watch: {
      ignored: ['**/.wwebjs_auth/**', '**/.paperclip/**', '**/.agents/**', '**/server.mjs', '**/package.json']
    },
    hmr: {
      port: 3000,
    },
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
})
