import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1'],
  },
  preview: {
    port: 5173,
    host: true,
    allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1'],
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
  },
})
