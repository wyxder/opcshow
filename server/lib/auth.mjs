/**
 * 鉴权与会话（fx.md B-02）。
 *
 * · 密码 scrypt 加盐，哈希只存服务端
 * · 会话 ID 随机、HttpOnly Cookie、SameSite=Lax、HTTPS 下 Secure
 * · RBAC：admin 可写全部；editor 可写内容/审核，不能改系统设置与 AI 密钥
 * · 登录失败限流、所有写操作写审计日志
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { env } from './env.mjs'
import { getStores } from './store.mjs'
import { clientIp, parseCookies, rateLimit } from './http.mjs'

export const SESSION_COOKIE = 'wyx_session'

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}

export async function ensureUsers() {
  const store = (await getStores()).users
  return store.update((data) => {
    if (data.users.length) return
    data.users = [
      { id: 'u_admin', user: env.adminUser, role: 'admin', passwordHash: hashPassword(env.adminPass), createdAt: new Date().toISOString() },
      { id: 'u_editor', user: env.editorUser, role: 'editor', passwordHash: hashPassword(env.editorPass), createdAt: new Date().toISOString() },
    ]
  })
}

export async function audit(actor, action, target, before, after) {
  const store = (await getStores()).audit
  await store.update((data) => {
    data.logs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      actor: actor ?? 'anonymous',
      action,
      target,
      before: before ?? null,
      after: after ?? null,
      ts: new Date().toISOString(),
    })
    data.logs = data.logs.slice(0, 2000)
  })
}

function cookie(value, maxAgeMs) {
  const parts = [`${SESSION_COOKIE}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${Math.floor(maxAgeMs / 1000)}`]
  if (env.cookieSecure) parts.push('Secure')
  return parts.join('; ')
}

export const clearCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`

export async function login({ user, password }, req) {
  const ip = clientIp(req)
  const limit = rateLimit(`login:${ip}`, 8, 10 * 60 * 1000)
  if (!limit.ok) throw Object.assign(new Error('尝试次数过多，请稍后再试'), { status: 429, code: 'RATE_LIMITED' })

  const { users, sessions } = await getStores()
  const data = await users.read()
  const account = data.users.find((u) => u.user === user)
  if (!account || !verifyPassword(password, account.passwordHash)) {
    await audit(user || 'anonymous', 'auth.login.failed', 'session', null, { ip })
    throw Object.assign(new Error('账号或密码不正确'), { status: 401, code: 'INVALID_CREDENTIALS' })
  }

  const sid = randomBytes(32).toString('hex')
  const expiresAt = Date.now() + env.sessionTtlMs
  await sessions.update((d) => {
    d.sessions = d.sessions.filter((s) => s.expiresAt > Date.now())
    d.sessions.push({ id: sid, user: account.user, role: account.role, createdAt: Date.now(), expiresAt })
  })
  await audit(account.user, 'auth.login', 'session', null, { ip })
  return { sid, session: { mode: 'real', user: account.user, role: account.role, expiresAt: new Date(expiresAt).toISOString() } }
}

export function sessionCookie(sid) {
  return cookie(sid, env.sessionTtlMs)
}

export async function getSession(req) {
  const sid = parseCookies(req)[SESSION_COOKIE]
  if (!sid) return null
  const { sessions } = await getStores()
  const data = await sessions.read()
  const found = data.sessions.find((s) => s.id === sid)
  if (!found || found.expiresAt < Date.now()) return null
  return { mode: 'real', user: found.user, role: found.role, expiresAt: new Date(found.expiresAt).toISOString(), sid }
}

export async function logout(req) {
  const sid = parseCookies(req)[SESSION_COOKIE]
  const session = await getSession(req)
  if (sid) {
    const { sessions } = await getStores()
    await sessions.update((d) => {
      d.sessions = d.sessions.filter((s) => s.id !== sid)
    })
  }
  if (session) await audit(session.user, 'auth.logout', 'session', null, null)
  return clearCookie()
}

export const ROLE_WRITE = ['admin', 'editor']
export const ROLE_ADMIN = ['admin']

export function requireRole(session, roles = ROLE_WRITE) {
  if (!session) throw Object.assign(new Error('未登录'), { status: 401, code: 'UNAUTHORIZED' })
  if (!roles.includes(session.role)) throw Object.assign(new Error('当前角色无权执行该操作'), { status: 403, code: 'FORBIDDEN' })
  return session
}
