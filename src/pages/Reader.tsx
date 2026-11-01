import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  Heart,
  ListTree,
  MessageSquareQuote,
  Pencil,
  Send,
  Share2,
  Trash2,
  Type,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Plate, Pill } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/Toast'
import { setAssistantContext } from '@/lib/assistant'
import { articleById, articles, type Block } from '@/data/articles'
import { profile } from '@/data/site'
import { cn, readableInk, usePrefersReducedMotion } from '@/lib/utils'
import { articleJsonLd, useSeo } from '@/lib/seo'
import { STORAGE_KEYS, arrayOf, isRecordOf, readStored, writeStored } from '@/lib/storage'
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
      <div className="flex h-9 items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.03] px-3 sm:h-10">
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
        <pre className="m-0 min-w-max py-3 font-mono text-[11px] leading-[1.8] text-[#e6edf3] [font-variant-ligatures:none] sm:py-3.5 sm:text-[12.5px]">
          <code className="block">
            {lines.map((tokens, i) => (
              <span key={i} className="flex min-h-[1.8em]">
                <span className="w-7 shrink-0 select-none pr-2 text-right text-[10px] leading-[inherit] text-white/20 sm:w-9 sm:pr-3">
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
            <li key={item} className="flex gap-2 sm:gap-2.5">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rotate-45 bg-lime" />
              <span className="text-[13.5px] leading-[1.85] text-ink-soft sm:text-[14px]">{item}</span>
            </li>
          ))}
        </ul>
      )
    case 'note':
      return (
        <div className="my-5 rounded-xl border-1.5 border-ink/15 border-l-[5px] border-l-coral bg-cream px-3 py-3 sm:px-4 [&_p]:mb-0">
          <p className="font-mono text-[9px] tracking-[0.16em] text-coral">{block.title.toUpperCase()}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink/75">{block.v}</p>
        </div>
      )
    case 'table':
      return (
        <div className="my-5 overflow-x-auto rounded-xl border-1.5 border-ink/15">
          <table className="w-full border-collapse text-left text-[11.5px] sm:text-[12px]">
            <thead>
              <tr className="bg-ink text-paper">
                {block.head.map((h) => (
                  <th key={h} className="whitespace-nowrap px-2.5 py-2 font-mono text-[9.5px] font-medium tracking-wide sm:px-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className={cn(i % 2 === 1 && 'bg-paper/60')}>
                  {row.map((c, j) => (
                    <td key={j} className={cn('px-2.5 py-2 sm:px-3', j === 0 && 'font-medium')}>
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

const coverMotifs = ['orbit', 'stack', 'bars', 'grid', 'wave', 'rings'] as const
const coverAccents = [
  'rgb(var(--c-blue))',
  'rgb(var(--c-grape))',
  'rgb(var(--c-coral))',
  'rgb(var(--c-lime))',
  'rgb(var(--c-sky))',
  'rgb(var(--c-rose))',
]

/** 上一篇 / 下一篇卡片：带上与知识库列表同款的封面图，不再只有纯文字 */
function NavCard({
  to,
  article,
  coverIndex,
  dir,
}: {
  to: string
  article: (typeof articles)[number]
  coverIndex: number
  dir: 'prev' | 'next'
}) {
  const motif = coverMotifs[((coverIndex % coverMotifs.length) + coverMotifs.length) % coverMotifs.length]
  const accent = coverAccents[((coverIndex % coverAccents.length) + coverAccents.length) % coverAccents.length]
  const isNext = dir === 'next'
  return (
    <Link
      to={to}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border-1.5 border-ink/15 bg-cream transition hover:border-ink hover:shadow-hard-sm',
        isNext && 'sm:col-start-2',
      )}
    >
      <div className="relative h-[74px] w-full shrink-0 overflow-hidden border-b border-ink/12 sm:h-[92px]">
        <Plate motif={motif} accent={accent} className="absolute inset-0" />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent" />
        <span
          className={cn(
            'absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-ink/20 bg-cream/90 px-2 py-0.5 font-mono text-[8.5px] tracking-widest text-ink/60 backdrop-blur',
            isNext && 'left-auto right-2',
          )}
        >
          {isNext ? (
            <>
              下一篇 <ArrowRight size={10} />
            </>
          ) : (
            <>
              <ArrowLeft size={10} /> 上一篇
            </>
          )}
        </span>
        <span className="absolute bottom-2 left-2 truncate rounded border border-ink/15 bg-cream/85 px-1.5 py-0.5 font-mono text-[8.5px] text-ink/60">
          {article.category}
        </span>
      </div>
      <div className={cn('flex-1 p-3 sm:p-4', isNext && 'text-right')}>
        <p className={cn('line-clamp-2 text-[11.5px] font-semibold group-hover:underline sm:text-[12.5px]', isNext && 'sm:text-right')}>{article.title}</p>
        <p className="mt-1.5 flex items-center gap-2 font-mono text-[9px] text-ink/40">
          <span className={cn('flex items-center gap-1', isNext && 'sm:ml-auto')}>
            <Clock size={10} /> {article.readMin} min
          </span>
          <span>{article.date}</span>
        </p>
      </div>
    </Link>
  )
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

  // F-06：进入文章不再自动滚到上次阅读位置（避免“点进来就自己往下跳”的观感）；
  // 仅保留当前小节写入，方便日后做“继续阅读”入口，但不主动 scrollIntoView。
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
      {/* breadcrumb：窄屏下标题截断，不把面包屑顶成两行乱序 */}
      <div className="mb-4 flex flex-nowrap items-center gap-1.5 overflow-hidden font-mono text-[9.5px] tracking-wide text-ink/40">
        <Link to="/learn" className="shrink-0 hover:text-ink">
          学习
        </Link>
        <ChevronRight size={10} className="shrink-0" />
        <span className="hidden shrink-0 sm:inline">{article.category}</span>
        <ChevronRight size={10} className="hidden shrink-0 sm:inline" />
        <span className="min-w-0 truncate text-ink/70">{article.title}</span>
      </div>

      {/* grid-cols-1：移动端列宽锁到 minmax(0,1fr)，否则代码块的 min-w-max 会把整页撑宽 */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[236px_minmax(0,1fr)] lg:gap-7">
        {/* TOC desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pb-6 no-scrollbar">
            <p className="mb-2 font-mono text-[9px] tracking-[0.2em] text-ink/35">CONTENTS · 三级目录</p>
            <TocTree />
          </div>
        </aside>

        {/* article */}
        <article className="min-w-0">
          <header className="relative overflow-hidden rounded-[18px] border-1.5 border-ink bg-cream p-4 shadow-hard sm:rounded-[24px] sm:p-8">
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
              <h1 className="mt-3 text-[clamp(21px,6vw,40px)] font-extrabold leading-[1.15] sm:mt-4 sm:leading-[1.08]">{article.title}</h1>
              <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-ink-soft sm:mt-3 sm:text-[14px]">{article.subtitle}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dashed border-ink/15 pt-3.5 sm:mt-5 sm:pt-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-1.5 border-ink bg-lime text-[11px] font-bold">魏</span>
                  <div className="leading-tight">
                    <p className="text-[11.5px] font-semibold">{profile.name}</p>
                    <p className="font-mono text-[9.5px] tracking-widest text-ink/35">AI 全栈 / 智能体开发</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 font-mono text-[9px] text-ink/45 sm:gap-x-3 sm:text-[9.5px]">
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

          <div className="mt-4 rounded-2xl border border-ink/12 bg-lime/20 px-4 py-3.5 sm:mt-5 sm:px-5 sm:py-4">
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

          <ArticleComments articleId={article.id} />

          {(prev || next) && (
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
              {prev && <NavCard to={`/learn/${prev.id}`} article={prev} coverIndex={index - 1} dir="prev" />}
              {next && <NavCard to={`/learn/${next.id}`} article={next} coverIndex={index + 1} dir="next" />}
            </div>
          )}
        </article>
      </div>

      {/* mobile toc trigger：抬到底部菜单栏与 AI 助手同一水平线，不再被底栏压住 */}
      <button
        onClick={() => setTocOpen(true)}
        className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-4 z-[55] flex items-center gap-2 rounded-full border-1.5 border-ink bg-cream px-3.5 py-2.5 text-[11.5px] font-medium shadow-hard lg:hidden"
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

/* ------------------------------- article comments ------------------------------- */
/**
 * 文章末尾评论区（本机存储）。
 * - 数据按文章 id 归档在 localStorage（STORAGE_KEYS.articleComments），读写走 storage.ts 统一入口；
 * - 只做「输入 → 落到本机 → 渲染」的最小闭环，不冒充真实社区（明确「仅本机可见」提示）；
 * - 颜色、边框、阴影全部沿用站点主题 token，五套主题与对比度门禁继续生效。
 */
type ArticleComment = {
  id: string
  articleId: string
  name: string
  text: string
  time: string
  color: string
  likes: number
}

const commentPalette = [
  'rgb(var(--c-lime))',
  'rgb(var(--c-coral))',
  'rgb(var(--c-sky))',
  'rgb(var(--c-grape))',
  'rgb(var(--c-rose))',
  'rgb(var(--c-surface))',
]

const isArticleComment = (v: unknown): v is ArticleComment =>
  !!v && typeof v === 'object' && typeof (v as ArticleComment).id === 'string' && typeof (v as ArticleComment).text === 'string'

const commentTimeLabel = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function ArticleComments({ articleId }: { articleId: string }) {
  const [all, setAll] = useState<ArticleComment[]>(() =>
    readStored<ArticleComment[]>(STORAGE_KEYS.articleComments, [], arrayOf<ArticleComment>(isArticleComment)),
  )
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [color, setColor] = useState(commentPalette[0])
  const [liked, setLiked] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const reduce = usePrefersReducedMotion()
  const { show, node } = useToast()

  useEffect(() => {
    writeStored(STORAGE_KEYS.articleComments, all)
  }, [all])

  const list = useMemo(() => all.filter((c) => c.articleId === articleId), [all, articleId])

  const submit = () => {
    if (sending) return
    const body = text.trim()
    if (!body) {
      show('先写点什么吧')
      return
    }
    setSending(true)
    const c: ArticleComment = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      articleId,
      name: name.trim() || '匿名读者',
      text: body.slice(0, 200),
      time: commentTimeLabel(),
      color,
      likes: 0,
    }
    setAll((l) => [c, ...l])
    setText('')
    show('评论已留在本机，只你自己看得到')
    setSending(false)
  }

  const like = (id: string) => {
    const already = liked.includes(id)
    setLiked((l) => (already ? l.filter((x) => x !== id) : [...l, id]))
    setAll((a) => a.map((c) => (c.id === id ? { ...c, likes: Math.max(0, c.likes + (already ? -1 : 1)) } : c)))
  }

  const remove = (id: string) => setAll((a) => a.filter((c) => c.id !== id))

  return (
    <section aria-label="文章评论" className="mt-10 overflow-hidden rounded-[22px] border-1.5 border-ink bg-cream shadow-hard-sm">
      {/* 头部条 */}
      <div className="relative flex items-center justify-between gap-3 border-b border-ink/12 bg-gradient-to-r from-lime/40 via-cream to-sky/25 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border-1.5 border-ink bg-paper">
            <MessageSquareQuote size={17} />
          </span>
          <div>
            <h2 className="text-[15px] font-extrabold leading-none">评论区</h2>
            <p className="mt-1 font-mono text-[9px] tracking-[0.16em] text-ink/45">{list.length} 条 · LOCAL ONLY</p>
          </div>
        </div>
        <span className="hidden max-w-[46%] text-right font-hand text-[15px] leading-snug text-ink/55 sm:block">
          有共鸣、有疑问，都可以说两句。
        </span>
      </div>

      {/* 输入区 */}
      <div className="px-5 pt-4">
        <div className="rounded-2xl border border-ink/12 bg-paper p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-1.5 border-ink font-display text-[13px] font-extrabold"
              style={{ background: color, color: readableInk(color) }}
              aria-hidden
            >
              {(name.trim() || '读').slice(0, 1)}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
              placeholder="怎么称呼你？（可留空）"
              aria-label="你的名字"
              className="min-w-[120px] flex-1 rounded-lg border border-ink/15 bg-cream px-3 py-1.5 text-[12px] outline-none transition focus:border-ink"
            />
            <div className="flex items-center gap-1.5" role="group" aria-label="评论颜色">
              {commentPalette.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`选择颜色 ${c}`}
                  aria-pressed={color === c}
                  className={cn('h-5 w-5 rounded-full border-1.5 transition', color === c ? 'scale-110 border-ink' : 'border-ink/20 hover:border-ink/50')}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="这篇里最戳你的是哪一段？或者，你想反问什么？"
            aria-label="评论内容"
            className="mt-2.5 w-full resize-none rounded-xl border border-ink/15 bg-cream px-3 py-2.5 text-[12.5px] leading-relaxed outline-none transition focus:border-ink"
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1 font-mono text-[9px] text-ink/35">
              <Pencil size={10} /> 仅存本机 · {text.length}/200
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={sending}
              className="btn-ink inline-flex items-center gap-1.5 !py-2 !text-[12px] disabled:opacity-50"
            >
              <Send size={13} /> 留下评论
            </button>
          </div>
        </div>
      </div>

      {/* 列表 */}
      <div className="px-5 pb-5 pt-4">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 bg-paper/50 px-4 py-8 text-center">
            <p className="font-hand text-[18px] text-ink/45">还没有人说话，来做第一个吧。</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {list.map((c) => {
                const isLiked = liked.includes(c.id)
                return (
                  <motion.li
                    key={c.id}
                    layout={!reduce}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.24, ease: 'easeOut' }}
                    className="group flex items-start gap-3 rounded-2xl border border-ink/12 bg-paper px-3.5 py-3 transition-colors hover:border-ink/30"
                  >
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-1.5 border-ink font-display text-[13px] font-extrabold"
                      style={{ background: c.color, color: readableInk(c.color) }}
                      aria-hidden
                    >
                      {c.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-[12.5px] font-bold">{c.name}</span>
                        <span className="font-mono text-[9.5px] text-ink/35">{c.time}</span>
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-ink/70">{c.text}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-1 sm:flex-row sm:gap-1.5">
                      <button
                        type="button"
                        onClick={() => like(c.id)}
                        aria-pressed={isLiked}
                        aria-label="点赞评论"
                        className={cn(
                          'inline-flex min-h-[28px] items-center gap-1 rounded-full border px-2 font-mono text-[10px] transition',
                          isLiked ? 'border-coral bg-coral/15 text-coral' : 'border-ink/15 text-ink/45 hover:border-ink/40 hover:text-ink',
                        )}
                      >
                        <Heart size={11} className={cn(isLiked && 'fill-current')} />
                        {c.likes}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        aria-label="删除评论"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-ink/25 transition hover:bg-coral/10 hover:text-coral"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {node}
    </section>
  )
}
