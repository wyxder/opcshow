/**
 * 埋点写入与聚合缓存的共享入口（BE-09）。
 *
 * 之前聚合缓存只读不区分窗口、AI 会话又按 path 前缀猜，导致「7d/30d 串窗」与「AI 会话恒 0」。
 * 这里把「写一条 hit」与「清缓存」收敛成两个函数：路由层与 AI 网关都用同一份实现。
 */
import { getStores } from './store.mjs'

/** key = 窗口（7d/30d），避免不同窗口共用同一份缓存 */
export const summaryCache = { windows: {} }

export function clearAnalyticsCache() {
  summaryCache.windows = {}
}

/** 从 User-Agent 粗分设备类型；只存类别不存原始 UA，避免采集可识别的浏览器指纹 */
export function deviceFromUA(ua = '') {
  const s = String(ua).toLowerCase()
  if (!s) return '未知'
  if (/ipad|tablet|kindle|silk|playbook/.test(s) || (/android/.test(s) && !/mobile/.test(s))) return '平板'
  if (/iphone|ipod|mobile|windows phone|harmonyos|opera mini/.test(s)) return '手机'
  if (/mozilla|chrome|safari|firefox|edge|msie|trident|curl|postman/.test(s)) return '桌面'
  return '未知'
}

export async function pushHit({ path, referrer = '', sessionHash = null, stayMs = 0, ipHash = null, kind = 'page', device = null }) {
  const { analytics } = await getStores()
  await analytics.update((data) => {
    data.hits.unshift({
      id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      path,
      kind,
      referrer,
      sessionHash,
      stayMs,
      ipHash,
      device,
      ts: new Date().toISOString(),
    })
    data.hits = data.hits.slice(0, 20000)
  })
  clearAnalyticsCache()
}
