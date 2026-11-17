import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, ExternalLink, Image as ImageIcon, Loader2, Mic, Minus, RotateCcw, Smile, Square, X } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useFocusTrap } from '@/lib/a11y'
import { cn, newId, usePrefersReducedMotion } from '@/lib/utils'
import { describeContext, getAssistantContextSnapshot, subscribeAssistantContext } from '@/lib/assistant'
import { askSite, clearSessionId, loadRemoteSession, probeAiMode, quickPrompts, type AiMode, type AnswerSource, type ChatReference } from '@/services/ai'
import { serverConfig } from '@/services/config'
import { profile } from '@/data/site'

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
  /** 用户随消息附带的图片（本地预览，数据 URL） */
  images?: { url: string; name: string }[]
}

const sourceLabel = (source: AnswerSource, degraded?: boolean) => {
  if (source === 'model') return degraded ? '模型生成（引用未校验通过，可能不准确）' : '模型生成，可能不准确'
  if (source === 'retrieval') return '站内检索摘录 · 未接模型'
  return '预置问答 · 作者手写'
}

/** 输入区表情面板：与 AI 分身页 MultiModalInput 同一组，保持体验一致 */
const EMOJIS = [
  '😊', '😂', '🤣', '😍', '🥰', '😘', '😭', '😢', '🤔', '👍',
  '🎉', '🌟', '❤️', '🔥', '✨', '🙏', '👏', '🤗', '😴', '🤯',
  '🥳', '🤩', '😎', '🤓', '😇', '🥺', '😅', '😆', '😉', '😌',
  '👀', '💪', '🙌', '👋', '🤝', '💯', '💥', '💫', '💦', '🌈',
]

/** AI 分身的头像：回复气泡、浮标、面板头部共用。后台资料页可热改 URL，未设置时用站内默认图 */
const DEFAULT_AVATAR = '/image/toux.jpg'

function BotAvatar({ className }: { className?: string }) {
  return (
    // 首屏常驻的小头像不用 lazy：避免浏览器延后 load 事件并打印 Intervention 提示
    <img
      src={profile.avatar?.trim() || DEFAULT_AVATAR}
      alt="晓叶的 AI 分身头像"
      width={28}
      height={28}
      loading="eager"
      className={cn('shrink-0 rounded-full border-1.5 border-ink object-cover', className)}
    />
  )
}

/**
 * 打字机效果：服务端流式每推一段，这里用定时器把目标文本逐字“吐”出来，
 * 视觉上比直接渲染 delta 更连贯亲切；reduce 偏好或一次性到达的完整文本则直接显示。
 *
 * 关键：answer 的首个 delta 往往晚于组件挂载（预置问答 700ms、真实模型看网络），
 * 所以不能只在挂载时启动一次计时器——必须跟着 target 增长继续追字，
 * 否则开局 target 为空时计时器会自己停掉，回答永远停在空白（「不回答消息」的根因）。
 */
