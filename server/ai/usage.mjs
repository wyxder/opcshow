/**
 * 用量、配额与缓存（fx.md A-06）。
 *
 * ai.json.usage 按天记账：{ day, model, tokens, cost, latency, source, ok }
 * 配额按 IP + 天；超限直接 429，前端自动落回预置问答。
 * 缓存键 = sha256(归一化问题 + 阅读上下文 + prompt 版本)，命中不消耗额度。
 */
import { createHash } from 'node:crypto'
import { env } from '../lib/env.mjs'
import { getStores } from '../lib/store.mjs'

export const today = () => new Date().toISOString().slice(0, 10)

export const cacheKey = (message, context, promptVersion) =>
  createHash('sha256')
    .update(`${message.trim().toLowerCase()}|${JSON.stringify(context ?? null)}|v${promptVersion}`)
    .digest('hex')

export async function checkQuota(ip) {
  const { ai } = await getStores()
  const data = await ai.read()
  const day = today()
  const used = data.usage.filter((u) => u.day === day && u.ip === ip).length
  return { ok: used < env.ai.dailyQuota, used, limit: env.ai.dailyQuota }
}

export async function recordUsage({ ip, model, tokens, cost, latency, source, ok }) {
  const { ai } = await getStores()
  await ai.update((data) => {
    data.usage.unshift({
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      day: today(),
      ip,
      model,
      tokens,
      cost,
      latency,
      source,
      ok,
      ts: new Date().toISOString(),
    })
    data.usage = data.usage.slice(0, 5000)
  })
}

export async function getUsageSummary() {
  const { ai } = await getStores()
  const data = await ai.read()
  const day = today()
  const month = day.slice(0, 7)
  const monthRows = data.usage.filter((u) => u.day.startsWith(month))
  const tokens = monthRows.reduce((s, u) => s + (u.tokens ?? 0), 0)
  const cost = monthRows.reduce((s, u) => s + (u.cost ?? 0), 0)
  const ok = monthRows.filter((u) => u.ok).length
  const latency = monthRows.length ? Math.round(monthRows.reduce((s, u) => s + (u.latency ?? 0), 0) / monthRows.length) : 0

  const byDay = new Map()
  for (const u of monthRows) {
    const cur = byDay.get(u.day) ?? { tokens: 0, cost: 0, calls: 0 }
    cur.tokens += u.tokens ?? 0
    cur.cost += u.cost ?? 0
    cur.calls += 1
    byDay.set(u.day, cur)
  }

  const byModelMap = new Map()
  for (const u of monthRows) byModelMap.set(u.model, (byModelMap.get(u.model) ?? 0) + (u.tokens ?? 0))
  const total = [...byModelMap.values()].reduce((s, v) => s + v, 0) || 1

  return {
    day,
    month,
    monthTokens: tokens,
    monthCost: Number(cost.toFixed(3)),
    avgLatency: latency,
    successRate: monthRows.length ? Number(((ok / monthRows.length) * 100).toFixed(1)) : 100,
    budget: env.ai.monthlyTokenBudget,
    dailyQuota: env.ai.dailyQuota,
    daily: [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-14)
      .map(([date, v]) => ({ date, ...v, cost: Number(v.cost.toFixed(2)) })),
    byModel: [...byModelMap.entries()].map(([label, value]) => ({ label, value: Math.round((value / total) * 100) })),
    recent: data.usage.slice(0, 20),
  }
}

export function priceOf(tokens) {
  return Number(((tokens / 1000) * env.ai.pricePer1k).toFixed(4))
}
