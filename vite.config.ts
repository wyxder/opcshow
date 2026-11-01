import { defineConfig, loadEnv } from 'vite'
import type { Plugin, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import net from 'node:net'
import { spawn } from 'node:child_process'
import path from 'node:path'

/** 探测某个 host:port 是否已有服务在监听（用于避免重复启动后端） */
function portInUse(host: string, port: number, timeoutMs = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const done = (result: boolean) => {
      socket.destroy()
      resolve(result)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
    socket.connect(port, host)
  })
}

/**
 * 开发期自动拉起 JSON API 服务（server/index.mjs）。
 *
 * 背景：后台登录走 /api/auth/login，由 Vite 代理到后端（默认 127.0.0.1:8787）。
 * 如果只 `npm run dev` 而没另开 `npm run api`，代理连不上目标会返回 500，
 * 表现为「登录失败 /api/auth/login → HTTP 500」。这里在 dev server 启动时
 * 自动 fork 后端进程，退出时回收；端口已被占用（手动起了 api）则跳过，不重复启动。
 */
function apiServer(): Plugin {
  let proc: ReturnType<typeof spawn> | null = null
  const stop = () => {
    try {
      proc?.kill()
    } catch {
      /* ignore */
    }
    proc = null
  }
  return {
    name: 'wyx-dev-api',
    apply: 'serve',
    async configureServer(server: ViteDevServer) {
      if (process.env.WYX_SKIP_API === '1') return
      const target = new URL(process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8787')
      const host = target.hostname
      const port = Number(target.port || 80)
      if (await portInUse(host, port)) return
      const entry = path.resolve(process.cwd(), 'server/index.mjs')
      proc = spawn(process.execPath, [entry], { stdio: 'inherit', env: process.env })
      proc.on('exit', (code) => {
        if (code && code !== 0) console.error(`[wyx-dev-api] 后端进程退出，code=${code}`)
      })
      const onExit = () => stop()
      process.once('exit', onExit)
      process.once('SIGINT', onExit)
      server.httpServer?.once('close', onExit)
    },
  }
}

export default defineConfig(({ mode }) => {
  // 只把 VITE_ 前缀的变量注入前端，同时用于解析代理目标；.env 不会整体暴露给客户端
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [react(), apiServer()],
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
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8787',
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
  }
})
