/**
 * 极简路由（fx.md B-11：统一 /api 前缀 + 版本兼容）。
 * 同时接受 /api/... 与 /api/v1/...，前端现有路径无需改动。
 */

const table = []

export function add(method, pattern, handler, options = {}) {
  const keys = []
  const source = pattern
    .replace(/\/:([^/]+)/g, (_, key) => {
      keys.push(key)
      return '/([^/]+)'
    })
    .replace(/\//g, '\\/')
  table.push({ method, re: new RegExp(`^${source}$`), keys, handler, options })
}

export function route(method, pattern, handler, options) {
  add(method, pattern, handler, options)
  if (pattern.startsWith('/api/')) add(method, `/api/v1${pattern.slice(4)}`, handler, options)
}

export function match(method, pathname) {
  const path = pathname.replace(/\/$/, '') || '/'
  for (const item of table) {
    if (item.method !== method && !(method === 'HEAD' && item.method === 'GET')) continue
    const m = item.re.exec(path)
    if (!m) continue
    const params = {}
    item.keys.forEach((k, i) => {
      params[k] = decodeURIComponent(m[i + 1])
    })
    return { handler: item.handler, params, options: item.options }
  }
  return null
}

export const routes = table
