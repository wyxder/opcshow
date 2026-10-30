import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Bot, Loader2, Minus, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Msg = { id: number; role: 'user' | 'bot'; text: string }

const quickPrompts = ['推荐我先读哪篇？', 'RAG 切片怎么定？', '22 个指标怎么选？', '帮我看下简历亮点']

const answers: { keys: string[]; text: string }[] = [
  {
    keys: ['推荐', '先读', '哪篇'],
    text: '如果是第一次来，建议按这个顺序：\n\n1. 《RAG 工程化：从切片到溯源》—— 你会看到我怎么做工程判断，而不是堆名词。\n2. 《Agent 评测别玄学》—— 解释我怎么把「感觉变好」变成可验收的指标。\n3. 《Vibe Coding 的正确姿势》—— 最轻松的一篇，讲我和模型协作的边界。\n\n每篇都有三级目录，右侧可以随时问我某一节。',
  },
  {
    keys: ['切片', '分块', 'chunk', 'RAG'],
    text: '我的默认答案：先按文档结构切，再考虑长度。\n\n· 优先级：标题层级 > 条款/列表 > 句子边界 > 字符数\n· 电商客服类 300–450 token 效果最好，法律条款可以更短\n· 每个 chunk 必须带 doc_id / page / path / effective_at 四类元数据\n· 切完立刻跑一次 Recall@5，不要等接上模型再调\n\n一句话：分块是业务语义题，不是长度数学题。',
  },
  {
    keys: ['指标', '评测', 'judge', '22'],
    text: '22 个指标不用都上。我通常先分三层：\n\n· 检索层：HitRate@K / MRR —— 有没有找对材料\n· 生成层：Faithfulness / 术语一致性 —— 有没有用对材料\n· 行为层：Task Completion / Tool Correctness —— 任务有没有完成\n\n原则是「能算出来的不交给模型判断」。确定性指标零成本、不漂移，是回归测试的地基。',
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

const fallback =
  '这个问题有点具体，我可能得看着代码回答。\n\n你可以试试问我：RAG 切片、评测指标、项目细节，或者简历亮点。也可以直接发邮件给 wyxcode@qq.com，我通常 12 小时内回。'

export function AIAssistant({ defaultOpen = false, context }: { defaultOpen?: boolean; context?: string }) {
  const [open, setOpen] = useState(defaultOpen)
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: 1,
      role: 'bot',
      text: '你好，我是这个站的 AI 助手（当然是假的，回答都是手写的）。\n\n可以问我 RAG、Agent 评测、项目细节，或者让我推荐先读哪篇。',
    },
  ])
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])

  useEffect(() => {
    if (defaultOpen) setOpen(true)
  }, [defaultOpen])

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-assistant', handler)
    return () => window.removeEventListener('open-assistant', handler)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing, open])

  useEffect(() => () => timers.current.forEach((t) => window.clearInterval(t)), [])

  const reply = (input: string) => {
    const found = answers.find((a) => a.keys.some((k) => input.toLowerCase().includes(k.toLowerCase())))
    const text = found?.text ?? fallback
    setTyping(true)
    const delay = window.setTimeout(() => {
      setTyping(false)
      const id = Date.now()
      setMsgs((m) => [...m, { id, role: 'bot', text: '' }])
      let i = 0
      const step = Math.max(1, Math.round(text.length / 90))
      const timer = window.setInterval(() => {
        i += step
        setMsgs((m) => m.map((msg) => (msg.id === id ? { ...msg, text: text.slice(0, i) } : msg)))
        if (i >= text.length) window.clearInterval(timer)
      }, 18)
      timers.current.push(timer)
    }, 700)
    timers.current.push(delay)
  }

  const send = (value?: string) => {
    const text = (value ?? draft).trim()
    if (!text || typing) return
    setMsgs((m) => [...m, { id: Date.now(), role: 'user', text }])
    setDraft('')
    reply(text)
  }

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="group fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 rounded-full border-1.5 border-ink bg-lime px-4 py-3 shadow-hard transition hover:-translate-y-0.5"
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full border-1.5 border-ink bg-ink text-lime">
              <Bot size={15} />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-ink bg-coral" />
            </span>
            <span className="text-[12.5px] font-semibold">问问 AI 助手</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed bottom-4 right-4 z-[65] flex h-[min(560px,78vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[22px] border-1.5 border-ink bg-cream shadow-hard-lg"
          >
            <div className="flex items-center justify-between gap-2 border-b-1.5 border-ink bg-ink px-3.5 py-2.5 text-paper">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-lime/60 bg-lime/15 text-lime">
                  <Sparkles size={14} />
                </span>
                <div className="leading-tight">
                  <p className="text-[12px] font-semibold">云潇的 AI 助手</p>
                  <p className="font-mono text-[9.5px] tracking-[0.14em] text-paper/40">FAKE BUT HELPFUL</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full text-paper/60 hover:bg-paper/10 hover:text-paper" aria-label="最小化">
                  <Minus size={14} />
                </button>
                <button onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full text-paper/60 hover:bg-paper/10 hover:text-paper" aria-label="关闭">
                  <X size={14} />
                </button>
              </div>
            </div>

            {context && (
              <div className="border-b border-ink/10 bg-lime/25 px-3.5 py-1.5 font-mono text-[9px] tracking-wide text-ink/55">
                正在阅读：{context}
              </div>
            )}

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3.5 no-scrollbar">
              {msgs.map((m) => (
                <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[86%] whitespace-pre-line rounded-2xl px-3 py-2 text-[12px] leading-relaxed',
                      m.role === 'user'
                        ? 'rounded-br-md border-1.5 border-ink bg-lime text-ink'
                        : 'rounded-bl-md border border-ink/12 bg-paper text-ink/80',
                    )}
                  >
                    {m.text}
                    {m.role === 'bot' && m.text === '' && <span className="animate-blink">▍</span>}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex items-center gap-2 text-[11px] text-ink/40">
                  <Loader2 size={12} className="animate-spin" /> 正在翻我的笔记…
                </div>
              )}
            </div>

            <div className="border-t border-ink/10 px-3 pb-3 pt-2">
              <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
                {quickPrompts.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="shrink-0 rounded-full border border-ink/20 bg-paper px-2.5 py-1 text-[10px] text-ink/60 transition hover:border-ink hover:bg-lime/40 hover:text-ink"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2 rounded-xl border-1.5 border-ink/20 bg-paper p-1.5 focus-within:border-ink">
                <textarea
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  placeholder="问点什么…（Enter 发送）"
                  className="max-h-24 flex-1 resize-none bg-transparent px-1.5 py-1 text-[12px] outline-none placeholder:text-ink/35"
                />
                <button
                  onClick={() => send()}
                  disabled={!draft.trim() || typing}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-1.5 border-ink bg-ink text-paper transition disabled:opacity-30"
                  aria-label="发送"
                >
                  <ArrowUp size={14} />
                </button>
              </div>
              <p className="mt-1.5 text-center font-mono text-[9.5px] tracking-wide text-ink/30">本地模拟 · 无真实模型调用</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
