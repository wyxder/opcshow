/**
 * AI 助手的服务层（fx.md AI1 / AI2 / AI9 / AI10）。
 *
 * 降级链是这里的核心：
 *   配了 VITE_API_BASE → 走自建网关 /api/ai/chat（服务端代理模型，前端零密钥，AI1）
 *   请求失败 / 超时 / 未配置 → 自动落回「预置问答」（AI10），站点照常可用、不白屏
 * 每次回答都带 source，UI 用它区分「实时模型」与「预置问答」，不冒充模型能力。
 */
import { apiUrl, serverConfig } from './config'
import { apiJsonSafe } from './http'
import { articleMeta } from '@/data/articles.index'

export type ChatRole = 'user' | 'assistant'
/** retrieval = 服务端没接模型、用站内检索摘录作答（不冒充模型） */
export type AnswerSource = 'model' | 'retrieval' | 'preset'

/** AI3：答案引用。RAG 接通后由服务端返回，前端渲染成可点锚点 */
export type ChatReference = { docId: string; section: string; path: string; snippet?: string }

export type ChatRequest = {
  input: string
  /** AI4：当前阅读位置的文本描述（进 system prompt） */
  context?: string
  /** AI-02：结构化上下文，服务端据此做文章/小节加权 */
  contextData?: { articleId?: string; articleTitle?: string; sectionId?: string; sectionTitle?: string }
  /** 当前文章 id：服务端检索时给同一篇的块加权 */
  contextId?: string
  history: { role: ChatRole; content: string }[]
}

export type ChatHandlers = {
  onDelta: (text: string, meta?: { source: AnswerSource }) => void
  onDone: (result: { source: AnswerSource; references: ChatReference[]; degraded: boolean }) => void
  /** 真实模型不可用（网络 / 超时 / 5xx）。适配层自己不外抛异常，避免未捕获 rejection */
  onError?: (err: unknown) => void
}

export type CancelFn = () => void

export interface AiChatProvider {
  id: string
  /** UI 上如实标注的能力名 */
  label: string
  chat: (req: ChatRequest, handlers: ChatHandlers) => CancelFn
}

/* --------------------------- 预置问答（离线兜底） -------------------------- */

export type PresetAnswer = { keys: string[]; text: string; references?: ChatReference[] }

export const quickPrompts = ['推荐我先读哪篇？', 'RAG 切片怎么定？', '22 个指标怎么选？', '帮我看下简历亮点']

const docRef = (id: string, section: string): ChatReference => {
  const doc = articleMeta.find((a) => a.id === id)
  return { docId: id, section, path: `/learn/${id}`, snippet: doc?.title }
}

/** 关键词命中的手写回答。保留为降级兜底（AI10），不再是「唯一实现」。 */
export const presetAnswers: PresetAnswer[] = [
  {
    keys: ['推荐', '先读', '哪篇'],
    text: '如果是第一次来，建议按这个顺序：\n\n1. 《RAG 工程化：从切片到溯源》—— 你会看到我怎么做工程判断，而不是堆名词。\n2. 《Agent 评测别玄学》—— 解释我怎么把「感觉变好」变成可验收的指标。\n3. 《Vibe Coding 的正确姿势》—— 最轻松的一篇，讲我和模型协作的边界。\n\n每篇都有三级目录，右侧可以随时问我某一节。',
    references: [docRef('rag-engineering', '全文'), docRef('agent-eval', '全文'), docRef('vibe-coding', '全文')],
  },
  {
    keys: ['切片', '分块', 'chunk', 'RAG'],
    text: '我的默认答案：先按文档结构切，再考虑长度。\n\n· 优先级：标题层级 > 条款/列表 > 句子边界 > 字符数\n· 电商客服类 300–450 token 效果最好，法律条款可以更短\n· 每个 chunk 必须带 doc_id / page / path / effective_at 四类元数据\n· 切完立刻跑一次 Recall@5，不要等接上模型再调\n\n一句话：分块是业务语义题，不是长度数学题。',
    references: [docRef('rag-engineering', '01 切片')],
  },
  {
    keys: ['指标', '评测', 'judge', '22'],
    text: '22 个指标不用都上。我通常先分三层：\n\n· 检索层：HitRate@K / MRR —— 有没有找对材料\n· 生成层：Faithfulness / 术语一致性 —— 有没有用对材料\n· 行为层：Task Completion / Tool Correctness —— 任务有没有完成\n\n原则是「能算出来的不交给模型判断」。确定性指标零成本、不漂移，是回归测试的地基。',
    references: [docRef('agent-eval', '指标分层')],
  },
  {
    keys: ['简历', '亮点', '实习', '招聘'],
    text: '如果用一句话概括我的简历：\n\n「能把 Agent 从 Demo 做到付费上线，并且用评测证明它变好了。」\n\n证据有三条：字节电商 RAG 客服 Recall@5 0.72→0.93；评测中台 22 指标 + 42 用例；带货视频平台上线收益 1.2w。\n\n需要完整版可以看「工作 → 简历」，或者直接邮件 wyxcode@qq.com。',
  },
  {
    keys: ['项目', '作品', '经历'],
    text: '7 个项目里，我最想聊这三个：\n\n1. 跨境电商 AIGC 带货视频平台 —— 唯一跑通付费闭环的，收益 1.2w，星火 OPC 国赛一等奖。\n2. 抖音电商 RAG 客服 —— 第一次把检索命中率做到 92%，并且真的降低了 45% 人工接待。\n3. Agent 与 RSI 评测中台 —— 最「反直觉」的一个，让评测反向修改系统。\n\n首页的轮播卡片可以点开看每个项目的细节。',
  },
]

