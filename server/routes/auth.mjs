import { route } from '../lib/router.mjs'
import { sendJson, readJson, sendError, rateLimit, clientIp } from '../lib/http.mjs'
import { login, logout, getSession, sessionCookie, clearCookie } from '../lib/auth.mjs'
import { text } from '../lib/validate.mjs'

route('POST', '/api/auth/login', async ({ req, res, reqId }) => {
  const ip = clientIp(req)
  if (!rateLimit(`login-ip:${ip}`, 10, 10 * 60 * 1000).ok) return sendError(res, 429, 'RATE_LIMITED', '尝试次数过多', reqId)
  const body = await readJson(req, 64 * 1024)
  const payload = { user: text(body.user, { field: 'user', min: 1, max: 64 }), password: text(body.password, { field: 'password', min: 6, max: 128 }) }
  const { sid, session } = await login(payload, req)
  res.setHeader('Set-Cookie', sessionCookie(sid))
  sendJson(res, 200, session)
})

route('POST', '/api/auth/logout', async ({ req, res }) => {
  res.setHeader('Set-Cookie', await logout(req))
  sendJson(res, 200, { ok: true })
})

route('GET', '/api/auth/session', async ({ req, res, reqId }) => {
  const session = await getSession(req)
  if (!session) return sendError(res, 401, 'UNAUTHORIZED', '未登录', reqId, { mode: 'real' })
  const { sid, ...rest } = session
  sendJson(res, 200, rest)
})

route('POST', '/api/auth/refresh', async ({ req, res, reqId }) => {
  const session = await getSession(req)
  if (!session) return sendError(res, 401, 'UNAUTHORIZED', '会话已过期', reqId)
  sendJson(res, 200, { mode: session.mode, user: session.user, role: session.role, expiresAt: session.expiresAt })
})

route('GET', '/api/auth/csrf', async ({ res }) => {
  // SameSite=Lax + Origin 校验已覆盖浏览器场景；这里只返回防护方案说明
  sendJson(res, 200, { scheme: 'origin-check + sameSite=lax' })
})
