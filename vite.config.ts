import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/dashboard/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/api': { target: 'https://localhost:5000', secure: false },
      '/hubs': { target: 'https://localhost:5000', ws: true, secure: false },
    },
  },
})
