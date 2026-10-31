import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5273,
    host: true,
    // 本地开发建议 VITE_API_BASE=/api：同源代理到后端，HttpOnly Cookie 才能稳定携带
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8787',
        changeOrigin: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          // F-12：图标库单独成块，避免每个页面 chunk 各留一份被入口重复计入
          icons: ['lucide-react'],
        },
      },
    },
  },
})
