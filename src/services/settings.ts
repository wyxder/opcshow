/**
 * 个人资料 / 站点设置 / 友链申请（BE-14 的前端适配层）。
 *
 * 未配置服务端时：读回落本地 profile，写操作抛 NotSupportedError，由页面禁用并说明原因。
 * 配置后：PUT /api/admin/profile、PUT /api/admin/settings、POST /api/friend-requests。
 */
import { serverConfig } from './config'
import { apiJson, apiJsonSafe, NotSupportedError } from './http'

export type ProfilePatch = {
  name?: string
  latin?: string
  handle?: string
  role?: string
  tagline?: string
  location?: string
  hometown?: string
  age?: number
  status?: string
  availability?: string
  email?: string
  wechat?: string
  phone?: string
  bio?: string[]
  keywords?: string[]
}

export type SiteSettings = {
  url?: string
  title?: string
  description?: string
  keywords?: string[]
  ogImage?: string
  defaultTheme?: string
  sitemap?: boolean
  structuredData?: boolean
  analytics?: boolean
  updatedAt?: string
}

export async function getProfile(): Promise<ProfilePatch | null> {
  if (!serverConfig.enabled) return null
  return apiJsonSafe<ProfilePatch>('/api/profile')
}

export async function saveProfile(patch: ProfilePatch): Promise<ProfilePatch> {
  if (!serverConfig.enabled) throw new NotSupportedError('个人资料保存')
  return apiJson<ProfilePatch>('/api/admin/profile', { method: 'PUT', body: JSON.stringify(patch) })
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  if (!serverConfig.enabled) return null
  const data = await apiJsonSafe<{ site: SiteSettings | null }>('/api/admin/settings')
  return data?.site ?? null
}

/** 前台只读站点设置（主题默认值 / SEO），公开接口，不需要登录 */
export async function getPublicSiteSettings(): Promise<SiteSettings | null> {
  if (!serverConfig.enabled) return null
  const data = await apiJsonSafe<{ site: SiteSettings | null }>('/api/settings')
  return data?.site ?? null
}

export async function saveSiteSettings(patch: SiteSettings): Promise<SiteSettings> {
  if (!serverConfig.enabled) throw new NotSupportedError('站点设置保存')
  return apiJson<SiteSettings>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(patch) })
}

export async function submitFriendLink(input: { name: string; url: string; desc?: string }): Promise<{ id: string; status: string }> {
  if (!serverConfig.enabled) throw new NotSupportedError('友链提交')
  return apiJson<{ id: string; status: string }>('/api/friend-requests', { method: 'POST', body: JSON.stringify(input) })
}

export type FriendRequest = { id: string; name: string; url: string; desc?: string; createdAt?: string }

export async function listFriendRequests(): Promise<FriendRequest[]> {
  if (!serverConfig.enabled) return []
  return (await apiJsonSafe<FriendRequest[]>('/api/admin/friend-requests', { cache: 'no-store' })) ?? []
}

export async function reviewFriendRequest(id: string, status: 'published' | 'hidden'): Promise<void> {
  if (!serverConfig.enabled) throw new NotSupportedError('友链审核')
  await apiJson(`/api/admin/friend-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
}
