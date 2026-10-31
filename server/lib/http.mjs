/**
 * HTTP 基础设施（fx.md B-08 / B-09 / B-11）。
 *
 * · 统一错误体 {code, message, requestId}
 * · 安全头：CSP / nosniff / Referrer-Policy / COOP / HSTS
 * · CORS 白名单
 * · 令牌桶限流（内存，单实例足够；多实例换 Redis）
 * · Origin 校验抵御 CSRF（配合 SameSite=Lax Cookie）
 */
import { randomUUID, createHash } from 'node:crypto'
import { env } from './env.mjs'

export const requestId = () => `req_${randomUUID()}`

const baseHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
})

export function setCommonHeaders(res, req) {
  for (const [k, v] of Object.entries(baseHeaders())) res.setHeader(k, v)
  if (req?.socket?.encrypted) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
}

export function applyCors(req, res) {
  const origin = req.headers.origin
  if (!origin) return
  if (env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,If-Match,Idempotency-Key,X-CSRF-Token')
    // BE-11：让跨域前端能读到版本与缓存头，便于做乐观锁与 304 判定
    res.setHeader('Access-Control-Expose-Headers', 'ETag,X-Content-Version,X-Request-Id')
    res.setHeader('Access-Control-Max-Age', '600')
  }
}

export function sendJson(res, status, body, headers = {}) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  })
  res.end(payload)
}

export function sendError(res, status, code, message, reqId, extra = {}) {
  sendJson(res, status, { code, message, requestId: reqId, ...extra })
}

export function readBody(req, limit = 1 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(Object.assign(new Error('payload too large'), { status: 413, code: 'PAYLOAD_TOO_LARGE' }))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export async function readJson(req, limit = 1 * 1024 * 1024) {
  const buf = await readBody(req, limit)
  if (!buf.length) return {}
  try {
    return JSON.parse(buf.toString('utf8'))
  } catch {
    throw Object.assign(new Error('invalid json'), { status: 400, code: 'INVALID_JSON' })
  }
}

export function parseCookies(req) {
  const out = {}
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i === -1) continue
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

/* -------------------------------- rate limit ------------------------------- */

const buckets = new Map()
let rateChecks = 0
/** BE-07：每 500 次检查清一次过期桶，避免长跑内存只增不减 */
function sweepBuckets(now) {
  rateChecks += 1
  if (rateChecks % 500 !== 0) return
  for (const [key, b] of buckets) if (b.reset < now) buckets.delete(key)
}

export function rateLimit(key, limit, windowMs) {
  const now = Date.now()
  sweepBuckets(now)
  let b = buckets.get(key)
  if (!b || b.reset < now) {
    b = { count: 0, reset: now + windowMs }
    buckets.set(key, b)
  }
  b.count += 1
  if (b.count > limit) return { ok: false, retryAfterMs: b.reset - now }
  return { ok: true, remaining: limit - b.count }
}

/**
 * BE-02：默认只信 socket 地址。
 * 只有环境变量 TRUST_PROXY=1（确认在 Nginx / 网关后面）时，才读代理写入的 X-Real-IP。
 * 不再无条件信任 X-Forwarded-For，避免直连伪造头绕过登录限流与 AI 配额。
 */
export function clientIp(req) {
  if (env.trustProxy) {
    const real = req.headers['x-real-ip']
    if (typeof real === 'string' && real.trim()) return real.trim()
    const fwd = req.headers['x-forwarded-for']
    if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim()
  }
  return req.socket.remoteAddress ?? 'unknown'
}

/** 埋点只存哈希，不落明文 IP（B-06） */
export const ipHash = (req) => sha256(clientIp(req) + '|' + (process.env.IP_SALT || 'wyx')).slice(0, 32)

/** CSRF：非安全方法要求 Origin 在白名单内；没有 Origin 的 curl 请求放行（非浏览器场景） */
export function checkOrigin(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true
  const origin = req.headers.origin
  if (!origin) return true
  return env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')
}

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }
export function logEvent(level, event, data = {}) {
  // BE-10：LOG_LEVEL 真正生效（默认 info，测试环境可设 error 降噪）
  const min = LEVELS[String(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? LEVELS.info
  if ((LEVELS[level] ?? LEVELS.info) < min) return
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...data })
  if (level === 'error') console.error(line)
  else console.log(line)
}

/** 统一错误映射：业务代码里 throw Object.assign(new Error(msg), {status, code}) */
export function errorOf(err) {
  return {
    status: Number(err?.status) || 500,
    code: err?.code || 'INTERNAL_ERROR',
    message: err?.status ? err.message : '服务端异常',
  }
}

/** cursor 分页（B-11）：不偏移、不重复 */
export function paginate(items, cursor, limit = 20) {
  const size = Math.min(Math.max(Number(limit) || 20, 1), 100)
  const start = cursor ? items.findIndex((x) => x.id === cursor) + 1 : 0
  const slice = items.slice(start, start + size)
  const nextCursor = start + size < items.length ? slice[slice.length - 1]?.id ?? null : null
  return { items: slice, nextCursor, total: items.length }
}

/** 幂等键：写接口带 Idempotency-Key 时，5 分钟内重复请求返回第一次结果 */
const idem = new Map()
let idemWrites = 0
function sweepIdem(now) {
  idemWrites += 1
  if (idemWrites % 200 !== 0) return
  for (const [key, hit] of idem) if (hit.expires <= now) idem.delete(key)
}
export function idempotency(req, payload) {
  const key = req.headers['idempotency-key']
  if (!key) return null
  const digest = sha256(key + '|' + JSON.stringify(payload))
  const hit = idem.get(digest)
  if (hit && hit.expires > Date.now()) return hit.result
  return null
}
export function rememberIdempotency(req, payload, result) {
  const key = req.headers['idempotency-key']
  if (!key) return
  sweepIdem(Date.now())
  idem.set(sha256(key + '|' + JSON.stringify(payload)), { result, expires: Date.now() + 5 * 60 * 1000 })
}
