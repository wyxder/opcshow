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
  const view: PageView = {
    path,
    ts: Date.now(),
    session: getSessionId(),
    referrer: referrerPath(),
  }
  const samples = readStored<PageView[]>(STORAGE_KEYS.analytics, [], isViews)
  writeStored(STORAGE_KEYS.analytics, [...samples, view].slice(-MAX_SAMPLES))
  if (serverConfig.enabled) {
    // 不落明文 IP，服务端自己做哈希与限流（B5）
    void apiJsonSafe(serverConfig.trackPath, { method: 'POST', body: JSON.stringify({ ...view, stayMs: undefined }) })
  }
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
    note: '本机样本 · 仅统计这台浏览器访问过的页面，不代表全站流量',
  }
}

export async function getSummary(): Promise<AnalyticsSummary> {
  if (serverConfig.enabled) {
    const data = await apiJsonSafe<AnalyticsSummary>('/api/analytics/summary')
    if (data) return { ...data, source: 'server', note: '真实站点指标 · 无 Cookie 埋点聚合' }
  }
  return localSummary()
}

/** 清掉本机样本，后台「数据口径」区给一个可解释的入口 */
export function clearLocalSamples() {
  writeStored(STORAGE_KEYS.analytics, [])
}
