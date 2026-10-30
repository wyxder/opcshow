/**
 * 后台鉴权（fx.md B2）。
 *
 * 现状：站点没有任何服务端，所以「未登录也能进 /admin」是事实，不能假装已经守卫住了。
 * 这里的做法是：
 *   · 未配置服务端 → getSession() 返回 demo 会话，RequireAuth 放行，但后台顶部会挂一条
 *     显眼的「演示模式 · 未鉴权」提示，避免误当成生产可用；
 *   · 配置了服务端 → 走 /api/auth/session（HttpOnly Refresh Cookie + Access Token），
 *     拿不到会话就跳登录，路由守卫和审计日志的接入点已经留好。
 *
 * 需要服务端补齐：POST /api/auth/login、POST /api/auth/logout、GET /api/auth/session、
 * RBAC（admin / editor 两角色）、操作审计日志。
 */
import { serverConfig } from './config'
import { apiJson, apiJsonSafe, NotSupportedError } from './http'

export type AdminRole = 'admin' | 'editor' | 'demo'

export type AdminSession = {
  mode: 'demo' | 'real'
  user: string
  role: AdminRole
  /** 真实会话的过期时间，demo 会话没有 */
  expiresAt?: string
}

export const DEMO_SESSION: AdminSession = { mode: 'demo', user: '演示访客', role: 'demo' }

export async function getSession(): Promise<AdminSession | null> {
  if (!serverConfig.enabled) return DEMO_SESSION
  // 真实模式下拿不到会话 = 未登录，由 RequireAuth 把用户拦在登录页
  return apiJsonSafe<AdminSession>('/api/auth/session')
}

export async function login(input: { user: string; password: string }): Promise<AdminSession> {
  if (!serverConfig.enabled) throw new NotSupportedError('后台登录')
  return apiJson<AdminSession>(serverConfig.authLoginPath, { method: 'POST', body: JSON.stringify(input) })
}

export async function logout() {
  if (!serverConfig.enabled) return
  await apiJsonSafe('/api/auth/logout', { method: 'POST' })
}

/** 写操作前的统一检查：真实模式下 role 必须是 admin/editor */
export function canWrite(session: AdminSession | null) {
  if (session?.mode === 'demo') return true // 演示模式不拦，但界面会标注未鉴权
  return session?.role === 'admin' || session?.role === 'editor'
}
