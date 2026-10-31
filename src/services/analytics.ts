/**
 * 站点指标（fx.md B7）。
 *
 * 当前实现 = 无 Cookie 的本机埋点：会话 id 放 sessionStorage（关标签页即失效），
 * 样本落 localStorage，只统计本机浏览过哪些页。UI 必须标「本机样本」而不是「全站 UV」。
 *
 * 需要服务端补齐的真实能力（已预留接入点）：
 *   POST /api/track          { path, referrer, sessionHash, stayMs }
 *   GET  /api/analytics/summary → { pv, uv, topPages[], bounceRate, readDepth }
 * 接入后 analyticsSource 会自动变成 'server'，后台看板不用改组件。
 */
import { STORAGE_KEYS, arrayOf, readStored, writeStored } from '@/lib/storage'
import { newId } from '@/lib/utils'
import { serverConfig } from './config'
import { apiJsonSafe } from './http'

export type PageView = { path: string; ts: number; session: string; referrer: string }

export type AnalyticsSummary = {
  source: 'local' | 'server'
  pv: number
  uv: number
  topPages: { path: string; views: number }[]
  since: string | null
  /** 平均停留秒数（BE-09：前端补发 stayMs 后才非 0） */
  avgStaySec?: number
  /** AI 会话轮次（服务端 kind='ai' 计数） */
  aiSessions?: number
  /** 服务端按日聚合（图表用） */
  days?: { date: string; pv: number; uv: number; ai: number }[]
  /** 数据口径说明，UI 直接展示，避免把本机样本讲成全站流量 */
  note: string
}

let sessionId: string | null = null

function getSessionId() {
  if (sessionId) return sessionId
  try {
    sessionId = sessionStorage.getItem('wyx:session') ?? newId('s')
    sessionStorage.setItem('wyx:session', sessionId)
  } catch {
    sessionId = newId('s')
  }
  return sessionId
}

const isViews = arrayOf<PageView>((v) => typeof v.path === 'string' && typeof v.ts === 'number')

const MAX_SAMPLES = 300

/** BE-09：记录上一页与进入时间，路由切换/页面隐藏时把真实停留时长补发出去 */
let lastPath: string | null = null
let lastAt = 0

function sendTrack(payload: Record<string, unknown>, keepalive = false) {
  if (!serverConfig.enabled) return
  const url = `${serverConfig.baseUrl}${serverConfig.trackPath}`
  const body = JSON.stringify(payload)
  try {
    if (keepalive && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
      return
    }
  } catch {
    /* sendBeacon 不可用时回落 fetch */
  }
  void apiJsonSafe(serverConfig.trackPath, { method: 'POST', body, timeoutMs: 3000 })
}

function referrerPath() {
  const ref = document.referrer
  if (!ref) return ''
  try {
    return new URL(ref).pathname
  } catch {
    return ''
  }
}

export function trackPageview(path: string) {
  const now = Date.now()
  const stayMs = lastPath && lastPath !== path ? now - lastAt : 0
  const view: PageView = {
    path,
    ts: now,
    session: getSessionId(),
    referrer: referrerPath(),
  }
  const samples = readStored<PageView[]>(STORAGE_KEYS.analytics, [], isViews)
  writeStored(STORAGE_KEYS.analytics, [...samples, view].slice(-MAX_SAMPLES))
  sendTrack({ ...view, sessionHash: view.session, stayMs, kind: 'page' })
  lastPath = path
  lastAt = now
}

/** 页面隐藏/关闭时补一条停留时长，避免平均停留永远为 0 */
export function flushStay() {
  if (!lastPath) return
  const stayMs = Date.now() - lastAt
  if (stayMs < 1000) return
  lastAt = Date.now()
  sendTrack({ path: lastPath, sessionHash: getSessionId(), stayMs, kind: 'page' }, true)
}

export function localSummary(): AnalyticsSummary {
  const samples = readStored<PageView[]>(STORAGE_KEYS.analytics, [], isViews)
  const byPath = new Map<string, number>()
  for (const s of samples) byPath.set(s.path, (byPath.get(s.path) ?? 0) + 1)
  const topPages = [...byPath.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8)
  const uv = new Set(samples.map((s) => s.session)).size
  return {
    source: 'local',
    pv: samples.length,
    uv,
    topPages,
    since: samples.length ? new Date(samples[0].ts).toLocaleString('zh-CN') : null,
    avgStaySec: 0,
    aiSessions: 0,
    note: '本机样本 · 仅统计这台浏览器访问过的页面，不代表全站流量',
  }
}

type ServerSummary = {
  pv?: number
  uv?: number
  totalPv?: number
  totalUv?: number
  topPages?: { path: string; views?: number; pv?: number }[]
  since?: string | null
  avgStaySec?: number
  aiSessions?: number
  days?: { date: string; pv?: number; uv?: number; ai?: number }[]
  note?: string
}

/** X-01：把服务端字段映射成前端类型，页面不再看到 undefined */
export function mapServerSummary(data: ServerSummary): AnalyticsSummary {
  const days = data.days ?? []
  return {
    source: 'server',
    pv: data.pv ?? data.totalPv ?? 0,
    uv: data.uv ?? data.totalUv ?? 0,
    topPages: (data.topPages ?? []).map((p) => ({ path: p.path, views: p.views ?? p.pv ?? 0 })),
    since: data.since ?? null,
    avgStaySec: data.avgStaySec ?? 0,
    aiSessions: data.aiSessions ?? days.reduce((s, d) => s + (d.ai ?? 0), 0),
    days: days.map((d) => ({ date: d.date, pv: d.pv ?? 0, uv: d.uv ?? 0, ai: d.ai ?? 0 })),
    note: data.note ?? '真实站点指标 · 无 Cookie 埋点聚合',
  }
}

export async function getSummary(window: '7d' | '30d' = '7d'): Promise<AnalyticsSummary> {
  if (serverConfig.enabled) {
    const data = await apiJsonSafe<ServerSummary>(`/api/analytics/summary?window=${window}`)
    if (data) return mapServerSummary(data)
  }
  return localSummary()
}

/** 清掉本机样本，后台「数据口径」区给一个可解释的入口 */
export function clearLocalSamples() {
  writeStored(STORAGE_KEYS.analytics, [])
}
