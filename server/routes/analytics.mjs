/**
 * 埋点与聚合（fx.md B-06）。
 *
 * POST /api/track                只落 path / referrer / sessionHash / stayMs，IP 存哈希
 * GET  /api/analytics/summary   按日聚合，缓存 5 分钟（admin）
 * POST /api/client-errors       前端错误（无 Sentry 环境下的自托管收集）
 */
import { route } from '../lib/router.mjs'
import { sendJson, sendError, readJson, rateLimit, clientIp, ipHash, sha256 } from '../lib/http.mjs'
import { getStores } from '../lib/store.mjs'
import { getSession, requireRole } from '../lib/auth.mjs'
import { text, integer } from '../lib/validate.mjs'

const cache = { at: 0, data: null }

route('POST', '/api/track', async ({ req, res, reqId }) => {
  if (!rateLimit(`track:${clientIp(req)}`, 120, 60 * 1000).ok) return sendError(res, 429, 'RATE_LIMITED', '埋点过于频繁', reqId)
  const body = await readJson(req, 32 * 1024)
  const path = text(body.path, { field: 'path', min: 1, max: 200 })
  const referrer = body.referrer ? text(body.referrer, { field: 'referrer', max: 300 }) : ''
  const sessionHash = typeof body.sessionHash === 'string' ? sha256(body.sessionHash).slice(0, 24) : null
  const stayMs = integer(body.stayMs ?? 0, { field: 'stayMs', min: 0, max: 24 * 3600 * 1000 })
  const { analytics } = await getStores()
  await analytics.update((data) => {
    data.hits.unshift({ id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, path, referrer, sessionHash, stayMs, ipHash: ipHash(req), ts: new Date().toISOString() })
    data.hits = data.hits.slice(0, 20000)
  })
  cache.at = 0
  sendJson(res, 202, { ok: true })
})

route('POST', '/api/client-errors', async ({ req, res, reqId }) => {
  if (!rateLimit(`err:${clientIp(req)}`, 20, 60 * 1000).ok) return sendError(res, 429, 'RATE_LIMITED', '错误上报过于频繁', reqId)
  const body = await readJson(req, 32 * 1024)
  const message = text(body.message, { field: 'message', min: 1, max: 500 })
  const { analytics } = await getStores()
  await analytics.update((data) => {
    data.errors.unshift({
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      message,
      stack: typeof body.stack === 'string' ? body.stack.slice(0, 2000) : null,
      url: typeof body.url === 'string' ? body.url.slice(0, 300) : null,
      ipHash: ipHash(req),
      ts: new Date().toISOString(),
    })
    data.errors = data.errors.slice(0, 2000)
  })
  sendJson(res, 202, { ok: true })
})

route('GET', '/api/analytics/summary', async ({ req, res, reqId, url }) => {
  requireRole(await getSession(req), ['admin'])
  const window = url.searchParams.get('window') === '30d' ? 30 : 7
  if (cache.data && Date.now() - cache.at < 5 * 60 * 1000) return sendJson(res, 200, { ...cache.data, cached: true })

  const { analytics } = await getStores()
  const data = await analytics.read()
  const now = Date.now()
  const since = now - window * 86400000
  const rows = data.hits.filter((h) => new Date(h.ts).getTime() >= since)

  const days = []
  for (let i = window - 1; i >= 0; i -= 1) {
    const d = new Date(now - i * 86400000).toISOString().slice(0, 10)
    const list = rows.filter((h) => h.ts.slice(0, 10) === d)
    days.push({
      date: d,
      pv: list.length,
      uv: new Set(list.map((h) => h.sessionHash ?? h.ipHash)).size,
      ai: list.filter((h) => h.path.startsWith('/api/ai')).length,
    })
  }

  const pages = new Map()
  for (const h of rows) pages.set(h.path, (pages.get(h.path) ?? 0) + 1)
  const topPages = [...pages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, pv]) => ({ path, pv }))

  const totalPv = rows.length
  const totalUv = new Set(rows.map((h) => h.sessionHash ?? h.ipHash)).size
  const avgStay = rows.length ? Math.round(rows.reduce((s, h) => s + (h.stayMs ?? 0), 0) / rows.length / 1000) : 0

  const payload = {
    window: window === 30 ? '30d' : '7d',
    days,
    totalPv,
    totalUv,
    avgStaySec: avgStay,
    topPages,
    errors: data.errors.slice(0, 10),
    generatedAt: new Date().toISOString(),
    cached: false,
  }
  cache.at = Date.now()
  cache.data = payload
  sendJson(res, 200, payload)
})
