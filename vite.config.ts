/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), legacy()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://api.lalibertadavanzacomuna7.com', // ⚠️ usa https
        changeOrigin: true,
        secure: true, // pon a false si tu certificado no es válido en dev
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
