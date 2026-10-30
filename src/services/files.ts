/**
 * 文件与下载（fx.md F2 / F6 / B6）。
 *
 * 一期（当前）：静态资源 + `download` 属性，真实可下载、离线可用；
 * 二期（接服务端）：服务端签发对象存储临时 URL / 直传签名 / 分享短链。
 * resolveDownload() 是页面上唯一的下载判断口，不要在各处硬写路径。
 */
import type { ResourceFile } from '@/data/work'
import { serverConfig } from './config'
import { apiJson, NotSupportedError } from './http'

export type DownloadState =
  | { ok: true; href: string; origin: 'static' | 'signed'; label: string }
  | { ok: false; reason: string }

/** 有 url = 文件已放进 public/files；没有 = 还在等服务端 / 对象存储（B6） */
export function resolveDownload(file: Pick<ResourceFile, 'id' | 'name' | 'url'>): DownloadState {
  if (file.url) return { ok: true, href: file.url, origin: 'static', label: '下载' }
  return { ok: false, reason: '该文件尚未上传到对象存储（需要 B6 直传签名），可先邮件索取' }
}

export type UploadTicket = { url: string; method: string; headers: Record<string, string>; expiresAt: string }

/**
 * B6 直传签名：服务端只发签名，密钥不落前端。
 * 未配置服务端时抛 NotSupportedError，调用方提示「演示模式」。
 */
export async function requestUploadTicket(input: { name: string; size: number; type: string }): Promise<UploadTicket> {
  if (!serverConfig.enabled) throw new NotSupportedError('文件上传')
  return apiJson<UploadTicket>(serverConfig.uploadSignPath, { method: 'POST', body: JSON.stringify(input) })
}

export type ShareLink = { token: string; url: string; expireAt: string | null; needPassword: boolean }

export async function createShareLink(input: { fileId: string; password?: string; expireAt?: string }): Promise<ShareLink> {
  if (!serverConfig.enabled) throw new NotSupportedError('分享短链')
  return apiJson<ShareLink>('/api/files/share', { method: 'POST', body: JSON.stringify(input) })
}

/** 简历附件（fx.md F6）：当前给真实 DOCX + 打印版 HTML，PDF 需要服务端渲染（B8） */
export const resumeAssets = {
  docx: { href: '/files/wyx-resume-2026.docx', name: 'AI全栈开发-魏云潇-研2.docx', label: '下载附件（DOCX）' },
  print: { href: '/files/wyx-resume-print.html', name: '简历打印版', label: '下载打印版（HTML）' },
  markdown: { href: '/files/wyx-resume.md', name: '简历 Markdown', label: 'Markdown' },
  /** 服务端 PDF 渲染的预留接入点：换成 `${serverConfig.baseUrl}/api/resume.pdf` 即可 */
  pdf: serverConfig.enabled ? `${serverConfig.baseUrl}/api/resume.pdf` : null,
} as const
