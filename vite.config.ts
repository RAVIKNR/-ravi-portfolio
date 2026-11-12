import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['surrogate-sequel-nebulizer.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:10000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyRequest, request) => {
            const origin = request.headers.origin
            if (
              origin === 'http://localhost:5173' ||
              origin === 'https://surrogate-sequel-nebulizer.ngrok-free.dev'
            ) {
              proxyRequest.setHeader('Origin', 'http://localhost:5173')
            }
          })
        },
      },
    },
  },
})
