/**
 * 服务端能力的运行时配置（fx.md B10 / AI1）。
 *
 * 约定：前端零密钥。所有模型与对象存储的凭据只在服务端，
 * 浏览器只知道一个 baseUrl，并通过下面这些开关决定「走真实接口」还是「走本地兜底」。
 *
 * 本地开发 / 无网络环境：不配 VITE_API_BASE，站点 100% 可用（mock + 预置数据）。
 */

function env(key: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[key]
  return (v ?? '').trim()
}

const baseUrl = env('VITE_API_BASE').replace(/\/$/, '')

export const serverConfig = {
  /** 后端基地址；空字符串表示当前为纯前端演示模式 */
  baseUrl,
  /** 是否已经接入服务端。所有适配层都用它做「真实 / 预置」分流 */
  enabled: Boolean(baseUrl),
  requestTimeoutMs: Number(env('VITE_API_TIMEOUT') || 12000),
  /** AI 网关前缀（AI1/AI2）：服务端代理 OpenAI 兼容接口，前端不直连厂商 */
  aiChatPath: env('VITE_AI_CHAT_PATH') || '/api/ai/chat',
  guestbookPath: env('VITE_GUESTBOOK_PATH') || '/api/guestbook',
  uploadSignPath: env('VITE_UPLOAD_PATH') || '/api/files/sign',
  trackPath: env('VITE_TRACK_PATH') || '/api/track',
  authLoginPath: env('VITE_AUTH_LOGIN_PATH') || '/api/auth/login',
  errorReportPath: env('VITE_ERROR_REPORT_PATH') || '',
} as const

export type ServerConfig = typeof serverConfig

/**
 * 拼接接口地址。
 * baseUrl 可以是绝对地址（http://host:8787），也可以是同源前缀（/api，配合 Vite 代理或反向代理），
 * 后者不能重复拼成 /api/api/...，所以统一走这里判断。
 */
export function apiUrl(path: string) {
  if (!serverConfig.baseUrl) return path
  return path.startsWith(serverConfig.baseUrl) ? path : `${serverConfig.baseUrl}${path}`
}
