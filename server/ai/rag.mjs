/**
 * 站内 RAG（fx.md A-03 / 5.2）。
 *
 * 零依赖实现：结构化切块（Section → Sub → 段落）→ BM25 检索 → 引用。
 * 生产环境把 bm25 换成 pgvector + tsvector 混合检索 + RRF + rerank；
 * 这里的接口（chunk / retrieve / verifyReferences）保持不变，页面与评测无需改动。
 */

const CJK = /[\u4e00-\u9fa5]/u

export function estimateTokens(text) {
  const cjk = (text.match(/[\u4e00-\u9fa5]/gu) ?? []).length
  const rest = text.length - cjk
  return Math.ceil(cjk * 0.9 + rest / 4)
}

/** 中文用 unigram + bigram，英文用词；这样「RAG切片」与「RAG 切片」同分 */
export function tokenize(text) {
  const lower = (text ?? '').toLowerCase()
  const latin = lower.match(/[a-z0-9_]+/g) ?? []
  const chars = [...lower].filter((c) => CJK.test(c))
  const bigrams = []
  for (let i = 0; i < chars.length - 1; i += 1) bigrams.push(chars[i] + chars[i + 1])
  return [...latin, ...chars, ...bigrams]
}

const blockText = (block) => {
  if (!block || typeof block !== 'object') return ''
  switch (block.t) {
    case 'p':
    case 'quote':
      return block.v ?? ''
    case 'code':
      return `${block.lang ?? ''} ${block.v ?? ''}`
    case 'list':
      return (block.items ?? []).join('\n')
    case 'note':
      return `${block.title ?? ''} ${block.v ?? ''}`
    case 'table':
      return [block.head ?? [], ...(block.rows ?? [])].map((r) => r.join(' | ')).join('\n')
    default:
      return ''
  }
}

/** 按 Section → Sub 切块，块不跨小节；超长时按段落再切一刀 */
export function chunkArticle(article) {
  const chunks = []
  const push = (section, sub, text, index) => {
    const body = text.trim()
    if (!body) return
    const id = `${article.id}#${section.id}${sub ? `-${sub.id}` : ''}-${index}`
    chunks.push({
      id,
      docId: article.id,
      articleId: article.id,
      articleTitle: article.title,
      sectionId: section.id,
      sectionTitle: section.title,
      subId: sub?.id ?? section.id,
      subTitle: sub?.title ?? section.title,
      path: `/learn/${article.id}#${sub?.id ?? section.id}`,
      text: body,
      tokens: estimateTokens(body),
      effectiveAt: article.date ?? null,
    })
  }

  for (const section of article.sections ?? []) {
    const own = [section.title, section.lead ?? ''].filter(Boolean).join('。')
    let buf = own
    let i = 0
    const flush = () => {
      if (buf.trim()) push(section, null, buf, i++)
      buf = own
    }
    for (const sub of section.subs ?? []) {
      const subText = [sub.title, ...(sub.blocks ?? []).map(blockText)].filter(Boolean).join('\n')
      const combined = buf ? `${buf}\n${subText}` : subText
      if (estimateTokens(combined) > 420 && buf) flush()
      buf = `${buf}\n${subText}`
      if (estimateTokens(buf) > 420) {
        push(section, sub, buf, i++)
        buf = sub.title
      }
    }
    if (buf.trim()) push(section, null, buf, i++)
  }
  return chunks
}

export function buildIndex(articles) {
  const chunks = (articles ?? []).flatMap(chunkArticle)
  const docs = chunks.map((c) => tokenize(`${c.articleTitle} ${c.sectionTitle} ${c.subTitle} ${c.text}`))
  const df = new Map()
  for (const tokens of docs) {
    for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1)
  }
  const avgdl = docs.reduce((s, d) => s + d.length, 0) / Math.max(docs.length, 1)
  return { chunks, docs, df, avgdl, builtAt: new Date().toISOString() }
}

const K1 = 1.5
const B = 0.75

export function search(index, query, topK = 5) {
  const qTokens = [...new Set(tokenize(query))]
  if (!qTokens.length) return []
  const N = index.chunks.length
  const scored = index.docs.map((tokens, i) => {
    const tf = new Map()
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
    let score = 0
    for (const q of qTokens) {
      const f = tf.get(q) ?? 0
      if (!f) continue
      const n = index.df.get(q) ?? 0
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
      score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + B * (tokens.length / (index.avgdl || 1)))))
    }
    return { i, score }
  })
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => ({ ...index.chunks[x.i], score: Number(x.score.toFixed(3)), source: 'bm25' }))
}

/**
 * 阅读位置优先 + 标题重排 + 去重（AI-12）：
 * 1) 命中当前文章/小节的块加权；
 * 2) 与问题在标题/小节名有词面重叠的块再提一档（轻量 rerank，不依赖向量库）；
 * 3) 同一 path 只保留得分最高的一条，避免引用重复。
 */
export function retrieve(index, { message, context, topK = 5 }) {
  const hits = search(index, message, topK + 6)
  const q = new Set(tokenize(message))
  const articleId = typeof context === 'string' ? null : context?.articleId
  const sectionId = typeof context === 'string' ? null : context?.sectionId
  const boosted = hits.map((h) => {
    const titleTokens = new Set(tokenize(`${h.articleTitle} ${h.sectionTitle} ${h.subTitle}`))
    let overlap = 0
    for (const t of q) if (titleTokens.has(t)) overlap += 1
    const positionBoost = (articleId && h.articleId === articleId ? 2 : 0) + (sectionId && h.sectionId === sectionId ? 1.5 : 0)
    return { ...h, score: h.score + positionBoost + Math.min(overlap, 6) * 0.35 }
  })
  const deduped = new Map()
  for (const h of boosted.sort((a, b) => b.score - a.score)) {
    if (!deduped.has(h.path)) deduped.set(h.path, h)
  }
  return [...deduped.values()].slice(0, topK)
}

/** 引用校验（A-04）：模型给的 path 必须能对上真实 chunk，否则丢弃 */
export function verifyReferences(index, references, minCoverage = 0.6) {
  const byPath = new Map(index.chunks.map((c) => [c.path, c]))
  const valid = []
  for (const ref of references ?? []) {
    const hit = byPath.get(ref.path) ?? index.chunks.find((c) => c.docId === ref.docId && c.sectionTitle === ref.section)
    if (hit) valid.push({ docId: hit.docId, section: hit.subTitle, path: hit.path, snippet: hit.text.slice(0, 80) })
  }
  const coverage = references?.length ? valid.length / references.length : 0
  return { references: valid, coverage, passed: coverage >= minCoverage }
}

/** 无模型时的抽取式回答：只拼接检索到的原文，不做生成，天然不编造 */
export function extractiveAnswer(hits) {
  if (!hits.length) {
    return {
      text: '站内没有找到直接依据。可以换一个更具体的问法，或者看看「学习手记」里的文章目录。',
      references: [],
    }
  }
  const top = hits.slice(0, 3)
  const body = top
    .map((h, i) => `【${i + 1}】${h.articleTitle} · ${h.sectionTitle}\n${trim(h.text, 220)}`)
    .join('\n\n')
  return {
    text: `以下内容摘自站内文章（未接模型，只做检索摘录）：\n\n${body}\n\n需要完整上下文可以点开下面的引用。`,
    references: top.map((h) => ({ docId: h.docId, section: h.subTitle, path: h.path, snippet: trim(h.text, 80) })),
  }
}

function trim(text, n) {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

export { trim }
