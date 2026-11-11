import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Non-VITE_ variables are only read here, never exposed to the bundle.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const apiTarget = env.API_TARGET ?? 'http://127.0.0.1:3001'
  const webPort = Number(env.WEB_PORT ?? 3000)

  const proxy: Record<string, ProxyOptions> = {
    '/api': { target: apiTarget, changeOrigin: false },
    '/uploads': { target: apiTarget, changeOrigin: false },
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: webPort,
      strictPort: true,
      proxy,
    },
    preview: {
      port: webPort,
      strictPort: true,
      proxy,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  }
})
