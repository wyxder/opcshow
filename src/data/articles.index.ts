/**
 * 文章「轻量索引」—— 只有标题/分类/日期这类元信息，不含正文（fx.md R3 / D2 / P2）。
 *
 * 存在的意义有两点：
 *   1. 分类计数从数据派生，不再手写 2/2/2（R3），导航描述也引用这里的派生值（D2）；
 *   2. ⌘K 命令面板只需要标题就能建索引，不必把 468 行正文拖进入口包，
 *      正文由 /learn 与 /learn/:id 这两条懒加载路由按需引入（P2）。
 *
 * 与 src/data/articles.ts 的一致性由 `npm run check:data` 校验。
 */

export type ArticleMeta = {
  id: string
  title: string
  subtitle: string
  category: string
  tags: string[]
  date: string
  readMin: number
  views: number
  accent: string
  abstract: string
}

export const articleMeta: ArticleMeta[] = [
  {
    id: 'rag-engineering',
    title: 'RAG 工程化：从切片到溯源的 7 个决策',
    subtitle: '把 Demo 级检索做成能上生产的知识库，靠的从来不是换个更大的模型。',
    category: 'RAG 工程化',
    tags: ['RAG', '检索', '评测'],
    date: '2026-09-18',
    readMin: 12,
    views: 4210,
    accent: 'rgb(var(--c-blue))',
    abstract: '在字节的电商客服项目里，我把 Recall@5 从 0.72 推到 0.93。真正起作用的不是换模型，而是七个工程决策：切片粒度、元数据、双路召回、融合、重排、溯源与回归评测。',
  },
  {
    id: 'agent-eval',
    title: 'Agent 评测别玄学：22 个指标怎么选',
    subtitle: '从「感觉变好了」到「pass_rate 涨了 0.07」，中间隔着一整套指标体系。',
    category: 'Agent 评测',
    tags: ['评测', 'LLM-as-a-Judge', '指标体系'],
    date: '2026-09-02',
    readMin: 10,
    views: 3180,
    accent: 'rgb(var(--c-grape))',
    abstract: '评测中台落地半年，最大的教训是：能算出来的指标不要交给模型判断。这篇把 22 个指标分成检索层、生成层、行为层，并给出每个指标的采集口径与回归用法。',
  },
  {
    id: 'harness',
    title: 'Harness：给 Agent 装上方向盘',
    subtitle: 'Agent 能力的天花板由模型决定，稳定性由 Harness 决定。',
    category: 'Agent 评测',
    tags: ['Harness', '工程', '可靠性'],
    date: '2026-08-21',
    readMin: 9,
    views: 2760,
    accent: 'rgb(var(--c-coral))',
    abstract: '工具越权、上下文漂移、无限重试，是 Agent 上线后的三大事故来源。Harness 就是把这三件事关进笼子的工程层。',
  },
  {
    id: 'rsi-loop',
    title: 'RSI 自进化：让评测反向修改系统',
    subtitle: '评测不只是打分，它可以是产品的第二套训练回路。',
    category: 'RAG 工程化',
    tags: ['RSI', '闭环', '可回滚'],
    date: '2026-08-08',
    readMin: 11,
    views: 1990,
    accent: 'rgb(var(--c-lime))',
    abstract: '把 badcase 变成改动建议，再由人工审批与回归门禁放行，RSI 闭环让 pass_rate 从 0.71 爬到 0.93，而且每一步都能回滚。',
  },
  {
    id: 'vibe-coding',
    title: 'Vibe Coding 的正确姿势：AI 编程的边界感',
    subtitle: '写得快不等于写得对。和模型协作，最重要的是知道什么时候自己上手。',
    category: '工程手记',
    tags: ['AI 编程', '工作流', 'Codex'],
    date: '2026-07-19',
    readMin: 8,
    views: 5340,
    accent: 'rgb(var(--c-sky))',
    abstract: '7 款付费产品一路用 AI 结对下来，我的分工是：需求边界与验收标准自己写，样板与测试交给模型，涉及钱和并发的逻辑自己写一遍再让模型找漏洞。',
  },
  {
    id: 'multimodal-cost',
    title: '多模态应用的 3 个「看不见」的成本',
    subtitle: '图片、语音、视频接进来，账单和体验都会变。',
    category: '工程手记',
    tags: ['多模态', '成本', '架构'],
    date: '2026-06-30',
    readMin: 7,
    views: 1620,
    accent: 'rgb(var(--c-rose))',
    abstract: '做数字人导游和带货视频平台时踩过的坑：转码、轮询、失败重试，才是多模态真正的成本中心。',
  },
]

/** 分类计数：从 articleMeta 派生（fx.md R3） */
export const articleCategoryKeys = ['RAG 工程化', 'Agent 评测', '工程手记'] as const

export function countByCategory(category: string) {
  return category === 'all' ? articleMeta.length : articleMeta.filter((a) => a.category === category).length
}

export const articleCategories = [
  { key: 'all', label: '全部', count: countByCategory('all') },
  ...articleCategoryKeys.map((k) => ({ key: k, label: k, count: countByCategory(k) })),
]

export const totalArticles = articleMeta.length

/** 导航描述里那句「N 篇」直接引用派生值，杜绝口播数字漂移（fx.md D2） */
export const ragArticleCount = countByCategory('RAG 工程化')

/** ⌘K 用的扁平标题索引 */
export const articleSearchIndex = articleMeta.map((a) => ({
  id: a.id,
  label: a.title,
  hint: a.category,
  to: `/learn/${a.id}`,
  group: '文章',
}))