function useTypewriter(target: string, animate: boolean) {
  const [shown, setShown] = useState(animate ? '' : target)

  useEffect(() => {
    if (!animate) {
      setShown(target)
      return
    }
    if (shown.length >= target.length) return
    const timer = window.setTimeout(() => {
      setShown(target.slice(0, Math.min(target.length, shown.length + 2)))
    }, 24)
    return () => window.clearTimeout(timer)
  }, [animate, target, shown])

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
  /** 多模态输入：图片附件 / 表情面板 / 语音识别状态 */
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([])
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [inputNotice, setInputNotice] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<null | (() => void)>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null)

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

  const clearInput = () => {
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setRecording(false)
    setEmojiOpen(false)
    setAttachments([])
    setInputNotice(null)
  }

  const reset = () => {
    stop()
    clearSessionId()
    clearInput()
    setMsgs([greeting(mode)])
    setLastSource(mode === 'preset' ? 'preset' : mode === 'retrieval' ? 'retrieval' : 'model')
    setDegraded(false)
    setFailed(false)
  }

  const close = () => {
    stop()
    clearInput()
    setOpen(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // 语音 / 图片的输入提示几秒后自动淡出，不长期占据面板底部
  useEffect(() => {
    if (!inputNotice) return
    const timer = window.setTimeout(() => setInputNotice(null), 3500)
    return () => window.clearTimeout(timer)
  }, [inputNotice])

  useEffect(() => () => { cancelRef.current?.(); recognitionRef.current?.abort() }, [])

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

  const addEmoji = (emoji: string) => {
    setDraft((v) => v + emoji)
    setEmojiOpen(false)
    setInputNotice(null)
    textareaRef.current?.focus()
  }

  const handleImages = (files: FileList | null) => {
    if (!files?.length) return
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!picked.length) {
      setInputNotice('请选择图片文件')
      return
    }
    let rejected = false
    picked.slice(0, 4).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        rejected = true
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const url = String(reader.result ?? '')
        setAttachments((prev) => (prev.length >= 4 ? prev : [...prev, { url, name: file.name }]))
      }
      reader.readAsDataURL(file)
    })
    setInputNotice(rejected ? '单张图片请控制在 5MB 以内' : null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleVoice = () => {
    if (recording) {
      recognitionRef.current?.stop()
      return
    }
    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Speech) {
      setInputNotice('当前浏览器不支持语音输入，建议使用 Chrome 或 Edge')
      return
    }
    try {
      const recognition = new Speech()
      recognition.lang = 'zh-CN'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.onstart = () => {
        setRecording(true)
        setInputNotice(null)
      }
      recognition.onend = () => setRecording(false)
      recognition.onerror = () => {
        setRecording(false)
        setInputNotice('语音识别失败，请重试或直接输入')
      }
      recognition.onresult = (e: any) => {
        const transcript = String(e?.results?.[0]?.[0]?.transcript ?? '').trim()
        if (transcript) setDraft((v) => (v ? `${v} ${transcript}` : transcript))
      }
      recognitionRef.current = recognition
      recognition.start()
    } catch {
      setRecording(false)
      setInputNotice('语音识别启动失败，请直接输入')
    }
  }

  const send = (value?: string) => {
    // 快捷提示词走显式文本，不带上尚未发送的附件
    const explicit = typeof value === 'string'
    const text = ((explicit ? value : draft) ?? '').trim()
    const images = explicit ? [] : attachments
    if ((!text && images.length === 0) || typing) return
    // 当前网关只吃文本：图片随消息本地展示，文本里如实带出文件名，不伪装成已看懂图片
    const userText = text || `（我上传了图片：${images.map((i) => i.name).join('、')}）`
    setMsgs((m) => [...m, { id: newId('user'), role: 'user', text: userText, images: images.length ? images : undefined }])
    setDraft('')
    setAttachments([])
    setEmojiOpen(false)
    setInputNotice(null)
    reply(userText)
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
                      {m.images?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.images.map((img, imgIdx) => (
                            <a key={imgIdx} href={img.url} target="_blank" rel="noopener noreferrer" title={`查看 ${img.name}`}>
                              <img src={img.url} alt={img.name} className="h-16 w-16 rounded-lg border border-ink/25 object-cover" />
                            </a>
                          ))}
                        </div>
                      ) : null}
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

            <div className="relative border-t border-ink/10 px-3 pb-3 pt-2">
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

              {/* 待发送图片：本地预览，可逐张移除 */}
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {attachments.map((img, idx) => (
                    <div key={idx} className="group relative">
                      <img src={img.url} alt={img.name} className="h-12 w-12 rounded-lg border border-ink/20 object-cover" />
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label={`移除 ${img.name}`}
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-ink bg-coral text-[10px] leading-none text-paper"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2 rounded-xl border-1.5 border-ink/20 bg-paper p-1.5 focus-within:border-ink">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    if (inputNotice) setInputNotice(null)
                  }}
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
                  disabled={(!draft.trim() && attachments.length === 0) || typing}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-1.5 border-ink bg-ink text-paper transition disabled:opacity-30"
                  aria-label="发送"
                >
                  <ArrowUp size={14} />
                </button>
              </div>

              {/* 输入工具栏：图片 / 表情 / 语音 */}
              <div className="mt-1.5 flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImages(e.target.files)}
                  aria-label="选择图片"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={typing}
                  title="上传图片"
                  aria-label="上传图片"
                  className="flex h-6 w-6 items-center justify-center rounded-md text-ink/45 transition hover:bg-lime/40 hover:text-ink disabled:opacity-30"
                >
                  <ImageIcon size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setEmojiOpen((v) => !v)}
                  disabled={typing}
                  title="表情"
                  aria-label="表情"
                  aria-expanded={emojiOpen}
                  className={cn('flex h-6 w-6 items-center justify-center rounded-md text-ink/45 transition hover:bg-lime/40 hover:text-ink disabled:opacity-30', emojiOpen && 'bg-lime/50 text-ink')}
                >
                  <Smile size={14} />
                </button>
                <button
                  type="button"
                  onClick={toggleVoice}
                  disabled={typing}
                  title={recording ? '停止录音' : '语音输入'}
                  aria-label={recording ? '停止录音' : '语音输入'}
                  className={cn('flex h-6 w-6 items-center justify-center rounded-md text-ink/45 transition hover:bg-lime/40 hover:text-ink disabled:opacity-30', recording && 'animate-pulse bg-coral/15 text-coral')}
                >
                  <Mic size={14} />
                </button>
                {recording && <span className="ml-1 text-[10px] text-coral">正在听…</span>}
              </div>

              {inputNotice && (
                <p className="mt-1 text-[10px] text-coral" role="status">{inputNotice}</p>
              )}

              {emojiOpen && (
                <div className="absolute bottom-full left-3 right-3 z-[70] mb-1 max-h-40 overflow-y-auto rounded-xl border-1.5 border-ink bg-cream p-2 shadow-hard-lg no-scrollbar">
                  <div className="grid grid-cols-8 gap-0.5">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => addEmoji(emoji)}
                        className="rounded p-1 text-[17px] leading-none transition hover:bg-lime/50"
                        aria-label={`插入表情 ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
