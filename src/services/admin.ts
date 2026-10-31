/**
 * 后台管理通用服务（fx2 23 个 Tab 的真实实现入口）。
 *
 * 约定：未配置服务端时统一抛 NotSupportedError，由页面 disabled + 说明原因；
 * 所有写操作只在拿到服务端成功响应后才提示成功。
 */
import { serverConfig } from './config'
import { apiJson, apiJsonSafe, NotSupportedError } from './http'

export type Overview = {
  generatedAt: string
  content: Record<'articles' | 'projects' | 'moments' | 'danmaku', { total: number; published: number; draft: number; pending: number; hidden: number }>
  guestbook: { total: number; pending: number; published: number }
  files: { total: number; public: number; private: number; trashed: number; shares: number }
  ai: { todayCalls: number; todayTokens: number; successRate: number | null; quota: number }
  analytics: { days: { date: string; pv: number; uv: number; ai: number }[]; pv: number; uv: number; ai: number; topPages: { path: string; pv: number }[] }
  jobs: { total: number; dead: number; running: number }
  resume: { modules: number }
  env: { model: 'configured' | 'retrieval' }
}

export type SessionRow = { id: string; shortId: string; current: boolean; createdAt: string; expiresAt: string }
export type SecurityInfo = {
  user: string
  role: string
  sessions: number
  twoFactor: { enabled: boolean; available: boolean; reason: string }
  passwordPolicy: { minLength: number; maxLength: number }
}
export type AuditRow = { id: string; actor: string; action: string; target: string | null; ts: string }

export type ResumeModule = { id: string; title: string; summary: string; items: string[]; enabled: boolean; updatedAt?: string }
export type ResumeVersion = { id: string; name: string; note: string; source: string; createdAt: string; modules: ResumeModule[] }
export type ResumeState = { modules: ResumeModule[]; versions: ResumeVersion[] }

export type Report = { generatedAt: string; source: string; note: string; kpis: Record<string, number>; text: string }

const need = (feature: string) => {
  if (!serverConfig.enabled) throw new NotSupportedError(feature)
}

export async function getOverview(): Promise<Overview | null> {
  return serverConfig.enabled ? apiJsonSafe<Overview>('/api/admin/overview', { cache: 'no-store' }) : null
}

export async function changePassword(input: { current: string; next: string }): Promise<void> {
  need('修改密码')
  await apiJson('/api/admin/password', { method: 'POST', body: JSON.stringify(input) })
}

export async function getSecurity(): Promise<SecurityInfo | null> {
  return serverConfig.enabled ? apiJsonSafe<SecurityInfo>('/api/admin/security') : null
}

export async function getSessions(): Promise<SessionRow[]> {
  if (!serverConfig.enabled) return []
  return (await apiJsonSafe<SessionRow[]>('/api/admin/sessions')) ?? []
}

export async function revokeSession(id: string): Promise<void> {
  need('撤销会话')
  await apiJson(`/api/admin/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function getAudit(limit = 40): Promise<AuditRow[]> {
  if (!serverConfig.enabled) return []
  return (await apiJsonSafe<AuditRow[]>(`/api/admin/audit?limit=${limit}`)) ?? []
}

export async function generateReport(): Promise<Report> {
  need('周报生成')
  return apiJson<Report>('/api/admin/report', { method: 'POST' })
}

export async function getResumeState(): Promise<ResumeState | null> {
  // 真实模式下让错误冒泡：页面需要区分「空列表」和「接口失败」
  return serverConfig.enabled ? apiJson<ResumeState>('/api/admin/resume', { cache: 'no-store' }) : null
}

export async function saveResumeModules(modules: ResumeModule[]): Promise<ResumeModule[]> {
  need('简历模块保存')
  const data = await apiJson<{ modules: ResumeModule[] }>('/api/admin/resume/modules', { method: 'PUT', body: JSON.stringify({ modules }) })
  return data.modules
}

export async function createResumeVersion(input: { name: string; note?: string; modules?: ResumeModule[] }): Promise<ResumeVersion> {
  need('简历版本创建')
  return apiJson<ResumeVersion>('/api/admin/resume/versions', { method: 'POST', body: JSON.stringify(input) })
}

export async function restoreResumeVersion(id: string): Promise<{ modules: ResumeModule[] }> {
  need('简历版本恢复')
  return apiJson<{ modules: ResumeModule[] }>(`/api/admin/resume/versions/${id}/restore`, { method: 'POST' })
}

export async function deleteResumeVersion(id: string): Promise<void> {
  need('简历版本删除')
  await apiJson(`/api/admin/resume/versions/${id}`, { method: 'DELETE' })
}

export async function deleteBackup(id: string): Promise<void> {
  need('备份删除')
  await apiJson(`/api/admin/backup/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export type FeedbackRow = { id: string; sessionId: string; rating: 'up' | 'down'; reason: string | null; ts: string; reviewed?: boolean }
export async function getFeedback(): Promise<FeedbackRow[]> {
  if (!serverConfig.enabled) return []
  return (await apiJsonSafe<FeedbackRow[]>('/api/ai/feedback')) ?? []
}

export async function reviewFeedback(id: string, reviewed = true): Promise<void> {
  need('反馈审阅')
  await apiJson(`/api/ai/feedback/${id}`, { method: 'PATCH', body: JSON.stringify({ reviewed }) })
}

export async function deleteModel(id: string): Promise<void> {
  need('模型删除')
  await apiJson(`/api/ai/models/${id}`, { method: 'DELETE' })
}

export async function deletePrompt(id: string): Promise<void> {
  need('提示词删除')
  await apiJson(`/api/ai/prompts/${id}`, { method: 'DELETE' })
}

export async function purgeFile(id: string): Promise<void> {
  need('文件彻底删除')
  await apiJson(`/api/files/${id}?permanent=1`, { method: 'DELETE' })
}
