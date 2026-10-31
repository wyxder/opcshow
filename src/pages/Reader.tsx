import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  ListTree,
  Share2,
  Type,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Pill } from '@/components/ui/primitives'
import { setAssistantContext } from '@/lib/assistant'
import { articleById, articles, type Block } from '@/data/articles'
import { profile } from '@/data/site'
import { cn } from '@/lib/utils'
import { articleJsonLd, useSeo } from '@/lib/seo'
import { STORAGE_KEYS, isRecordOf, readStored, writeStored } from '@/lib/storage'
import { languageLabel, splitTokenLines, tokenize } from '@/lib/highlight'

function CodeBlock({ block }: { block: Extract<Block, { t: 'code' }> }) {
  const [copied, setCopied] = useState(false)
  const lines = useMemo(() => splitTokenLines(tokenize(block.v, block.lang)), [block.v, block.lang])
  const label = languageLabel(block.lang)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(block.v)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-ink/15 bg-[#0d1117] shadow-[0_10px_30px_-24px_rgba(0,0,0,0.6)]">
      <div className="flex h-10 items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.03] px-3">
        <span className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#79c0ff]" />
          <span className="truncate font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-white/50">
            {label}
          </span>
        </span>
        <button
          onClick={copy}
          aria-label={copied ? '已复制代码' : '复制代码'}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 font-mono text-[10px] text-white/45 transition hover:bg-white/[0.06] hover:text-white"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          <span className="hidden sm:inline">{copied ? '已复制' : '复制'}</span>
        </button>
      </div>

      <div className="code-scroll overflow-x-auto overscroll-x-contain">
        <pre className="m-0 min-w-max py-3.5 font-mono text-[12px] leading-[1.8] text-[#e6edf3] [font-variant-ligatures:none] sm:text-[12.5px]">
          <code className="block">
            {lines.map((tokens, i) => (
              <span key={i} className="flex min-h-[1.8em]">
                <span className="w-9 shrink-0 select-none pr-3 text-right text-[10px] leading-[inherit] text-white/20">
                  {i + 1}
                </span>
                <span className="whitespace-pre pr-5">
                  {tokens.map((token, j) => (
                    <span key={j} className={token.type === 'plain' ? undefined : `code-tok-${token.type}`}>
                      {token.text}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  )
}

function BlockView({ block }: { block: Block }) {
  switch (block.t) {
    case 'p':
      return <p>{block.v}</p>
    case 'code':
      return <CodeBlock block={block} />
    case 'quote':
      return <blockquote>{block.v}</blockquote>
    case 'list':
      return (
        <ul className="my-4 space-y-1.5 pl-1">
          {block.items.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rotate-45 bg-lime" />
              <span className="text-[14px] leading-[1.85] text-ink-soft">{item}</span>
            </li>
          ))}
        </ul>
      )
    case 'note':
      return (
        <div className="my-5 rounded-xl border-1.5 border-ink/15 border-l-[5px] border-l-coral bg-cream px-4 py-3 [&_p]:mb-0">
          <p className="font-mono text-[9px] tracking-[0.16em] text-coral">{block.title.toUpperCase()}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink/75">{block.v}</p>
        </div>
      )
    case 'table':
      return (
        <div className="my-5 overflow-x-auto rounded-xl border-1.5 border-ink/15">
          <table className="w-full border-collapse text-left text-[12px]">
            <thead>
              <tr className="bg-ink text-paper">
                {block.head.map((h) => (
                  <th key={h} className="px-3 py-2 font-mono text-[9.5px] font-medium tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className={cn(i % 2 === 1 && 'bg-paper/60')}>
                  {row.map((c, j) => (
                    <td key={j} className={cn('px-3 py-2', j === 0 && 'font-medium')}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    default:
      return null
  }
}

export default function Reader() {
  const { id } = useParams()
  const article = articleById(id)
  const [active, setActive] = useState('')
  const [progress, setProgress] = useState(0)
  const [tocOpen, setTocOpen] = useState(false)
  /** F-06 字号三档：只影响正文，不改标题层级 */
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md')
  const bodyRef = useRef<HTMLDivElement>(null)

  // fx.md S3 / S4：文章页自己的一套 title/description + Article 结构化数据
  useSeo({
    title: article ? `${article.title} · 晓叶` : '文章不存在 · 晓叶',
    description: article?.abstract,
    ogType: article ? 'article' : 'website',
    jsonLd: article
      ? articleJsonLd({
          id: article.id,
          title: article.title,
          abstract: article.abstract,
          date: article.date,
          sectionTitle: article.sections[0]?.title,
        })
      : undefined,
  })

  const ids = useMemo(
    () => (article ? article.sections.flatMap((s) => [s.id, ...s.subs.map((x) => x.id)]) : []),
    [article],
  )

  // F-06 / X-05：助手上下文精确到当前小节，不再只传标题
  useEffect(() => {
    if (!article) return
    const section = article.sections.find((s) => s.id === active || s.subs.some((x) => x.id === active))
    const sub = section?.subs.find((x) => x.id === active)
    setAssistantContext({
      articleId: article.id,
      articleTitle: article.title,
      sectionId: active || section?.id,
      sectionTitle: sub?.title ?? section?.title,
    })
  }, [article, active])

  useEffect(() => () => setAssistantContext({}), [])

  // 切换文章时清掉上一章的小节，避免助手短暂带着错误上下文
  useEffect(() => {
    setActive('')
  }, [article?.id])

  // F-06 阅读位置：进入文章时若有记录且没有锚点，恢复到上次读到的小节
  useEffect(() => {
    if (!article || window.location.hash) return
    const saved = readStored<Record<string, string>>(STORAGE_KEYS.readingPos, {}, isRecordOf((v) => typeof v === 'string'))[article.id]
    if (!saved) return
    const timer = window.setTimeout(() => {
      document.getElementById(saved)?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' })
    }, 320)
    return () => window.clearTimeout(timer)
  }, [article])

  // 记住当前小节；IntersectionObserver 已节流，写入频率不会失控
  useEffect(() => {
    if (!article || !active) return
    const map = readStored<Record<string, string>>(STORAGE_KEYS.readingPos, {}, isRecordOf((v) => typeof v === 'string'))
    writeStored(STORAGE_KEYS.readingPos, { ...map, [article.id]: active })
  }, [article, active])

  useEffect(() => {
    if (!article) return
    const onScroll = () => {
      const el = bodyRef.current
      if (el) {
        const rect = el.getBoundingClientRect()
        const total = rect.height - window.innerHeight * 0.5
        const passed = Math.min(Math.max(-rect.top + 120, 0), Math.max(total, 1))
        setProgress(Math.round((passed / Math.max(total, 1)) * 100))
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [article])

  useEffect(() => {
    if (!article) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-110px 0px -68% 0px', threshold: 0 },
    )
    ids.forEach((sid) => {
      const el = document.getElementById(sid)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [article, ids])

  if (!article) {
    return (
      <div className="shell flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="font-display text-[60px] font-extrabold leading-none text-ink/10">N/A</p>
        <p className="mt-3 font-hand text-2xl text-coral">这篇文章还没写，或者链接错了。</p>
        <Link to="/learn" className="btn-ink mt-5">
          回知识库
        </Link>
      </div>
    )
  }

  const index = articles.findIndex((a) => a.id === article.id)
  const prev = articles[index - 1]
  const next = articles[index + 1]

  // F-06 相关推荐：按共享 tag 数排序，最多 3 篇
  const related = articles
    .filter((a) => a.id !== article.id)
    .map((a) => ({ article: a, shared: a.tags.filter((t) => article.tags.includes(t)) }))
    .filter((x) => x.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length)
    .slice(0, 3)

  const fontLabel = { sm: '小', md: '中', lg: '大' }[fontSize]
  const cycleFont = () => setFontSize((s) => (s === 'sm' ? 'md' : s === 'md' ? 'lg' : 'sm'))

  const TocTree = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="space-y-1">
      <div className="mb-3 flex items-start gap-2 rounded-lg bg-ink px-2.5 py-2 text-paper">
        <ListTree size={12} className="mt-0.5 shrink-0 text-lime" />
        <span className="line-clamp-2 text-[10.5px] font-medium leading-snug">{article.title}</span>
      </div>
      {article.sections.map((s) => {
        const sectionActive = active === s.id || s.subs.some((x) => x.id === active)
        return (
          <div key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={onNavigate}
              className={cn(
                'flex items-start gap-1.5 rounded-md px-2 py-1.5 text-[11.5px] leading-snug transition-colors',
                sectionActive ? 'bg-lime/40 font-semibold text-ink' : 'text-ink/55 hover:bg-paper hover:text-ink',
              )}
            >
              <ChevronRight size={11} className={cn('mt-0.5 shrink-0 transition-transform', sectionActive && 'rotate-90')} />
              <span className="break-words">{s.title}</span>
            </a>
            <div className="ml-3 border-l border-ink/12 pl-2">
              {s.subs.map((sub) => (
                <a
                  key={sub.id}
                  href={`#${sub.id}`}
                  onClick={onNavigate}
                  className={cn(
                    'block rounded-md px-2 py-1.5 text-[10.5px] leading-snug transition-colors',
                    active === sub.id ? 'bg-coral/15 font-medium text-coral' : 'text-ink/45 hover:bg-paper hover:text-ink',
                  )}
                >
                  <span className="break-words">{sub.title}</span>
                </a>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="shell">
      {/* breadcrumb */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 font-mono text-[9.5px] tracking-wide text-ink/40">
        <Link to="/learn" className="hover:text-ink">
          学习
        </Link>
        <ChevronRight size={10} />
        <span>{article.category}</span>
        <ChevronRight size={10} />
        <span className="text-ink/70">{article.title}</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[236px_minmax(0,1fr)_200px] lg:gap-7">
        {/* TOC desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pb-6 no-scrollbar">
            <p className="mb-2 font-mono text-[9px] tracking-[0.2em] text-ink/35">CONTENTS · 三级目录</p>
            <TocTree />
          </div>
        </aside>

        {/* article */}
        <article>
          <header className="relative overflow-hidden rounded-[24px] border-1.5 border-ink bg-cream p-6 shadow-hard sm:p-8">
            <div className="pointer-events-none absolute inset-0 grid-paper opacity-50" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tag" style={{ background: `color-mix(in srgb, ${article.accent} 25%, transparent)` }}>
                  {article.category}
                </span>
                {article.tags.map((t) => (
                  <Pill key={t}># {t}</Pill>
                ))}
              </div>
              <h1 className="mt-4 text-[clamp(26px,4vw,40px)] font-extrabold leading-[1.08]">{article.title}</h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-soft">{article.subtitle}</p>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-ink/15 pt-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-1.5 border-ink bg-lime text-[11px] font-bold">魏</span>
                  <div className="leading-tight">
                    <p className="text-[11.5px] font-semibold">{profile.name}</p>
                    <p className="font-mono text-[9.5px] tracking-widest text-ink/35">AI 全栈 / 智能体开发</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 font-mono text-[9.5px] text-ink/45">
                  <span>{article.date}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {article.readMin} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={10} /> {article.views}
                  </span>
                  <button
                    onClick={() => navigator.clipboard?.writeText(window.location.href)}
                    className="flex items-center gap-1 rounded-full border border-ink/20 px-2 py-0.5 transition hover:bg-lime/40"
                  >
                    <Share2 size={10} /> 复制链接
                  </button>
                  <button
                    onClick={cycleFont}
                    aria-label={`切换正文字号，当前${fontLabel}`}
                    className="flex items-center gap-1 rounded-full border border-ink/20 px-2 py-0.5 transition hover:bg-lime/40"
                  >
                    <Type size={10} /> 字号 · {fontLabel}
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="mt-5 rounded-2xl border border-ink/12 bg-lime/20 px-5 py-4">
            <p className="font-mono text-[9px] tracking-[0.16em] text-ink/40">TL;DR</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink/75">{article.abstract}</p>
          </div>

          <div
            ref={bodyRef}
            className={cn('prose-read mt-8', fontSize === 'sm' && 'reader-sm', fontSize === 'lg' && 'reader-lg')}
          >
            {article.sections.map((s) => (
              <section key={s.id}>
                <h2 id={s.id} className="scroll-mt-28">
                  {s.title}
                </h2>
                {s.lead && <p className="-mt-2 mb-5 font-hand text-[20px] text-coral">{s.lead}</p>}
                {s.subs.map((sub) => (
                  <div key={sub.id}>
                    <h3 id={sub.id} className="scroll-mt-28">
                      {sub.title}
                    </h3>
                    {sub.blocks.map((b, i) => (
                      <BlockView key={i} block={b} />
                    ))}
                  </div>
                ))}
              </section>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-1.5 border-ink bg-cream p-5">
            <p className="max-w-sm font-hand text-[20px] leading-snug text-ink/60">
              读到这儿了，说明你和我关心的是同一类问题。欢迎邮件聊聊。
            </p>
            <a href={`mailto:${profile.email}`} className="btn-ink !text-[12px]">
              发邮件给晓叶 <ArrowRight size={13} />
            </a>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {prev && (
              <Link to={`/learn/${prev.id}`} className="group rounded-xl border-1.5 border-ink/15 bg-cream p-4 transition hover:border-ink hover:shadow-hard-sm">
                <p className="flex items-center gap-1 font-mono text-[9px] tracking-widest text-ink/35">
                  <ArrowLeft size={10} /> 上一篇
                </p>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] font-semibold group-hover:underline">{prev.title}</p>
              </Link>
            )}
            {next && (
              <Link to={`/learn/${next.id}`} className="group rounded-xl border-1.5 border-ink/15 bg-cream p-4 text-right transition hover:border-ink hover:shadow-hard-sm sm:col-start-2">
                <p className="flex items-center justify-end gap-1 font-mono text-[9px] tracking-widest text-ink/35">
                  下一篇 <ArrowRight size={10} />
                </p>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] font-semibold group-hover:underline">{next.title}</p>
              </Link>
            )}
          </div>

          {related.length > 0 && (
            <section className="mt-8">
              <p className="font-mono text-[9px] tracking-[0.2em] text-ink/35">RELATED · 相关阅读</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {related.map(({ article: item, shared }) => (
                  <Link
                    key={item.id}
                    to={`/learn/${item.id}`}
                    className="group rounded-xl border-1.5 border-ink/15 bg-cream p-3.5 transition hover:border-ink hover:shadow-hard-sm"
                  >
                    <span className="font-mono text-[9px] tracking-wide text-ink/40">{item.category}</span>
                    <p className="mt-1.5 line-clamp-2 text-[12.5px] font-semibold leading-snug group-hover:underline">{item.title}</p>
                    <p className="mt-2 font-mono text-[9px] text-ink/30">#{shared.join(' · ')}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>

        {/* right rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-3">
            <div className="rounded-xl border-1.5 border-ink bg-cream p-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] tracking-[0.16em] text-ink/35">PROGRESS</p>
                <span className="font-mono text-[10px] font-bold">{progress}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
                <motion.div className="h-full rounded-full bg-ink" animate={{ width: `${progress}%` }} transition={{ duration: 0.2 }} />
              </div>
            </div>

            <div className="rounded-xl border-1.5 border-ink bg-cream p-3">
              <p className="font-mono text-[9px] tracking-[0.16em] text-ink/35">SECTIONS</p>
              <div className="mt-2 space-y-1">
                {article.sections.map((s, i) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={cn(
                      'block rounded-md px-1.5 py-1 text-[10.5px] leading-snug transition',
                      active === s.id || s.subs.some((x) => x.id === active) ? 'bg-lime/50 font-medium text-ink' : 'text-ink/45 hover:bg-paper',
                    )}
                  >
                    {String(i + 1).padStart(2, '0')} {s.title.replace(/^\d+\s/, '')}
                  </a>
                ))}
              </div>
            </div>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-assistant'))}
              className="flex w-full items-center gap-2 rounded-xl border-1.5 border-ink bg-ink p-3 text-left text-paper transition hover:-translate-y-0.5"
            >
              <Bot size={15} className="text-lime" />
              <span className="flex-1 text-[10.5px] leading-tight">对这篇有疑问？<br />问 AI 助手</span>
              <ArrowRight size={12} />
            </button>

            <button onClick={() => setTocOpen(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-ink/15 px-2 py-2 font-mono text-[9px] tracking-widest text-ink/45 hover:border-ink/40">
              <ListTree size={11} /> 目录
            </button>
          </div>
        </aside>
      </div>

      {/* mobile toc trigger */}
      <button
        onClick={() => setTocOpen(true)}
        className="fixed bottom-5 left-5 z-[55] flex items-center gap-2 rounded-full border-1.5 border-ink bg-cream px-3.5 py-2.5 text-[11.5px] font-medium shadow-hard lg:hidden"
      >
        <ListTree size={13} /> 目录 · {progress}%
      </button>

      <Modal open={tocOpen} onClose={() => setTocOpen(false)} title="本文目录" kicker="CONTENTS · 三级">
        <div className="px-4 py-4">
          <TocTree onNavigate={() => setTocOpen(false)} />
        </div>
      </Modal>

    </div>
  )
}
