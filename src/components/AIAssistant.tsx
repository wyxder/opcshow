import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, ExternalLink, Loader2, Minus, RotateCcw, Square, X } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useFocusTrap } from '@/lib/a11y'
import { cn, newId, usePrefersReducedMotion } from '@/lib/utils'
import { describeContext, getAssistantContextSnapshot, subscribeAssistantContext } from '@/lib/assistant'
import { askSite, clearSessionId, loadRemoteSession, probeAiMode, quickPrompts, type AiMode, type AnswerSource, type ChatReference } from '@/services/ai'
import { serverConfig } from '@/services/config'

/** 「正在阅读」上下文：由页面通过 setAssistantContext() 写入 */
function useAssistantContext() {
  return useSyncExternalStore(subscribeAssistantContext, getAssistantContextSnapshot, () => getAssistantContextSnapshot())
}

type Msg = {
  id: string
  role: 'user' | 'bot'
  text: string
  source?: AnswerSource
  references?: ChatReference[]
  degraded?: boolean
  /** FE-14：用户主动停止/关闭时保留已生成内容并标注 */
  stopped?: boolean
  /** 本会话内流式生成的回答才打打字机；问候语与历史恢复直接显示 */
  streamed?: boolean
}

const sourceLabel = (source: AnswerSource, degraded?: boolean) => {
  if (source === 'model') return degraded ? '模型生成（引用未校验通过，可能不准确）' : '模型生成，可能不准确'
  if (source === 'retrieval') return '站内检索摘录 · 未接模型'
  return '预置问答 · 作者手写'
}

/** AI 分身的头像：回复气泡、浮标、面板头部共用 */
const AVATAR_SRC = '/image/toux.jpg'

function BotAvatar({ className }: { className?: string }) {
  return (
    <img
      src={AVATAR_SRC}
      alt="晓叶的 AI 分身头像"
      width={28}
      height={28}
      loading="lazy"
      className={cn('shrink-0 rounded-full border-1.5 border-ink object-cover', className)}
    />
  )
}

/**
 * 打字机效果：服务端流式每推一段，这里用定时器把目标文本逐字“吐”出来，
 * 视觉上比直接渲染 delta 更连贯亲切；reduce 偏好或一次性到达的完整文本则直接显示。
 */
function useTypewriter(target: string, animate: boolean) {
  const [shown, setShown] = useState(animate ? '' : target)
  const targetRef = useRef(target)
  targetRef.current = target

  useEffect(() => {
    if (!animate) {
      setShown(target)
      return
    }
    setShown((cur) => (target.startsWith(cur) ? cur : ''))
    let timer = 0
    const tick = () => {
      setShown((cur) => {
        const full = targetRef.current
        if (cur.length >= full.length) return cur
        const next = full.slice(0, cur.length + 2)
        if (next.length < full.length) timer = window.setTimeout(tick, 22)
        return next
      })
    }
    timer = window.setTimeout(tick, 60)
    return () => window.clearTimeout(timer)
  }, [animate])

  return shown
}

