/**
 * 后台增强能力的统一前端入口。
 *
 * 与 server/routes/adminx.mjs 一一对应。约定：
 * · 写操作只在服务端返回成功之后 resolve；失败抛 ApiError，调用方不得弹「已提交」
 * · 未接服务端（serverConfig.enabled === false）时读操作返回空值、写操作抛 NotSupportedError
 * · 确实不具备的能力（邮件 / TOTP / CDN / 收录推送）由 capabilities 如实暴露，前端禁用并说明原因
 */
import { apiUrl, serverConfig } from './config'
import { apiJson, apiJsonSafe, NotSupportedError } from './http'

const need = (feature: string) => {
  if (!serverConfig.enabled) throw new NotSupportedError(feature)
}
const get = <T>(path: string) => (serverConfig.enabled ? apiJsonSafe<T>(path, { cache: 'no-store' }) : Promise.resolve(null))
const send = <T>(path: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown) => {
  need(path)
  return apiJson<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })
}

/* ------------------------------- 类型 ------------------------------- */

export type AdminUser = { id: string; user: string; role: 'admin' | 'editor'; active: boolean; createdAt?: string; updatedAt?: string }
export type ApiToken = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; revoked: boolean }
export type Capability = { available: boolean; reason?: string }
export type Capabilities = Record<string, Capability>
export type IpGuard = { enabled: boolean; cidrs: string[]; updatedAt?: string }
export type BackupPlan = { enabled: boolean; time: string; retain: number; lastRunAt: string | null; note?: string }
export type AiSettings = {
  dailyQuota: number
  monthlyTokenBudget: number
  perVisitorDailyLimit: number
  globalConstraint: string
  fallbackModelId: string | null
  updatedAt: string | null
  note?: string
}
export type AiLogRow = { id: string; ts: string; day?: string; model: string; tokens: number; latency?: number; source?: string; ok: boolean; cost?: number }
export type StorageReport = {
  totalBytes: number
  uploadsBytes: number
  orphanBytes: number
  orphans: number
  orphanList: { name: string; sizeBytes: number }[]
  tmpBytes: number
  tmpCount: number
  tmpList: { name: string; sizeBytes: number }[]
  byCategory: Record<string, number>
  files: number
  published: number
  trashed: number
  pending: number
  shares: number
  sharesExpired: number
  limits: { maxBytes: number; allowedExt: string[]; driver: string; dir: string }
}
export type DuplicateGroup = { id: string; name: string; sizeBytes: number; status: string; createdAt: string }[]
export type ReviewRules = { autoApprove: boolean; keywordBlacklist: string[]; maxLength: number; requireLogin: boolean; updatedAt: string | null }
export type RealtimeStats = { online: number; todayPv: number; todayUv: number; todayAi: number; totalHits: number; generatedAt: string }
export type AnalyticsBreakdown = {
  window: '7d' | '30d'
  samples: number
  pageRank: { path: string; pv: number }[]
  sourceShare: { name: string; value: number; percent: number }[]
  hourly: { hour: number; value: number }[]
  readDepth: { label: string; value: number }[]
  funnels: { label: string; value: number }[]
  aiSessions: { name: string; value: number }[]
  deviceShare: { name: string; value: number; percent: number }[]
  deviceSamples: number
  regionShare: []
  unsupported: { key: string; reason: string }[]
  generatedAt: string
}
export type AnalyticsLogPage = { items: Record<string, unknown>[]; total: number }
export type SeoStatus = {
  indexablePages: number
  publishedContent: number
  sitemap: string
  canonical: string
  robots: string
  updatedAt: string | null
  submitAvailable: boolean
  note: string
}
export type AssetsInfo = { version: string; builtAt: string | null; refreshedAt: string | null; cdnAvailable: boolean; note: string }
export type SiteConfigExport = {
  version: number
  exportedAt: string
  site: unknown
  profile: unknown
  ipGuard: unknown
  reviewRules: unknown
  backupPlan: unknown
  prompts: unknown[]
  aiSettings: unknown
  globalConstraint: string
  resumeModules: unknown[]
}

/* ---------------------------- 账号管理 ---------------------------- */

export const listUsers = async () => (await get<AdminUser[]>('/api/admin/users')) ?? []
export const createUser = (input: { user: string; password: string; role: 'admin' | 'editor' }) =>
  send<AdminUser>('/api/admin/users', 'POST', input)
export const updateUser = (id: string, patch: { user?: string; role?: 'admin' | 'editor'; active?: boolean }) =>
  send<AdminUser>(`/api/admin/users/${encodeURIComponent(id)}`, 'PATCH', patch)
export const deleteUser = (id: string) => send<{ ok: boolean }>(`/api/admin/users/${encodeURIComponent(id)}`, 'DELETE')
export const resetUserPassword = (id: string, password?: string) =>
  send<{ ok: boolean; password: string; note: string }>(`/api/admin/users/${encodeURIComponent(id)}/reset-password`, 'POST', password ? { password } : {})

/* ------------------------------ 安全 ------------------------------ */

export const listTokens = async () => (await get<ApiToken[]>('/api/admin/tokens')) ?? []
export const createToken = (name: string) => send<ApiToken & { token: string }>('/api/admin/tokens', 'POST', { name })
export const revokeToken = (id: string) => send<{ ok: boolean }>(`/api/admin/tokens/${encodeURIComponent(id)}`, 'DELETE')
export const getIpGuard = () => get<IpGuard>('/api/admin/ip-guard')
export const saveIpGuard = (value: { enabled: boolean; cidrs: string[] }) => send<IpGuard>('/api/admin/ip-guard', 'PUT', value)
export const getCapabilities = () => get<Capabilities>('/api/admin/capabilities')
export const getLoginLogs = async (limit = 30) => (await get<Record<string, unknown>[]>(`/api/admin/security/logins?limit=${limit}`)) ?? []

