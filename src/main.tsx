import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ThemeProvider } from './theme/ThemeProvider'

// F-13：生产环境懒加载 Service Worker 注册（离线壳 + 新版本提示），不占入口包
if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    import('./sw-register')
      .then((m) => m.registerServiceWorker())
      .catch(() => {
        /* 注册失败不影响主流程 */
      })
  })
}

// 顶层 boundary（fx.md R1）：任何渲染异常都落到兜底版式，不再整页白屏
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary boundary="root">
      <ThemeProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
