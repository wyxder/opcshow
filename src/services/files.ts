/**
 * 文件与下载（fx.md F-02 / F-10 / B-05）。
 *
 * 一期：静态资源 + `download` 属性，真实可下载、离线可用；
 * 二期（接服务端，对应 server/routes/files.mjs）：
 *   签名 → 直传 → 元数据入库 → 分享短链（密码/过期/计数）→ 下载（Range）。
 * resolveDownload() 是前台唯一的下载判断口，不要在各处硬写路径。
 */
import type { ResourceFile } from '@/data/work'
import { apiUrl, serverConfig } from './config'
import { apiJson, NotSupportedError } from './http'

export type DownloadState =
  | { ok: true; href: string; origin: 'static' | 'signed'; label: string }
  | { ok: false; reason: string }

/** 有 url = 文件已放进 public/files 或服务端已签发；没有 = 还在等对象存储（B-05） */
export function resolveDownload(file: Pick<ResourceFile, 'id' | 'name' | 'url'>): DownloadState {
  if (file.url) {
    // 服务端返回的是相对路径，前面要补上 baseUrl（支持 /api 同源前缀）
    const href = file.url.startsWith('/api/') ? apiUrl(file.url) : file.url
    return { ok: true, href, origin: file.url.startsWith('/api/') ? 'signed' : 'static', label: '下载' }
  }
  return { ok: false, reason: '该文件尚未上传到对象存储（需要 B-05 直传签名），可先邮件索取' }
}

/* --------------------------------- 直传签名 -------------------------------- */

export type UploadTicket = {
  driver?: string
  key: string
  uploadUrl: string
  method: string
  headers: Record<string, string>
  expiresAt: string
  maxBytes?: number
}

export type UploadedFile = { id: string; key: string; size: string; url: string }

/** 服务端只发签名，存储密钥不落前端；未配置服务端时抛 NotSupportedError */
export async function requestUploadTicket(input: { name: string; size: number; type: string }): Promise<UploadTicket> {
  if (!serverConfig.enabled) throw new NotSupportedError('文件上传')
  return apiJson<UploadTicket>(serverConfig.uploadSignPath, { method: 'POST', body: JSON.stringify(input) })
}

/** 按签名把二进制推到 uploadUrl；name/category 作为查询参数供服务端登记元数据 */
export async function uploadToTicket(ticket: UploadTicket, file: File, meta: { category: string }): Promise<UploadedFile> {
  if (!serverConfig.enabled) throw new NotSupportedError('文件上传')
  const query = new URLSearchParams({ name: file.name, category: meta.category })
  const res = await fetch(`${apiUrl(ticket.uploadUrl)}?${query}`, {
    method: ticket.method,
    headers: ticket.headers,
    body: file,
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`上传失败：HTTP ${res.status}`)
  return (await res.json()) as UploadedFile
}

/* --------------------------------- 分享短链 -------------------------------- */

export type ShareLink = {
  id?: string
  token: string
  url: string
  hasPassword: boolean
  expiresAt: string | null
}

export async function createShareLink(input: { fileId: string; password?: string; expiresDays?: number }): Promise<ShareLink> {
  if (!serverConfig.enabled) throw new NotSupportedError('分享短链')
  return apiJson<ShareLink>('/api/files/share', { method: 'POST', body: JSON.stringify(input) })
}

export type ServerShare = {
  id: string
  fileId: string
  name: string
  token: string
  expiresAt: string | null
  visits: number
  createdAt: string
  /** 服务端只返回是否设置密码，不返回哈希 */
  hasPassword?: boolean
}

export async function listShares(): Promise<ServerShare[]> {
  if (!serverConfig.enabled) return []
  return apiJson<ServerShare[]>('/api/files/shares', { cache: 'no-store' })
}

export async function deleteShare(token: string): Promise<void> {
  if (!serverConfig.enabled) throw new NotSupportedError('分享短链')
  await apiJson(`/api/files/share/${token}`, { method: 'DELETE' })
}

/** 分享链接的完整地址：服务端给相对路径，这里补 baseUrl */
export function shareHref(url: string) {
  return url.startsWith('/api/') ? apiUrl(url) : url
}

/* --------------------------------- 文件库 ---------------------------------- */

export type ServerFile = {
  id: string
  name: string
  ext: string
  size: string
  category: string
  visibility: 'public' | 'private'
  downloads: number
  date: string
  /** 回收站条目没有下载地址 */
  url?: string
  /** published / trashed */
  status?: string
}

export async function listFiles(scope: 'public' | 'admin' = 'public'): Promise<ServerFile[]> {
  if (!serverConfig.enabled) return []
  const query = scope === 'admin' ? '?scope=admin' : ''
  return apiJson<ServerFile[]>(`/api/files${query}`, scope === 'admin' ? { cache: 'no-store' } : {})
}

/** 后台编辑文件记录（名称/分类/大小/可见性/状态），字段白名单与服务端 PATCH /api/files/:id 对齐 */
export type FilePatch = Partial<Pick<ServerFile, 'name' | 'category' | 'size' | 'visibility' | 'status'>>

export async function updateFile(id: string, patch: FilePatch): Promise<ServerFile> {
  if (!serverConfig.enabled) throw new NotSupportedError('文件编辑')
  return apiJson<ServerFile>(`/api/files/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

/** 手工新建「待上传」记录：只有元数据，没有真实文件，服务端不会给出下载地址 */
export async function createFileRecord(input: { name: string; category?: string; size?: string }): Promise<ServerFile> {
  if (!serverConfig.enabled) throw new NotSupportedError('新建文件记录')
  return apiJson<ServerFile>('/api/files', { method: 'POST', body: JSON.stringify(input) })
}

export async function setVisibility(id: string, visibility: 'public' | 'private'): Promise<void> {
  if (!serverConfig.enabled) throw new NotSupportedError('文件可见性')
  await apiJson(`/api/files/${id}/visibility`, { method: 'POST', body: JSON.stringify({ visibility }) })
}

export async function trashFile(id: string): Promise<void> {
  if (!serverConfig.enabled) throw new NotSupportedError('文件删除')
  await apiJson(`/api/files/${id}`, { method: 'DELETE' })
}

export async function restoreFile(id: string): Promise<void> {
  if (!serverConfig.enabled) throw new NotSupportedError('文件恢复')
  await apiJson(`/api/files/${id}/restore`, { method: 'POST' })
}

/** 简历附件（fx.md F6）：当前给真实 DOCX + 打印版 HTML，PDF 需要服务端渲染（B-08） */
export const resumeAssets = {
  docx: { href: '/files/wyx-resume-2026.docx', name: 'AI全栈开发-晓叶-研2.docx', label: '下载附件（DOCX）' },
  print: { href: '/files/wyx-resume-print.html', name: '简历打印版', label: '下载打印版（HTML）' },
  markdown: { href: '/files/wyx-resume.md', name: '简历 Markdown', label: 'Markdown' },
  /** 服务端 PDF 渲染的预留接入点：换成 apiUrl('/api/resume.pdf') 即可 */
  pdf: serverConfig.enabled ? apiUrl('/api/resume.pdf') : null,
} as const
