import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, 
    proxy: {
      '/api': {
        // This was likely deleted. It MUST be here for the proxy to work.
        target: 'http://127.0.0.1:8080', 
        changeOrigin: true,
        secure: false,
      },
      '/download': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})