/** 机器人回复气泡：左侧分身头像 + 打字机流式文本 */
function BotBubble({
  msg,
  animate,
  typing,
  isLast,
}: {
  msg: Msg
  animate: boolean
  typing: boolean
  isLast: boolean
}) {
  const shown = useTypewriter(msg.text, animate)
  const stillTyping = animate && shown.length < msg.text.length
  return (
    <div className="flex items-end gap-2">
      <BotAvatar className="h-7 w-7 shadow-hard-sm" />
      <div className="max-w-[86%] whitespace-pre-line rounded-2xl rounded-bl-md border border-ink/12 bg-paper px-3 py-2 text-[12px] leading-relaxed text-ink/80">
        {shown}
        {(stillTyping || (typing && isLast && shown === '')) && <span className="animate-blink">▍</span>}
        {msg.role === 'bot' && !animate && msg.text === '' && <span className="animate-blink">▍</span>}
        {msg.stopped && (
          <span className="ml-1 font-mono text-[9px] text-coral">已停止 · 可重试</span>
        )}
        {msg.text !== '' && !(animate && stillTyping) && msg.source && (
          <span className="mt-1.5 flex items-center gap-1 border-t border-dashed border-ink/10 pt-1 font-mono text-[9px] text-ink/35">
            {sourceLabel(msg.source, msg.degraded)}
          </span>
        )}
        {/* AI3：引用锚点。RAG 接通后服务端返回 references，这里直接渲染 */}
        {!!msg.references?.length && !animate && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {msg.references.map((r) => (
              <Link
                key={`${r.docId}-${r.section}`}
                to={r.path}
                className="flex items-center gap-1 rounded border border-ink/15 bg-cream px-1.5 py-0.5 font-mono text-[9px] text-ink/55 transition hover:border-ink hover:text-ink"
                title={r.snippet ?? r.section}
              >
                <ExternalLink size={8} /> {r.section}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const greeting = (mode: AiMode): Msg => ({
  id: newId('greet'),
  role: 'bot',
  source: mode === 'preset' ? 'preset' : mode === 'retrieval' ? 'retrieval' : 'model',
  text:
    mode === 'model'
      ? '嗨，我是晓叶的 AI 分身呀 👋 回答来自服务端代理的模型（密钥不在浏览器里）。\n\n可以问我 RAG、Agent 评测、项目细节，或者让我推荐先读哪篇，都在行～'
      : mode === 'retrieval'
        ? '嗨，我是晓叶的 AI 分身 👋 服务端当前没有配置模型，回答会从站内文章里帮你检索摘录（带引用、不编造）。\n\n可以问我 RAG、Agent 评测、项目细节～'
        : '嗨，我是晓叶的 AI 分身 👋 当前没有接入模型服务，回答来自作者手写的预置问答（离线可用）。\n\n可以问我 RAG、Agent 评测、项目细节，或者让我推荐先读哪篇～',
})

export function AIAssistant({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const reduce = usePrefersReducedMotion()
  const context = useAssistantContext()
  const contextText = describeContext(context)
  const [mode, setMode] = useState<AiMode>(serverConfig.enabled ? 'retrieval' : 'preset')
  const [msgs, setMsgs] = useState<Msg[]>([greeting(serverConfig.enabled ? 'retrieval' : 'preset')])
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [lastSource, setLastSource] = useState<AnswerSource>(serverConfig.enabled ? 'retrieval' : 'preset')
  const [degraded, setDegraded] = useState(false)
  const [lastAsk, setLastAsk] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<null | (() => void)>(null)

  useFocusTrap(open, panelRef)

  useEffect(() => {
    if (defaultOpen) setOpen(true)
  }, [defaultOpen])

  // FE-08：打开面板时探测服务端真实能力（model / retrieval / preset）
  useEffect(() => {
    let alive = true
    probeAiMode().then((m) => {
      if (!alive) return
      setMode(m)
      setMsgs((list) => (list.length === 1 && list[0].role === 'bot' ? [greeting(m)] : list))
    })
    return () => {
      alive = false
    }
  }, [open])

  // FE-10：同会话刷新后恢复历史
  useEffect(() => {
    if (!open || !serverConfig.enabled) return
    let alive = true
    loadRemoteSession().then((history) => {
      if (!alive || !history.length) return
      const restored = history.map((m) => ({
        id: newId(m.role === 'assistant' ? 'bot' : 'user'),
        role: m.role === 'assistant' ? ('bot' as const) : ('user' as const),
        text: m.text,
        source: m.source,
        references: m.references,
      }))
      // 只有「刚打开且还没聊」时才用服务端历史覆盖，避免冲掉正在进行的对话
      setMsgs((list) => (list.length > 1 ? list : restored))
    })
    return () => {
      alive = false
    }
  }, [open])

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-assistant', handler)
    return () => window.removeEventListener('open-assistant', handler)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing, open])

  // F-03：关闭 / Esc / 卸载都终止进行中的流，避免残留 token 与定时器
  const stop = () => {
    const wasTyping = typing
    cancelRef.current?.()
    cancelRef.current = null
    setTyping(false)
    // FE-14：保留已生成内容，并明确标注「已停止」
    if (wasTyping) setMsgs((list) => list.map((m, i) => (i === list.length - 1 && m.role === 'bot' ? { ...m, stopped: true } : m)))
  }

  const reset = () => {
    stop()
    clearSessionId()
    setMsgs([greeting(mode)])
    setLastSource(mode === 'preset' ? 'preset' : mode === 'retrieval' ? 'retrieval' : 'model')
    setDegraded(false)
    setFailed(false)
  }

  const close = () => {
    stop()
    setOpen(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => () => cancelRef.current?.(), [])

  const reply = (input: string) => {
    const id = newId('bot')
    setTyping(true)
    setFailed(false)
    setLastAsk(input)
    setMsgs((m) => [...m, { id, role: 'bot', text: '', streamed: true }])

    cancelRef.current = askSite(
      {
        input,
        context: contextText,
        contextData: context,
        contextId: context.articleId,
        history: msgs.map((m) => ({ role: m.role === 'bot' ? ('assistant' as const) : ('user' as const), content: m.text })),
      },
      {
        onDelta: (text, meta) => {
          setTyping(false)
          setMsgs((m) => m.map((msg) => (msg.id === id ? { ...msg, text, source: meta?.source ?? msg.source } : msg)))
        },
        onDone: ({ source, references, degraded: degradedResult }) => {
          setTyping(false)
          setLastSource(source)
          setDegraded(Boolean(degradedResult))
          setMsgs((m) => m.map((msg) => (msg.id === id ? { ...msg, source, references, degraded: degradedResult } : msg)))
        },
        onError: () => {
          setTyping(false)
          setFailed(true)
          setMsgs((m) => m.filter((msg) => msg.id !== id))
        },
      },
    )
  }

  const send = (value?: string) => {
    const text = (value ?? draft).trim()
    if (!text || typing) return
    setMsgs((m) => [...m, { id: newId('user'), role: 'user', text }])
    setDraft('')
    reply(text)
  }

  const retry = () => {
    if (!lastAsk || typing) return
    const idx = msgs.map((m) => m.role).lastIndexOf('user')
    if (idx === -1) return
    setMsgs((m) => m.slice(0, idx + 1))
    reply(lastAsk)
  }

  return (
    <>
      {/* 单一 AnimatePresence + mode="wait"：浮标完全退场后面板才入场，一次点击只播一次入场动画，不会重叠闪现 */}
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="assistant-fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(true)}
            className="group fixed bottom-[calc(88px_+_env(safe-area-inset-bottom))] right-4 z-[60] flex items-center gap-2.5 rounded-full border-1.5 border-ink bg-lime px-4 py-3 shadow-hard transition hover:-translate-y-0.5 lg:bottom-5 lg:right-5"
          >
            <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-1.5 border-ink bg-ink">
              <BotAvatar className="h-full w-full border-0" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-ink bg-coral" />
            </span>
            <span className="text-[12.5px] font-semibold">问问 AI 分身</span>
          </motion.button>
        ) : (
          <motion.div
            key="assistant-panel"
            ref={panelRef}
            initial={{ opacity: 0, y: reduce ? 0 : 24, scale: reduce ? 1 : 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.97 }}
            transition={reduce ? { duration: 0.18 } : { type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed bottom-[calc(84px_+_env(safe-area-inset-bottom))] right-4 z-[65] flex h-[min(560px,78vh)] w-[min(380px,calc(100vw_-_2rem))] flex-col overflow-hidden rounded-[22px] border-1.5 border-ink bg-cream shadow-hard-lg lg:bottom-4"
            role="dialog"
            aria-modal="true"
            aria-label="AI 分身学习助手"
          >
            <div className="flex items-center justify-between gap-2 border-b-1.5 border-ink bg-ink px-3.5 py-2.5 text-paper">
              <div className="flex items-center gap-2">
                <BotAvatar className="h-7 w-7 border-lime/60" />
                <div className="leading-tight">
                  <p className="text-[12px] font-semibold">晓叶的 AI 分身</p>
                  <p className="font-mono text-[9.5px] tracking-[0.14em] text-paper/40">
                    {mode === 'model' ? 'LIVE MODEL' : mode === 'retrieval' ? 'SITE RETRIEVAL' : 'PRESET ANSWERS'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={reset} className="flex h-7 w-7 items-center justify-center rounded-full text-paper/60 hover:bg-paper/10 hover:text-paper" aria-label="新会话">
                  <RotateCcw size={13} />
                </button>
                <button onClick={close} className="flex h-7 w-7 items-center justify-center rounded-full text-paper/60 hover:bg-paper/10 hover:text-paper" aria-label="最小化">
                  <Minus size={14} />
                </button>
                <button onClick={close} className="flex h-7 w-7 items-center justify-center rounded-full text-paper/60 hover:bg-paper/10 hover:text-paper" aria-label="关闭">
                  <X size={14} />
                </button>
              </div>
            </div>

            {contextText && (
              <div className="border-b border-ink/10 bg-lime/25 px-3.5 py-1.5 font-mono text-[9px] tracking-wide text-ink/55">
                正在阅读：{contextText}
              </div>
            )}

            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3.5 no-scrollbar"
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              aria-busy={typing}
            >
              {msgs.map((m, i) => {
                const isLast = i === msgs.length - 1
                if (m.role === 'bot')
                  return (
                    <BotBubble key={m.id} msg={m} typing={typing} isLast={isLast} animate={!!m.streamed && !reduce} />
                  )
                return (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[86%] whitespace-pre-line rounded-2xl rounded-br-md border-1.5 border-ink bg-lime px-3 py-2 text-[12px] leading-relaxed text-ink">
                      {m.text}
                    </div>
                  </div>
                )
              })}
              {typing && (
                <div className="flex items-center gap-2 pl-9 text-[11px] text-ink/40">
                  <Loader2 size={12} className="animate-spin" /> 正在翻我的笔记…
                  <button onClick={stop} className="ml-auto flex items-center gap-1 rounded-full border border-ink/20 px-2 py-0.5 text-[10px] text-ink/60 hover:border-ink hover:text-ink">
                    <Square size={9} /> 停止
                  </button>
                </div>
              )}
              {failed && !typing && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-coral/40 bg-coral/10 px-2.5 py-2 text-[11px] text-ink/70" role="alert">
                  模型不可用，已落回预置问答。
                  <button onClick={retry} className="ml-auto flex items-center gap-1 rounded-full border border-ink/20 px-2 py-0.5 text-[10px] hover:border-ink">
                    <RotateCcw size={9} /> 重试
                  </button>
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
                  aria-label="给 AI 分身的问题"
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
              <p className="mt-1.5 text-center font-mono text-[9.5px] tracking-wide text-ink/30">
                {serverConfig.enabled
                  ? lastSource === 'model'
                    ? degraded
                      ? '模型生成 · 引用未校验通过，可能不准确'
                      : '模型生成 · 可能不准确'
                    : lastSource === 'retrieval'
                      ? '站内检索摘录 · 服务端未接模型'
                      : '模型不可用，已落回预置问答'
                  : '本地预置问答 · 无真实模型调用'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
