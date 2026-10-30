/**
 * 站内搜索的归一化与高亮（fx.md F-11 / A-08）。
 *
 * 只解决「查得到」这一层：大小写、全半角、空格与标点、常见同义词。
 * 数据量再大时把这里换成 MiniSearch / 向量混合检索即可，调用方不用改。
 */
import { STORAGE_KEYS, isStringArray, readStored, writeStored } from './storage'

/** 同义词 / 别名；key 与 value 都会参与匹配 */
const ALIASES: Record<string, string[]> = {
  rag: ['检索', '切片', 'chunk', '向量', '召回'],
  检索: ['rag', '搜索', '召回'],
  切片: ['chunk', '分块', 'rag'],
  分块: ['chunk', '切片'],
  评测: ['eval', '指标', '跑分'],
  指标: ['评测', 'hitrate', 'mrr'],
  agent: ['智能体', '多智能体', '工具调用'],
  智能体: ['agent', '工具调用'],
  简历: ['resume', 'cv', '求职', '工作'],
  项目: ['作品', 'project', 'case'],
  文章: ['手记', '博客', '笔记'],
  文件: ['下载', '资源', '附件'],
  留言: ['留言板', '互动', '评论'],
  旅拍: ['旅行', '照片', '摄影'],
  歌单: ['音乐', 'playlist'],
}

const STRIP = /[\s\-_·/\\,，。.、:：;；!！?？"'“”‘’()（）[\]【】<>《》]/g

export function normalize(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(STRIP, '')
}

/** 把查询拆成「归一化后的词 + 同义词」，用于多词命中计分 */
export function expandTerms(query: string): string[] {
  const base = normalize(query)
  if (!base) return []
  const out = new Set<string>([base])
  for (const [k, list] of Object.entries(ALIASES)) {
    const nk = normalize(k)
    if (base.includes(nk)) {
      out.add(nk)
      list.forEach((v) => out.add(normalize(v)))
    }
  }
  return [...out].filter(Boolean)
}

/** 命中词数；0 表示不命中。label 权重更高，所以分开算 */
export function matchScore(label: string, hint: string, query: string): number {
  const terms = expandTerms(query)
  if (!terms.length) return 0
  const l = normalize(label)
  const h = normalize(hint)
  let score = 0
  for (const t of terms) {
    if (!t) continue
    if (l.includes(t)) score += 3
    else if (h.includes(t)) score += 1
  }
  return score
}

export type HighlightPart = { text: string; hit: boolean }

/** 高亮只按原始词做字面匹配，避免归一化下标错位 */
export function highlightParts(text: string, query: string): HighlightPart[] {
  const raw = query.trim()
  if (!raw) return [{ text, hit: false }]
  const words = raw.split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length)
  const lower = text.toLowerCase()
  const ranges: [number, number][] = []
  for (const w of words) {
    const needle = w.normalize('NFKC').toLowerCase()
    let from = 0
    for (;;) {
      const at = lower.indexOf(needle, from)
      if (at === -1) break
      ranges.push([at, at + needle.length])
      from = at + needle.length
    }
  }
  if (!ranges.length) return [{ text, hit: false }]
  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([...r])
  }
  const parts: HighlightPart[] = []
  let cursor = 0
  for (const [start, end] of merged) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), hit: false })
    parts.push({ text: text.slice(start, end), hit: true })
    cursor = end
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false })
  return parts
}

/* ------------------------------ 最近搜索（F-11） ----------------------------- */

const MAX_RECENT = 6

export function readRecentSearches(): string[] {
  return readStored<string[]>(STORAGE_KEYS.recentSearch, [], isStringArray)
}

export function pushRecentSearch(query: string): string[] {
  const q = query.trim()
  if (!q) return readRecentSearches()
  const next = [q, ...readRecentSearches().filter((x) => x !== q)].slice(0, MAX_RECENT)
  writeStored(STORAGE_KEYS.recentSearch, next)
  return next
}
