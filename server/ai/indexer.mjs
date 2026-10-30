/**
 * 内容索引（fx.md A-03）：从持久化的文章数据构建 BM25 索引。
 * 内容写入 / 状态变更后调用 invalidate()，下一次请求重建（增量重建 < 1 分钟）。
 */
import { getStores } from '../lib/store.mjs'
import { buildIndex } from './rag.mjs'

let current = null
let building = false

export async function getIndex() {
  if (current) return current
  if (building) return current ?? { chunks: [], docs: [], df: new Map(), avgdl: 1 }
  building = true
  try {
    const { content } = await getStores()
    const data = await content.read()
    const published = (data.articles ?? []).filter((a) => a.status === 'published')
    current = { ...buildIndex(published), articles: published }
    return current
  } finally {
    building = false
  }
}

export function invalidate() {
  current = null
}

export async function stats() {
  const idx = await getIndex()
  return { chunks: idx.chunks.length, articles: idx.articles?.length ?? 0, builtAt: idx.builtAt ?? null }
}
