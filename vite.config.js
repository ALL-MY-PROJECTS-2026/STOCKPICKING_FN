import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// FN React 개발 서버 — 정적 FN(5173)과 분리해 5174 고정.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    host: '127.0.0.1',
  },
})