export const presetFallback =
  '这个问题有点具体，我可能得看着代码回答。\n\n你可以试试问我：RAG 切片、评测指标、项目细节，或者简历亮点。也可以直接发邮件给 wyxcode@qq.com，我通常 12 小时内回。'

function matchPreset(input: string): PresetAnswer {
  const lower = input.toLowerCase()
  return presetAnswers.find((a) => a.keys.some((k) => lower.includes(k.toLowerCase()))) ?? { keys: [], text: presetFallback }
}

/**
 * 预置问答 provider。逐字吐字的节奏保持和真流式一致，
 * 这样以后切到模型 provider 时视觉不用重做（AI2）。
 */
export const presetProvider: AiChatProvider = {
  id: 'preset',
  label: '预置问答',
  chat({ input }, { onDelta, onDone }) {
    const found = matchPreset(input)
    const timers: number[] = []
    let i = 0
    const lead = window.setTimeout(() => {
      const step = Math.max(1, Math.round(found.text.length / 90))
      const ticker = window.setInterval(() => {
        i += step
        onDelta(found.text.slice(0, i), { source: 'preset' })
        if (i >= found.text.length) {
          window.clearInterval(ticker)
          onDone({ source: 'preset', references: found.references ?? [], degraded: false })
        }
      }, 18)
      timers.push(ticker)
    }, 700)
    timers.push(lead)
    return () => timers.forEach((t) => { window.clearTimeout(t); window.clearInterval(t) })
  },
}

/* ------------------------- 自建网关 provider（AI1） ------------------------ */

/**
 * SSE 消费：服务端返回 `data: {"delta":"…"}` / `{"done":true,...}` / `{"error":...}`。
 * A-02：首 token 8s 超时、断流重试 1 次、error 事件、AbortController 贯穿停止/关闭。
 */
const FIRST_TOKEN_MS = 8000
const SESSION_KEY = 'wyx:ai-session'

/** AI-07 / FE-10：会话 id 由前端保存，刷新后可拉回历史 */
export function readSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function saveSessionId(id: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, id)
  } catch {
    /* 隐私模式忽略 */
  }
}

export function clearSessionId() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

/** 服务端返回的历史会话（只取展示需要的字段） */
export async function loadRemoteSession(): Promise<{ role: ChatRole; text: string; source?: AnswerSource; references?: ChatReference[] }[]> {
  const id = readSessionId()
  if (!id || !serverConfig.enabled) return []
  const data = await apiJsonSafe<{ messages?: { role: string; text: string; source?: AnswerSource; references?: ChatReference[] }[] }>(`/api/ai/sessions/${encodeURIComponent(id)}`)
  if (!data?.messages?.length) return []
  return data.messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', text: m.text, source: m.source, references: m.references }))
}

/** FE-08：三态能力探测：model / retrieval / preset */
export type AiMode = 'model' | 'retrieval' | 'preset'

export async function probeAiMode(): Promise<AiMode> {
  if (!serverConfig.enabled) return 'preset'
  const health = await apiJsonSafe<{ mode?: string }>('/api/ai/health')
  return health?.mode === 'model' ? 'model' : 'retrieval'
}

