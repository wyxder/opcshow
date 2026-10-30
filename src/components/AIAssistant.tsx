import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Bot, ExternalLink, Loader2, Minus, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn, newId } from '@/lib/utils'
import { askSite, quickPrompts, type AnswerSource, type ChatReference } from '@/services/ai'
import { serverConfig } from '@/services/config'

type Msg = {
  id: string
  role: 'user' | 'bot'
  text: string
  source?: AnswerSource
  references?: ChatReference[]
}

const greeting = (live: boolean): Msg => ({
  id: newId('greet'),
  role: 'bot',
  source: live ? 'model' : 'preset',
  text: live
    ? '你好，我是这个站的 AI 助手，回答来自服务端代理的模型（密钥不在浏览器里）。\n\n可以问我 RAG、Agent 评测、项目细节，或者让我推荐先读哪篇。'
    : '你好，我是这个站的 AI 助手。当前没有接入模型服务，回答来自作者手写的预置问答（离线可用）。\n\n可以问我 RAG、Agent 评测、项目细节，或者让我推荐先读哪篇。',
})

export function AIAssistant({ defaultOpen = false, context }: { defaultOpen?: boolean; context?: string }) {
  const [open, setOpen] = useState(defaultOpen)
  const [msgs, setMsgs] = useState<Msg[]>([greeting(serverConfig.enabled)])
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [lastSource, setLastSource] = useState<AnswerSource>(serverConfig.enabled ? 'model' : 'preset')
  const scrollRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<null | (() => void)>(null)

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

  // 卸载 / 关闭时取消进行中的回答，避免定时器与流残留
  useEffect(() => () => cancelRef.current?.(), [])

  const reply = (input: string) => {
    const id = newId('bot')
    setTyping(true)
    setMsgs((m) => [...m, { id, role: 'bot', text: '' }])

    cancelRef.current = askSite(
      { input, context, history: msgs.map((m) => ({ role: m.role === 'bot' ? ('assistant' as const) : ('user' as const), content: m.text })) },
      {
        onDelta: (text) => {
          setTyping(false)
          setMsgs((m) => m.map((msg) => (msg.id === id ? { ...msg, text } : msg)))
        },
        onDone: ({ source, references }) => {
          setTyping(false)
          setLastSource(source)
          setMsgs((m) => m.map((msg) => (msg.id === id ? { ...msg, text: msg.text, source, references } : msg)))
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
            role="dialog"
            aria-label="AI 学习助手"
          >
            <div className="flex items-center justify-between gap-2 border-b-1.5 border-ink bg-ink px-3.5 py-2.5 text-paper">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-lime/60 bg-lime/15 text-lime">
                  <Sparkles size={14} />
                </span>
                <div className="leading-tight">
                  <p className="text-[12px] font-semibold">云潇的 AI 助手</p>
                  <p className="font-mono text-[9.5px] tracking-[0.14em] text-paper/40">
                    {serverConfig.enabled ? 'LIVE MODEL' : 'PRESET ANSWERS'}
                  </p>
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
                    {m.role === 'bot' && m.text !== '' && m.source && (
                      <span className="mt-1.5 flex items-center gap-1 border-t border-dashed border-ink/10 pt-1 font-mono text-[9px] text-ink/35">
                        {m.source === 'model' ? '模型生成，可能不准确' : '预置问答 · 作者手写'}
                      </span>
                    )}
                    {/* AI3：引用锚点。RAG 接通后服务端返回 references，这里直接渲染 */}
                    {!!m.references?.length && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {m.references.map((r) => (
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
                  aria-label="给 AI 助手的问题"
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
                {serverConfig.enabled ? `${lastSource === 'model' ? '实时模型' : '模型不可用，已落回预置问答'}` : '本地预置问答 · 无真实模型调用'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
