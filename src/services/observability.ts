/**
 * 错误上报（fx.md R1 的生产期部分）。
 *
 * 开发期直接把堆栈打到控制台；生产期：
 *   · 配了 VITE_ERROR_REPORT_PATH → POST 到自己的收集端点（或换 Sentry transport）
 *   · 没配 → 只留一条 warn，不发任何请求，保证离线环境没有额外报错
 * 上报里绝不带用户输入内容，只带路由与错误摘要。
 */
import { serverConfig } from './config'

export type ErrorContext = { route?: string; boundary?: string; component?: string }

const reported = new Set<string>()
const MAX_REPORTS = 20

function fingerprint(err: unknown, ctx: ErrorContext) {
  const message = err instanceof Error ? err.message : String(err)
  return `${ctx.boundary ?? ''}|${ctx.route ?? ''}|${message}`
}

export function reportError(err: unknown, ctx: ErrorContext = {}) {
  const key = fingerprint(err, ctx)
  const firstTime = !reported.has(key) && reported.size < MAX_REPORTS
  if (firstTime) reported.add(key)

  if (import.meta.env.DEV) {
    console.error('[ErrorBoundary]', ctx, err)
  } else if (firstTime) {
    console.warn(`[site] 已捕获异常：${ctx.boundary ?? 'app'} · ${ctx.route ?? location.pathname}`)
  }

  if (!serverConfig.enabled || !serverConfig.errorReportPath || !firstTime) return
  const payload = {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack?.split('\n').slice(0, 6).join('\n') : undefined,
    route: ctx.route ?? location.pathname,
    boundary: ctx.boundary,
    ua: navigator.userAgent,
    ts: Date.now(),
  }
  // sendBeacon 在不阻塞渲染的前提下送出去；拿不到就退化成 fetch(fire-and-forget)
  try {
    const body = JSON.stringify(payload)
    const beacon = navigator.sendBeacon?.(`${serverConfig.baseUrl}${serverConfig.errorReportPath}`, body)
    if (!beacon) {
      void fetch(`${serverConfig.baseUrl}${serverConfig.errorReportPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => undefined)
    }
  } catch {
    /* 上报失败绝不能引出第二次错误 */
  }
}
