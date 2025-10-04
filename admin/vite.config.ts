import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
