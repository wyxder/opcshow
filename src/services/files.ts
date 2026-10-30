/**
 * 文件与下载（fx.md F-02 / F-10 / B-05）。
 *
 * 一期：静态资源 + `download` 属性，真实可下载、离线可用；
 * 二期（接服务端，对应 server/routes/files.mjs）：
 *   签名 → 直传 → 元数据入库 → 分享短链（密码/过期/计数）→ 下载（Range）。
 * resolveDownload() 是前台唯一的下载判断口，不要在各处硬写路径。
 */
import type { ResourceFile } from '@/data/work'
import { serverConfig } from './config'
import { apiJson, NotSupportedError } from './http'

export type DownloadState =
  | { ok: true; href: string; origin: 'static' | 'signed'; label: string }
  | { ok: false; reason: string }

/** 有 url = 文件已放进 public/files 或服务端已签发；没有 = 还在等对象存储（B-05） */
export function resolveDownload(file: Pick<ResourceFile, 'id' | 'name' | 'url'>): DownloadState {
  if (file.url) {
    // 服务端返回的是相对路径，前面要补上 baseUrl，否则会打到前端静态站点
    const href = file.url.startsWith('/api/') ? `${serverConfig.baseUrl}${file.url}` : file.url
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
  const res = await fetch(`${serverConfig.baseUrl}${ticket.uploadUrl}?${query}`, {
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
}

export async function listShares(): Promise<ServerShare[]> {
  if (!serverConfig.enabled) return []
  return apiJson<ServerShare[]>('/api/files/shares')
}

export async function deleteShare(token: string): Promise<void> {
  if (!serverConfig.enabled) throw new NotSupportedError('分享短链')
  await apiJson(`/api/files/share/${token}`, { method: 'DELETE' })
}

/** 分享链接的完整地址：服务端给相对路径，这里补 baseUrl */
export function shareHref(url: string) {
  return url.startsWith('/api/') ? `${serverConfig.baseUrl}${url}` : url
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
  url: string
}

export async function listFiles(): Promise<ServerFile[]> {
  if (!serverConfig.enabled) return []
  return apiJson<ServerFile[]>('/api/files')
}

export async function setVisibility(id: string, visibility: 'public' | 'private'): Promise<void> {
  if (!serverConfig.enabled) throw new NotSupportedError('文件可见性')
  await apiJson(`/api/files/${id}/visibility`, { method: 'POST', body: JSON.stringify({ visibility }) })
}

export async function trashFile(id: string): Promise<void> {
  if (!serverConfig.enabled) throw new NotSupportedError('文件删除')
  await apiJson(`/api/files/${id}`, { method: 'DELETE' })
}

/** 简历附件（fx.md F6）：当前给真实 DOCX + 打印版 HTML，PDF 需要服务端渲染（B-08） */
export const resumeAssets = {
  docx: { href: '/files/wyx-resume-2026.docx', name: 'AI全栈开发-晓叶-研2.docx', label: '下载附件（DOCX）' },
  print: { href: '/files/wyx-resume-print.html', name: '简历打印版', label: '下载打印版（HTML）' },
  markdown: { href: '/files/wyx-resume.md', name: '简历 Markdown', label: 'Markdown' },
  /** 服务端 PDF 渲染的预留接入点：换成 `${serverConfig.baseUrl}/api/resume.pdf` 即可 */
  pdf: serverConfig.enabled ? `${serverConfig.baseUrl}/api/resume.pdf` : null,
} as const