export const remoteProvider: AiChatProvider = {
  id: 'remote',
  label: '实时模型',
  chat({ input, context, contextData, contextId, history }, { onDelta, onDone, onError }) {
    const ac = new AbortController()
    let cancelled = false
    let finished = false
    let retried = false
    let reported = false
    let firstTokenTimer: number | undefined

    const reportError = (err: unknown) => {
      if (reported || finished || cancelled) return
      reported = true
      onError?.(err)
    }

    const clearFirstToken = () => {
      if (firstTokenTimer) window.clearTimeout(firstTokenTimer)
      firstTokenTimer = undefined
    }

    const attempt = async () => {
      const res = await fetch(apiUrl(serverConfig.aiChatPath), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: ac.signal,
        body: JSON.stringify({
          message: input,
          // AI-02：结构化上下文优先，服务端可据此给当前小节加权
          context: contextData ?? context ?? null,
          articleId: contextId ?? null,
          sessionId: readSessionId(),
          history: history.slice(-8),
          stream: true,
        }),
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      firstTokenTimer = window.setTimeout(() => {
        if (finished || cancelled) return
        ac.abort()
        reportError(new Error('首 token 超时'))
      }, FIRST_TOKEN_MS)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let text = ''
      let references: ChatReference[] = []
      let source: AnswerSource = 'model'
      let degraded = false
      let sawDone = false

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (!payload || payload === '[DONE]') continue
          let obj: { delta?: string; done?: boolean; error?: string; reset?: boolean; source?: AnswerSource; references?: ChatReference[]; degraded?: boolean; sessionId?: string }
          try {
            obj = JSON.parse(payload)
          } catch {
            continue // 半包：等下一个 chunk
          }
          if (obj.error) throw new Error(obj.error)
          // AI-11：服务端重试时先清空已渲染内容
          if (obj.reset) {
            text = ''
            onDelta('', { source: 'model' })
          }
          if (obj.delta) {
            clearFirstToken()
            text += obj.delta
            onDelta(text, { source: obj.source ?? 'model' })
          }
          if (obj.sessionId) saveSessionId(obj.sessionId)
          if (obj.references?.length) references = obj.references
          if (obj.source) source = obj.source
          if (typeof obj.degraded === 'boolean') degraded = obj.degraded
          if (obj.done) sawDone = true
        }
      }

      clearFirstToken()
      if (sawDone) return { source, references, degraded }
      // 断流：没收到 done 事件。有内容就按断流重试一次，没内容直接报错
      if (!text) throw new Error('连接中断，未收到内容')
      if (!retried) {
        retried = true
        return attempt()
      }
      return { source, references, degraded }
    }

    void (async () => {
      try {
        const result = await attempt()
        if (cancelled) return
        finished = true
        onDone(result)
      } catch (err) {
        clearFirstToken()
        if (cancelled || finished) return
        reportError(err)
      }
    })()

    return () => {
      cancelled = true
      clearFirstToken()
      ac.abort()
    }
  },
}

/* ------------------------------ 降级编排（AI10） ---------------------------- */

export type AskResult = { source: AnswerSource; degraded: boolean }

/**
 * 对外的唯一入口：先试真实模型，任何失败都静默落回预置问答（AI10）。
 * 返回取消函数给组件做卸载清理。
 */
export function askSite(req: ChatRequest, handlers: ChatHandlers): CancelFn {
  if (!serverConfig.enabled) return presetProvider.chat(req, handlers)

  let cancelled = false
  let cancelFallback: CancelFn | null = null

  const degrade = () => {
    if (cancelled) return
    cancelFallback = presetProvider.chat(req, {
      onDelta: (text, meta) => handlers.onDelta(text, meta),
      onDone: (result) => handlers.onDone({ ...result, source: 'preset', degraded: true }),
    })
  }

  let finished = false
  const cancelRemote = remoteProvider.chat(req, {
    onDelta: handlers.onDelta,
    onDone: (result) => {
      if (cancelled) return
      finished = true
      handlers.onDone(result)
    },
    onError: () => {
      if (cancelled || finished) return
      degrade()
    },
  })

  return () => {
    cancelled = true
    try {
      cancelRemote()
    } catch {
      /* ignore */
    }
    cancelFallback?.()
  }
}

/** 会话标题：埋点与用量统计（AI7）用得到，先给一个稳定实现 */
export const chatTopic = (input: string) => input.slice(0, 24)
