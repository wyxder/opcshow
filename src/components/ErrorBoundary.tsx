import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, ArrowLeft, Home, RotateCcw } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { reportError } from '@/services/observability'

type Props = { children: ReactNode; boundary?: string; fallback?: ReactNode }
type State = { error: Error | null }

/**
 * 顶层 / 路由级错误边界（fx.md R1）。
 * 之前全站没有任何 boundary，任何一个渲染异常都会把整页打成白屏；
 * 现在：局部异常只塌这一块，兜底版式复用 404 的写法，并提供「重试 / 回首页」。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { boundary: this.props.boundary ?? 'app', component: info.componentStack?.trim().split('\n')[0] })
  }

  private reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback

    const dev = import.meta.env.DEV
    return (
      <div className="shell flex min-h-[52vh] flex-col items-center justify-center text-center">
        <p className="font-display text-[clamp(56px,12vw,120px)] font-extrabold leading-none text-ink/10">!</p>
        <p className="mt-2 flex items-center gap-2 font-hand text-2xl text-coral">
          <AlertTriangle size={18} /> 这一块渲染出错了，别的页面不受影响。
        </p>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-ink/50">
          {dev ? error.message : '我已经把这次异常记下来了。可以先回首页，或者刷新这一屏。'}
        </p>
        {dev && (
          <pre className="mt-3 max-w-[min(680px,90vw)] overflow-auto rounded-xl border border-ink/15 bg-cream p-3 text-left font-mono text-[10.5px] leading-relaxed text-ink/60">
            {error.stack?.split('\n').slice(0, 8).join('\n')}
          </pre>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button onClick={this.reset} className="btn-ink !py-2 !text-[12px]">
            <RotateCcw size={13} /> 重试这一块
          </button>
          <Link to="/" className="btn !py-2 !text-[12px]">
            <Home size={13} /> 回首页
          </Link>
        </div>
      </div>
    )
  }
}

/** 路由级：位置变化时自动重置，避免一次异常把后续导航也卡住 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()
  return (
    <ErrorBoundary key={location.pathname} boundary={`route:${location.pathname}`}>
      {children}
    </ErrorBoundary>
  )
}

/** 懒加载 chunk 加载失败（部署后旧 chunk 404）时的兜底：提示刷新而不是白屏 */
export function RouteFallback() {
  return (
    <div className="shell flex min-h-[46vh] flex-col items-center justify-center text-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
      <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-ink/40">LOADING…</p>
    </div>
  )
}

/** 404 也走同一套版式，保证「异常态」视觉统一 */
export function NotFound() {
  return (
    <div className="shell flex min-h-[52vh] flex-col items-center justify-center text-center">
      <p className="font-display text-[clamp(70px,16vw,150px)] font-extrabold leading-none text-ink/10">404</p>
      <p className="mt-2 font-hand text-2xl text-coral">这页还没写，或者被我不小心删了。</p>
      <p className="mt-2 text-[13px] text-ink/50">要不要回首页看看我的项目？</p>
      <Link to="/" className="btn-ink mt-6">
        <ArrowLeft size={14} /> 回首页
      </Link>
    </div>
  )
}
