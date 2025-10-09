import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'shared-utils': path.resolve(__dirname, '../shared-utils')
    }
  },
  optimizeDeps: {
    include: ['jspdf']
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  },
  server: {
    proxy: {
      // Local dev proxy for Expo Push API to avoid browser CORS
      '/expo-push': {
        target: 'https://exp.host',
        changeOrigin: true,
        secure: true,
        // Map /expo-push/send -> /--/api/v2/push/send
        rewrite: (path) => path.replace(/^\/expo-push/, '/--/api/v2/push'),
      },
    },
  },
})
