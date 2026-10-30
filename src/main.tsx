import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ThemeProvider } from './theme/ThemeProvider'

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