/* ------------------------- 备份 / 配置 / 资源 ------------------------- */

/** 触发浏览器下载；同源请求会自动携带会话 Cookie */
export function downloadUrl(path: string, filename?: string) {
  need('文件下载')
  const a = document.createElement('a')
  a.href = apiUrl(path)
  if (filename) a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export const downloadBackup = (id: string) => downloadUrl(`/api/admin/backup/${encodeURIComponent(id)}/download`, id)
export const restoreBackup = (id: string) => send<{ ok: boolean }>(`/api/admin/backup/${encodeURIComponent(id)}/restore`, 'POST')
export const importBackup = (snapshot: unknown) => send<{ id: string; bytes: number; note: string }>('/api/admin/backup/import', 'POST', snapshot)
export const exportConfig = () => get<SiteConfigExport>('/api/admin/config/export')
export const importConfig = (config: unknown) => send<{ ok: boolean; applied: string[] }>('/api/admin/config/import', 'POST', config)
export const getBackupPlan = () => get<BackupPlan>('/api/admin/backup-plan')
export const saveBackupPlan = (value: { enabled: boolean; time: string; retain: number }) => send<BackupPlan>('/api/admin/backup-plan', 'PUT', value)
export const cleanupBackups = (keep: number) => send<{ ok: boolean; removed: number; kept: number }>('/api/admin/backup/cleanup', 'POST', { keep })
export const getAssets = () => get<AssetsInfo>('/api/admin/assets')
export const refreshAssets = () => send<{ ok: boolean; refreshedAt: string; note: string }>('/api/admin/assets/refresh', 'POST')
export const exportAnalyticsCsv = (limit = 5000) => downloadUrl(`/api/admin/analytics/export?limit=${limit}`)

/* ------------------------------- AI ------------------------------- */

export const resetAiUsage = () => send<{ ok: boolean; cleared: number }>('/api/admin/ai/usage/reset', 'POST')
export const clearAiCache = () => send<{ ok: boolean; cleared: number }>('/api/admin/ai/cache', 'DELETE')
export const getAiSettings = () => get<AiSettings>('/api/admin/ai/settings')
export const saveAiSettings = (value: Partial<AiSettings>) => send<AiSettings>('/api/admin/ai/settings', 'PUT', value)
export const getAiLogs = async (limit = 50) => (await get<AiLogRow[]>(`/api/admin/ai/logs?limit=${limit}`)) ?? []
export const aiFailover = (modelId?: string) => send<{ ok: boolean; modelId: string; model: string; name: string }>('/api/admin/ai/failover', 'POST', modelId ? { modelId } : {})

/* ------------------------------ 文件 ------------------------------ */

export const getStorageReport = () => get<StorageReport>('/api/admin/files/storage')
export const getDuplicates = () => get<{ groups: DuplicateGroup[]; reclaimableBytes: number }>('/api/admin/files/duplicates')
export const emptyTrash = () => send<{ ok: boolean; removed: number; freedBytes: number }>('/api/admin/files/trashed', 'DELETE')
export const cleanupFiles = (opts: { orphans?: boolean; tmp?: boolean; expiredShares?: boolean }) =>
  send<{ ok: boolean; orphansRemoved: number; bytesFreed: number; tmpRemoved: number; sharesRemoved: number }>('/api/admin/files/cleanup', 'POST', opts)

/* ------------------------------ 审核 ------------------------------ */

export const batchReviewDanmaku = (ids: string[], action: 'approve' | 'reject' | 'delete') =>
  send<{ ok: boolean; changed: number }>('/api/admin/danmaku/batch-review', 'POST', { ids, action })
export const getReviewRules = () => get<ReviewRules>('/api/admin/review-rules')
export const saveReviewRules = (value: Omit<ReviewRules, 'updatedAt'>) => send<ReviewRules>('/api/admin/review-rules', 'PUT', value)
export const listAllFriendRequests = async () => (await get<Record<string, unknown>[]>('/api/admin/friend-requests/all')) ?? []

/* ------------------------------ 看板 ------------------------------ */

export const getRealtime = () => get<RealtimeStats>('/api/admin/analytics/realtime')
export const getAnalyticsBreakdown = (win: '7d' | '30d' = '7d') => get<AnalyticsBreakdown>(`/api/admin/analytics/breakdown?window=${win}`)
export const getAnalyticsLogs = (params: { limit?: number; kind?: string; q?: string } = {}) => {
  const q = new URLSearchParams()
  if (params.limit) q.set('limit', String(params.limit))
  if (params.kind) q.set('kind', params.kind)
  if (params.q) q.set('q', params.q)
  return get<AnalyticsLogPage>(`/api/admin/analytics/logs?${q.toString()}`)
}

/* ------------------------------ 简历 ------------------------------ */

export const getLatestParse = () => get<Record<string, unknown> | null>('/api/admin/resume/parse/latest')
export const syncResumeFromParse = () => send<{ ok: boolean; modules: number; from: string }>('/api/admin/resume/sync', 'POST')

/* ------------------------------ SEO ------------------------------ */

export const getSeoStatus = () => get<SeoStatus>('/api/admin/seo/status')

/** 读取用户选择的 JSON 文件，供配置导入 / 备份导入使用 */
export async function readJsonFile(file: File): Promise<unknown> {
  const text = await file.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('文件不是有效的 JSON')
  }
}

/** 把任意对象下载成 .json */
export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
