import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  Bike,
  BookOpen,
  Camera,
  Coffee,
  Download,
  Film,
  Heart,
  Mail,
  MapPin,
  MessageCircle,
  Music,
  Play,
  Plus,
  Quote,
  Rocket,
  Sparkles,
  Trophy,
  Utensils,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProjectModal } from '@/components/ProjectModal'
import { Modal } from '@/components/ui/Modal'
import { CountUp, Marquee, Plate, Reveal, SectionHead } from '@/components/ui/primitives'
import { articleMeta } from '@/data/articles.index'
import { moments, trips } from '@/data/life'
import { awards, figures, focusNow, hobbies, profile, skillGroups, techStack } from '@/data/site'
import { projects } from '@/data/projects'
import type { Project } from '@/data/projects'
import { cn, usePrefersReducedMotion } from '@/lib/utils'
import { personJsonLd, useSeo } from '@/lib/seo'

const colorMap: Record<string, string> = {
  lime: 'rgb(var(--c-lime))',
  coral: 'rgb(var(--c-coral))',
  blue: 'rgb(var(--c-blue))',
  grape: 'rgb(var(--c-grape))',
  rose: 'rgb(var(--c-rose))',
  sky: 'rgb(var(--c-sky))',
  sand: 'rgb(var(--c-surface-2))',
  cream: 'rgb(var(--c-surface))',
}

const hobbyIcons = [Utensils, Bike, Coffee, Camera, Film, BookOpen]

/* -------------------------------- typewriter ------------------------------- */
/** 身份句随机切换的候选短语——每次从「不是当前这条」里随机挑一个，避免连着重复 */
const heroRoles = [
  'AI 应用与智能体开发者',
  'RAG 工程化实践者',
  '把 Agent 做成产品的人',
  '多模态 AI 方向研究生',
  'AI 商业产品创造者',
]

/**
 * 打字机特效：逐字打出 → 停顿 → 逐字删除 → 换下一条随机短语。
 * reduced-motion 下静止显示第一条，不跑逐帧定时器。
 */
function Typewriter({ words }: { words: string[] }) {
  const reduce = usePrefersReducedMotion()
  const [wi, setWi] = useState(0)
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing')

  // 随机挑选下一条（与当前不同）
  const nextWord = () => setWi((cur) => {
    if (words.length <= 1) return cur
    let n = cur
    while (n === cur) n = Math.floor(Math.random() * words.length)
    return n
  })

  useEffect(() => {
    if (reduce) {
      setText(words[0])
      return
    }
    const full = words[wi]
    let timer: number
    if (phase === 'typing') {
      if (text.length < full.length) {
        timer = window.setTimeout(() => setText(full.slice(0, text.length + 1)), 110)
      } else {
        timer = window.setTimeout(() => setPhase('deleting'), 2200)
      }
    } else if (phase === 'deleting') {
      if (text.length > 0) {
        timer = window.setTimeout(() => setText(full.slice(0, text.length - 1)), 45)
      } else {
        nextWord()
        setPhase('typing')
      }
    }
    return () => window.clearTimeout(timer)
  }, [text, phase, wi, words, reduce])

  return (
    <span className="text-coral" aria-label={words.join('，')}>
      <span aria-hidden>{text}</span>
      {!reduce && (
        <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-blink bg-coral align-middle" aria-hidden />
      )}
    </span>
  )
}

/* ---------------------------------- hero ---------------------------------- */
/**
 * 首页第一面（2026 改版）：暖色编辑排版。
 * 状态胶囊 → 描边大字 → 身份句 → 简介 → 双 CTA → 数据行。
 * 仍然只用站点 tokens，所以五套主题、对比度门禁都继续生效；
 * 但不再用边框卡片包住首屏，让内容本身成为视觉主体。
 */
function Hero({ onContact }: { onContact: () => void }) {
  const heroStats = [
    { value: figures.awards, suffix: '+', label: '竞赛 & 奖项' },
    { value: figures.hackathonOnsite2026, suffix: '', label: '线下黑客松' },
    { value: figures.openSourceRepos, suffix: '+', label: '开源项目' },
    { value: figures.products, suffix: '', label: 'AI 商业产品' },
  ]

  return (
    <section id="top" className="relative isolate overflow-hidden pb-8 pt-5 sm:pb-12 sm:pt-7">
      {/* 背景光晕与装饰：全部 aria-hidden，不参与焦点与读屏 */}
      <div className="home-hero-glow pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="pointer-events-none absolute -left-36 -top-32 -z-10 h-[340px] w-[340px] rounded-full border-[10px] border-coral/25 sm:-left-28 sm:h-[440px] sm:w-[440px]" aria-hidden />
      <div className="pointer-events-none absolute -left-24 -top-16 -z-10 hidden h-[240px] w-[240px] rounded-full border-2 border-coral/20 sm:block" aria-hidden />
      <Plus size={26} strokeWidth={2.5} className="pointer-events-none absolute right-[9%] top-10 -z-10 hidden animate-float text-coral/40 sm:block" aria-hidden />
      <Plus size={17} strokeWidth={2.5} className="pointer-events-none absolute bottom-28 right-[20%] -z-10 hidden animate-float text-rose sm:block" style={{ animationDelay: '1.8s' }} aria-hidden />
      <span className="pointer-events-none absolute right-1 top-1/2 -z-10 hidden -translate-y-1/2 rotate-90 font-mono text-[9px] tracking-[0.32em] text-ink/25 xl:block">PORTFOLIO / 2026 — 01</span>

      {/* 左右分栏（≥lg）：左列文字主视觉，右列统计 + QUICK LOOK 紧凑卡；窄屏回退单列居中 */}
      <div className="relative mx-auto grid w-full max-w-3xl items-center gap-8 lg:max-w-6xl lg:grid-cols-[1.15fr_1fr] lg:gap-10">
        <div>
        <Reveal>
          <div className="flex justify-center lg:justify-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-cream/95 px-3.5 py-1.5 shadow-soft">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="text-[11.5px] font-medium text-ink/80">
                正在寻找 AI 应用与智能体开发实习 <span className="text-ink/30">·</span> 可实习 6 个月+
              </span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.06}>
          <h1 className="mt-5 text-center lg:text-left">
            <span className="block text-[clamp(24px,4.2vw,38px)] font-black leading-[1.08] tracking-[-0.04em] text-ink/85">你好，我是</span>
            <span className="mt-1 flex items-baseline justify-center gap-x-3 lg:justify-start">
              <span className="hero-name whitespace-nowrap text-[clamp(36px,6vw,56px)] font-black leading-[1.08] tracking-[-0.05em]">晓叶</span>
              <span aria-hidden className="animate-wiggle text-[clamp(22px,3.4vw,32px)] leading-none">👋</span>
            </span>
          </h1>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-4 text-center text-[clamp(16px,1.8vw,19px)] font-bold text-ink/80 lg:text-left">
            我是一名 <Typewriter words={heroRoles} />
          </p>
          <p className="mx-auto mt-3 max-w-[560px] text-center text-[13px] leading-[1.85] text-ink-soft sm:text-[13.5px] lg:mx-0 lg:text-left">
            陕西科技大学多模态 AI 方向硕士在读，CCF-A 学生一作在投，{figures.products} 款 AI 商业产品上线者，{figures.mainPlatformFollowers} 粉 AI 自媒体博主。信奉「把 Agent 做成产品，把产品做成事业」。
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
            <a href="#projects" className="hero-cta-primary group">
              <Rocket size={16} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              看看我的项目
            </a>
            <button type="button" onClick={onContact} className="hero-cta-secondary">
              <Mail size={15} /> 联系我
            </button>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[9px] tracking-[0.12em] text-ink/40 lg:justify-start">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={10} /> 西安 · 可远程 / 出差
            </span>
            <span className="hidden h-3 w-px bg-ink/15 sm:block" />
            <span>6 个月+ · 5 天/周 · 随时到岗</span>
            <span className="flex items-center gap-3 font-sans text-[10px] tracking-normal">
              <Link to="/work/resume" className="link-underline font-medium text-ink/55 transition hover:text-ink">
                简历 · 一页纸
              </Link>
              <Link to="/me/guestbook" className="link-underline font-medium text-ink/55 transition hover:text-ink">
                留句话
              </Link>
            </span>
          </div>
        </Reveal>
        </div>

        {/* 右列：统计 2×2 紧凑卡 + QUICK LOOK / FOCUS 单卡（移动端回退单列时沿用原 2/4 列规则） */}
        <div className="lg:flex lg:flex-col lg:gap-3">
        {/* 统计卡片：横向 4 列紧凑小卡（移动端 2 列） */}
        <Reveal delay={0.24}>
          <dl className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:mt-0 lg:grid-cols-2">
            {heroStats.map((s) => (
              <div key={s.label} className="rounded-2xl border-1.5 border-ink bg-cream px-3 py-3 text-center shadow-hard-sm">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span className="font-display text-[clamp(22px,2.4vw,28px)] font-extrabold leading-none tracking-[-0.03em]">
                    <CountUp to={s.value} />
                    <span className="text-coral">{s.suffix}</span>
                  </span>
                  <span className="mt-1.5 block text-[10.5px] font-medium text-ink/55">{s.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>

        {/* QUICK LOOK / 2026 + OPEN TO WORK + FOCUS / NOW：合并为单张紧凑小卡 */}
        <Reveal delay={0.3}>
          <div className="mt-3 rounded-2xl border-1.5 border-ink bg-cream p-4 shadow-hard-sm lg:mt-0">
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[9.5px] tracking-[0.2em] text-ink/45">QUICK LOOK / 2026</span>
                <span className="tag bg-lime">
                  <Sparkles size={11} /> OPEN TO WORK
                </span>
              </div>
              <div className="mt-3 border-t border-dashed border-ink/15 pt-3">
                <p className="font-mono text-[9px] tracking-[0.18em] text-ink/40">FOCUS / NOW</p>
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-3">
                  {focusNow.map((f) => (
                    <li key={f.title} className="flex items-center gap-2 rounded-xl border border-ink/12 bg-paper px-2.5 py-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px] font-medium">{f.title}</span>
                        <span className="block truncate font-mono text-[9px] text-ink/40">{f.meta}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------- carousel -------------------------------- */
const pad2 = (x: number) => String(x).padStart(2, '0')

function ProjectCarousel({ onOpen, paused }: { onOpen: (p: Project) => void; paused?: boolean }) {
  const list = projects
  const n = list.length
  const [index, setIndex] = useState(0)
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const reduce = usePrefersReducedMotion()
  const hold = hover || focus || !!paused

  const go = (next: number) => setIndex(((next % n) + n) % n)

  // 自动切换（每 2s 前进一张）；悬停 / 聚焦 / 弹窗打开 / reduced-motion 时暂停
  useEffect(() => {
    if (hold || reduce) return
    const t = window.setInterval(() => setIndex((i) => (i + 1) % n), 2000)
    return () => window.clearInterval(t)
  }, [hold, reduce, n])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(index - 1)
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(index + 1)
    }
  }

  // 环形最短偏移：rel 0=主卡，±1=相邻露出，±2=更外层
  const relOf = (i: number) => {
    const d = (((i - index) % n) + n) % n
    return d > n / 2 ? d - n : d
  }

  return (
    <section id="projects" className="scroll-mt-28">
      <div className="relative">
        {/* 标题行独立于卡片：不再用带标题的边框把整组卡片包起来 */}
        <div className="relative mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 min-w-9 items-center justify-center rounded-lg border-1.5 border-ink bg-lime px-2 font-mono text-[11px] font-bold">
              02
            </span>
            <div>
              <h2 className="text-[clamp(24px,3.4vw,38px)] font-extrabold leading-none">精选项目</h2>
              <p className="mt-1.5 font-mono text-[9px] tracking-[0.22em] text-ink/40">FEATURED PROJECTS / BUILD LOG</p>
            </div>
          </div>
          {/* 桌面：PREV / 01 07 / NEXT 三段式；移动端简化为下方指示点 */}
          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={() => go(index - 1)}
              aria-label="上一个项目"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/25 text-ink transition hover:border-ink hover:bg-lime hover:text-ink"
            >
              <ArrowLeft size={14} />
            </button>
            <span className="min-w-[52px] text-center font-mono text-[10px] tracking-[0.14em] text-ink/55">
              {pad2(index + 1)} / {pad2(n)}
            </span>
            <button
              onClick={() => go(index + 1)}
              aria-label="下一个项目"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/25 text-ink transition hover:border-ink hover:bg-lime hover:text-ink"
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* 卡片轨道 */}
        <div
          className="relative outline-none"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="group"
          aria-roledescription="轮播"
          aria-label="精选项目，可用左右方向键切换"
        >
          {/* 足够的高度让绝对定位的卡片不被裁切 */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[min(680px,88%)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl transition-colors duration-500"
            style={{ background: `color-mix(in srgb, ${list[index].accent} 60%, transparent)` }}
          />
          <div className="relative h-[560px] min-[430px]:h-[540px] sm:h-[530px]">
            {list.map((p, i) => {
              const rel = relOf(i)
              const ar = Math.abs(rel)
              const isMain = rel === 0
              // 主卡居中，相邻卡在两侧露出并压暗
              return (
                <div
                  key={p.id}
                  className="absolute inset-0 flex items-center justify-center px-4 sm:px-6"
                  style={{
                    zIndex: 30 - ar,
                    pointerEvents: ar <= 1 ? 'auto' : 'none',
                    visibility: ar <= 1 ? 'visible' : 'hidden',
                  }}
                  aria-hidden={!isMain}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      x: `${rel * 100}%`,
                      scale: isMain ? 1 : 0.88,
                      opacity: isMain ? 1 : 0.38,
                    }}
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
                    drag={isMain && !reduce ? 'x' : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.14}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -60) go(index + 1)
                      if (info.offset.x > 60) go(index - 1)
                    }}
                    onClick={() => (isMain ? onOpen(p) : go(i))}
                    className={cn(
                      'w-full max-w-[640px] cursor-pointer select-none',
                      isMain && 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime',
                    )}
                  >
                    <div
                      className="relative overflow-hidden rounded-[22px] border border-ink/12 bg-cream/55 p-5 text-ink backdrop-blur-xl sm:p-7"
                      style={{
                        // 阴影统一染成项目主色的柔光，不用灰色投影；两侧卡更轻
                        boxShadow: isMain
                          ? `0 0 0 1px color-mix(in srgb, ${p.accent} 45%, transparent), 0 30px 64px -34px color-mix(in srgb, ${p.accent} 50%, transparent)`
                          : `0 24px 56px -40px color-mix(in srgb, ${p.accent} 40%, transparent)`,
                      }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-[0.12]"
                        style={{ background: `radial-gradient(120% 100% at 100% 0%, ${p.accent} 0%, transparent 62%)` }}
                      />
                      <div className="pointer-events-none absolute inset-0 grid-paper opacity-[0.05]" />

                      <div className="relative flex flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] tracking-[0.18em] text-ink/45">
                            {pad2(i + 1)} / {pad2(n)} · {p.role}
                          </span>
                          {p.award && (
                            <span className="inline-flex max-w-[62%] items-center gap-1 truncate rounded-full border border-ink/15 bg-lime/60 px-2 py-0.5 text-[9.5px] font-medium text-ink">
                              <Award size={9} className="shrink-0" />
                              <span className="truncate">{p.award}</span>
                            </span>
                          )}
                        </div>
                        {/* 封面：Plate 主题图形，随主题色 / 项目类型变化 */}
                        <div className="relative mt-3.5 h-28 overflow-hidden rounded-[14px] border border-ink/12 sm:h-36">
                          <Plate motif={p.motif} accent={p.accent} className="absolute inset-0" />
                          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-cream/70 via-transparent to-transparent" />
                          <span className="absolute left-2.5 top-2.5 rounded-full border border-ink/15 bg-cream/85 px-2 py-0.5 font-mono text-[8.5px] tracking-[0.14em] text-ink/65 backdrop-blur-sm">
                            COVER / {p.category}
                          </span>
                          <span className="absolute inset-x-3 bottom-2.5 flex items-end justify-between gap-2">
                            <span className="truncate font-mono text-[9px] tracking-[0.16em] text-ink/75">{p.en}</span>
                            <span className="shrink-0 font-mono text-[9px] text-ink/55">{p.period}</span>
                          </span>
                        </div>
                        {/* 标题行：项目名称 + 「立即体验」胶囊按钮（有 demo 链接时显示，点击直达体验页） */}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                          <h3 className="text-[clamp(20px,2.6vw,27px)] font-extrabold leading-[1.12]">{p.title}</h3>
                          {p.demo && (
                            <a
                              href={p.demo}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                // 卡片本体绑了 click 开弹窗，这里阻断冒泡，只跳转
                                e.stopPropagation()
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              draggable={false}
                              className="inline-flex shrink-0 items-center gap-1 rounded-full border-1.5 border-ink bg-lime px-3 py-1 text-[11.5px] font-semibold text-ink shadow-hard-sm transition hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0"
                              aria-label={`立即体验 ${p.title}`}
                            >
                              立即体验
                              <ArrowUpRight size={12} />
                            </a>
                          )}
                        </div>
                        <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-ink/60">{p.summary}</p>

                        <div className="mt-5 grid grid-cols-3 gap-3">
                          {p.metrics.slice(0, 3).map((m) => (
                            <div key={m.label}>
                              <p className="break-words text-[clamp(16px,2vw,22px)] font-extrabold leading-tight text-coral">{m.value}</p>
                              <span className="mt-1 block h-[3px] w-6 rounded-full" style={{ background: p.accent }} />
                              <p className="mt-1 truncate font-mono text-[9px] tracking-wide text-ink/45">{m.label}</p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-5 flex flex-wrap gap-1.5">
                          {p.tags.slice(0, 3).map((t) => (
                            <span key={t} className="rounded-full border border-ink/12 bg-cream/50 px-2 py-0.5 font-mono text-[9.5px] text-ink/60">
                              {t}
                            </span>
                          ))}
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-2 border-t border-ink/10 pt-4">
                          <span className="font-mono text-[9px] tracking-wide text-ink/45">{p.period}</span>
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] text-coral">
                            ONLINE · {p.category} <ArrowUpRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 移动端指示点 */}
        <div className="relative mt-2 flex items-center justify-center gap-1.5 py-3 sm:hidden">
          {list.map((item, i) => (
            <button key={item.id} onClick={() => go(i)} className="py-2" aria-label={`切换到 ${item.title}`}>
              <span className={cn('block h-1.5 rounded-full transition-all duration-300', i === index ? 'w-6 bg-lime' : 'w-1.5 bg-ink/25')} />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------- skills --------------------------------- */
/** 参照「运行时能力栈」设计：左侧叙事 + 技术栈 + FOCUS/NOW，右侧可展开的能力模块列表。
 *  颜色一律走主题 CSS 变量（colorMap / tailwind 主题类），5 套主题自动适配。 */
function SkillsBento() {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const reduce = usePrefersReducedMotion()

  return (
    <section id="skills" className="scroll-mt-28">
      <SectionHead
        index="01"
        title="技能图谱"
        en="MODULES"
        desc="不是罗列关键词，是每个方向都有一两个能拿出来的结果。"
        action={<span className="font-mono text-[9.5px] tracking-[0.14em] text-ink/45">点击模块展开，查看我实际在用的能力 →</span>}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-12">
        {/* 左：一句话能力回路 + 技术栈标签墙 + FOCUS/NOW */}
        <div className="min-w-0">
          <p className="font-display text-[clamp(24px,3.4vw,36px)] font-extrabold leading-[1.22]">
            一套从<span className="marker">模型原理</span>
            <br />
            到<span className="text-coral">交付上线</span>的完整回路。
          </p>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {techStack.map((t) => (
              <span
                key={t}
                className="rounded-md border border-ink/20 bg-cream px-2.5 py-1 font-mono text-[10.5px] text-ink/70 transition-colors hover:border-ink hover:bg-lime/40 hover:text-ink"
              >
                {t}
              </span>
            ))}
          </div>

          <p className="mt-4 flex items-center gap-2 font-mono text-[9px] tracking-[0.14em] text-ink/40">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-lime ring-1 ring-ink/20" />
            持续迭代中 · last update 2026.10
          </p>

          <div className="mt-7 overflow-hidden rounded-2xl border-1.5 border-ink bg-cream shadow-hard-sm">
            <div className="flex items-center justify-between border-b border-ink/12 bg-sand/70 px-4 py-2.5">
              <span className="font-mono text-[9.5px] tracking-[0.2em] text-ink/55">FOCUS / NOW</span>
              <span className="font-mono text-[9.5px] tracking-[0.2em] text-ink/40">{pad2(focusNow.length)} ITEMS</span>
            </div>
            {focusNow.map((f, i) => (
              <div key={f.title} className={cn('flex items-center gap-3 px-4 py-3 transition-colors hover:bg-lime/25', i > 0 && 'border-t border-ink/10')}>
                <span className="shrink-0 font-mono text-[10px] font-bold text-coral">{pad2(i + 1)}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold">{f.title}</span>
                <span className="shrink-0 font-mono text-[9.5px] tracking-wide text-ink/45">{f.meta}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 右：能力模块手风琴，展开后看描述 / 关键词 / 可验证结果 */}
        <div className="min-w-0 border-t border-ink/12">
          {skillGroups.map((s, i) => {
            const color = colorMap[s.color]
            const isOpen = openKey === s.key
            return (
              <div key={s.key} className="border-b border-ink/12">
                <button
                  onClick={() => setOpenKey(isOpen ? null : s.key)}
                  aria-expanded={isOpen}
                  className="group flex w-full items-center gap-3 py-4 text-left"
                >
                  <span className={cn('w-6 shrink-0 font-mono text-[10px] transition-colors', isOpen ? 'text-ink/60' : 'text-ink/35 group-hover:text-ink/60')}>
                    {pad2(i + 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[clamp(15px,1.8vw,18px)] font-extrabold leading-tight transition-colors" style={isOpen ? { color } : undefined}>
                      {s.title}
                    </span>
                    <span className="mt-1 block truncate font-mono text-[9.5px] tracking-[0.1em] text-ink/45">{(s.keywords ?? []).slice(0, 3).join(' · ')}</span>
                  </span>
                  {/* 熟练度渐变条 */}
                  <span className="hidden h-1 w-24 shrink-0 overflow-hidden rounded-full bg-ink/10 sm:block" title={`熟练度 ${s.level}%`}>
                    <span className="block h-full rounded-full" style={{ width: `${s.level}%`, background: `linear-gradient(90deg, ${color}, rgb(var(--c-coral)))` }} />
                  </span>
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-ink/50 transition-all duration-300',
                      isOpen ? 'rotate-45 border-ink bg-lime text-ink' : 'border-ink/20 group-hover:border-ink/50',
                    )}
                    aria-hidden
                  >
                    <Plus size={14} />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pb-5 pl-9 pr-1">
                        <p className="text-[12.5px] leading-relaxed text-ink-soft">{s.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(s.keywords ?? []).map((k) => (
                            <span
                              key={k}
                              className="rounded-md border px-2 py-0.5 font-mono text-[9.5px] font-medium"
                              style={{
                                borderColor: `color-mix(in srgb, ${color} 55%, transparent)`,
                                color: `color-mix(in srgb, ${color} 75%, rgb(var(--c-ink)))`,
                                background: `color-mix(in srgb, ${color} 12%, transparent)`,
                              }}
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3.5 space-y-1.5 border-t border-dashed border-ink/15 pt-3">
                          {s.proofs.map((p) => (
                            <div key={p.label} className="flex items-baseline justify-between gap-3">
                              <span className="min-w-0 truncate text-[11px] text-ink/60">{p.label}</span>
                              <span className="shrink-0 font-display text-[13.5px] font-extrabold leading-none" style={{ color: `color-mix(in srgb, ${color} 70%, rgb(var(--c-ink)))` }}>
                                {p.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}

          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] tracking-[0.12em] text-ink/40">
            每一条结果都能在下面的项目、简历或论文里找到出处
            <a href="#projects" className="inline-flex min-h-[24px] items-center gap-1 rounded-full px-1.5 text-ink/55 transition hover:bg-lime/25 hover:text-ink">
              看结果落在哪 <ArrowDownRight size={11} />
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------- honors --------------------------------- */
function Honors() {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const reduce = usePrefersReducedMotion()
  const filters = ['all', '国赛', '省赛', '黑客松', '决赛', '实践']
  const shown = filter === 'all' ? awards.slice(0, 7) : awards.filter((a) => a.type === filter)
  const record = [
    { value: figures.hackathonOnsite2026, suffix: '场', label: '黑客松现场' },
    { value: figures.finals2026, suffix: '次', label: '进决赛' },
    { value: 5, suffix: '次', label: '上台路演' },
    { value: figures.awards, suffix: '项', label: '奖项总数' },
  ]
  return (
    <section id="awards" className="scroll-mt-28">
      <SectionHead
        index="03"
        title="竞赛荣誉"
        en="AWARDS"
        desc={`2026 年跑了 ${figures.hackathonOnsite2026} 场黑客松，${figures.finals2026} 次进决赛。奖项放在这里，作品在上面。`}
        action={
          <button onClick={() => setOpen(true)} className="btn !py-2 !text-[12px]">
            全部 {figures.awards} 项 <ArrowUpRight size={13} />
          </button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="order-2 min-w-0 lg:order-2 lg:col-span-8">
          {/* 轻量分段控件：按类型筛选 */}
          <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="奖项筛选">
            {filters.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  'inline-flex min-h-[32px] items-center rounded-full border px-3 text-[11.5px] font-medium transition-colors',
                  filter === f ? 'border-ink bg-lime text-ink' : 'border-ink/15 bg-paper text-ink/55 hover:border-ink/40 hover:text-ink',
                )}
              >
                {f === 'all' ? '全部' : f}
              </button>
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl border-1.5 border-ink bg-cream">
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.map((a, i) => (
                <motion.div
                  key={a.name}
                  layout={!reduce}
                  initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-lime/30',
                    i !== 0 && 'border-t border-ink/10',
                  )}
                >
                  <span className="w-9 shrink-0 font-mono text-[9.5px] text-ink/35 transition group-hover:text-ink/60">{a.year}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium">{a.name}</span>
                    <span className="mt-0.5 block text-[10.5px] text-ink/45">{a.rank}</span>
                  </span>
                  <span className="hidden shrink-0 rounded-full border border-ink/20 px-2 py-0.5 font-mono text-[9px] text-ink/50 transition group-hover:border-ink group-hover:bg-ink group-hover:text-lime sm:block">
                    {a.type}
                  </span>
                  <ArrowUpRight size={13} className="shrink-0 text-ink/20 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="order-1 lg:order-1 lg:col-span-4">
          {/* 两卡等高：左侧栏总高由右侧奖项列表撑开，1fr/1fr 均分避免一高一矮 */}
          <div className="grid h-full grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
            {/* 年度战绩卡：深色底 + 计数动画，与其他区块样式区分 */}
            <div className="relative flex flex-col overflow-hidden rounded-2xl border-1.5 border-ink bg-ink p-5 text-paper">
              <div className="absolute inset-0 halftone opacity-[0.14]" />
              <div className="relative flex flex-1 flex-col justify-center">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[9px] tracking-[0.2em] text-lime">ANNUAL RECORD · 2026</p>
                  <Trophy size={13} className="text-lime" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                  {record.map((r) => (
                    <div key={r.label}>
                      <div className="flex items-baseline gap-0.5 font-display text-[26px] font-extrabold leading-none text-lime">
                        <CountUp to={r.value} />
                        <span className="text-[13px] font-semibold">{r.suffix}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-paper/70">{r.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative flex flex-col justify-center overflow-hidden rounded-2xl border-1.5 border-ink bg-lime p-5">
              <Quote size={22} />
              <p className="mt-2 font-display text-[19px] font-extrabold leading-snug">
                黑客松不是比赛，
                <br />
                是 48 小时的
                <br />
                真实产品课。
              </p>
              <p className="mt-3 text-[11px] leading-relaxed text-ink/60">{figures.finals2026} 场决赛、5 次上台路演、3 个评委追问：你的付费模型怎么走通？</p>
              <div className="absolute -bottom-3 -right-2 font-display text-[64px] font-extrabold text-ink/10">2026</div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="竞赛荣誉全览" kicker="16 AWARDS · 2025 — 2026">
        <div className="divide-y divide-ink/10 px-5">
          {awards.map((a) => (
            <div key={a.name} className="flex items-center gap-3 py-2.5">
              <span className="w-10 shrink-0 font-mono text-[9.5px] text-ink/35">{a.year}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium">{a.name}</span>
                <span className="text-[10.5px] text-ink/45">{a.rank}</span>
              </span>
              <span className="shrink-0 rounded-full bg-lime/50 px-2 py-0.5 font-mono text-[9px]">{a.type}</span>
            </div>
          ))}
        </div>
      </Modal>
    </section>
  )
}

/* ------------------------------ scene snapshots ----------------------------- */
const shotMotifs = ['orbit', 'wave', 'rings', 'bars', 'stack', 'grid'] as const
const shotRotations = [-1.4, 1.2, -0.8, 1.6, -1.1, 0.9]

type SceneShot = {
  id: string
  kind: string
  caption: string
  meta: string
  label: string
  accent: string
  motif: (typeof shotMotifs)[number]
  to: string
  rotate: number
}

/** 复用朋友圈数据：上方一排向左滚动 */
const momentShots: SceneShot[] = moments.map((m, i) => ({
  id: `snap-${m.id}`,
  kind: '朋友圈',
  caption: m.text,
  meta: [m.time, m.place].filter(Boolean).join(' · '),
  label: m.media[0]?.label ?? 'moment-log',
  accent: m.accent,
  motif: shotMotifs[i % shotMotifs.length],
  to: '/life/moments',
  rotate: shotRotations[i % shotRotations.length],
}))

/** 复用旅拍数据：下方一排向右滚动 */
const tripShots: SceneShot[] = trips.slice(0, 7).map((t, i) => ({
  id: `trip-${t.id}`,
  kind: t.tag,
  caption: t.note,
  meta: `${t.city} · ${t.date}`,
  label: `${t.city} / ${t.spot.split(' · ')[0]}`,
  accent: t.color,
  motif: shotMotifs[(i + 3) % shotMotifs.length],
  to: '/life/travel',
  rotate: shotRotations[(i + 2) % shotRotations.length],
}))

function ShotCard({ shot, duplicate = false }: { shot: SceneShot; duplicate?: boolean }) {
  const cardClass = 'flex w-[206px] shrink-0 flex-col rounded-[16px] border-1.5 border-ink bg-cream p-2 shadow-hard-sm sm:w-[236px]'

  const content = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[11px] border border-ink/15">
        <Plate motif={shot.motif} accent={shot.accent} className="absolute inset-0" />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/20 via-transparent to-transparent" />
        <span className="absolute left-2 top-2 rounded-full border border-ink/25 bg-cream/90 px-1.5 py-0.5 font-mono text-[8.5px] tracking-wide text-ink/65">
          {shot.kind}
        </span>
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-md border border-ink/25 bg-cream/90">
          <Camera size={10} />
        </span>
        <span className="absolute bottom-2 left-2 max-w-[82%] truncate rounded border border-ink/20 bg-cream/90 px-1.5 py-0.5 font-mono text-[8.5px] text-ink/60">
          {shot.label}
        </span>
      </div>
      <div className="px-1 pb-0.5 pt-2">
        <p className="line-clamp-2 text-[11px] leading-snug text-ink/75">{shot.caption}</p>
        <p className="mt-1 flex items-center gap-1 font-mono text-[8.5px] tracking-wide text-ink/40">
          <MapPin size={8} className="shrink-0" />
          <span className="truncate">{shot.meta}</span>
        </p>
      </div>
    </>
  )

  if (duplicate) {
    return (
      <div aria-hidden className={cn(cardClass, 'pointer-events-none')} style={{ rotate: `${shot.rotate}deg` }}>
        {content}
      </div>
    )
  }

  return (
    <Link
      to={shot.to}
      aria-label={`${shot.kind}：${shot.caption}`}
      className={cn(
        cardClass,
        'group transition-all duration-300 hover:-translate-y-1 hover:shadow-hard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
      )}
      style={{ rotate: `${shot.rotate}deg` }}
    >
      {content}
    </Link>
  )
}

function SceneRow({
  shots,
  reverse = false,
  speed = 50,
  label,
}: {
  shots: SceneShot[]
  reverse?: boolean
  speed?: number
  label: string
}) {
  return (
    <div className="group relative overflow-hidden py-1" data-marquee role="group" aria-label={label}>
      <div
        className="flex w-max animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
        style={{ animationDuration: `${speed}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
      >
        <div className="flex shrink-0 gap-3 pr-3">
          {shots.map((s) => (
            <ShotCard key={s.id} shot={s} />
          ))}
        </div>
        <div className="flex shrink-0 gap-3 pr-3">
          {shots.map((s) => (
            <ShotCard key={`dup-${s.id}`} shot={s} duplicate />
          ))}
        </div>
      </div>
      <span className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-paper to-transparent sm:w-16" />
      <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-paper to-transparent sm:w-16" />
    </div>
  )
}

function SceneWall() {
  return (
    <section id="scenes" className="scroll-mt-28">
      <SectionHead
        title="现场瞬间"
        en="SNAP SHOTS"
        desc="手机相册里没整理的那些：凌晨的实验室、决赛的展台、路过的落日。"
        action={
          <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] tracking-[0.14em] text-ink/40">
            <span className="flex items-center gap-1">
              <ArrowRight size={11} className="-scale-x-100" /> 朋友圈
            </span>
            <span className="h-3 w-px bg-ink/15" />
            <span className="flex items-center gap-1">
              <ArrowRight size={11} /> 旅拍
            </span>
            <Link to="/life/moments" className="ml-1 inline-flex min-h-[32px] items-center rounded-full px-2 text-ink/55 transition hover:bg-lime/25 hover:text-ink">
              进入生活频道 →
            </Link>
          </div>
        }
      />
      <div className="space-y-2.5">
        <SceneRow shots={momentShots} label="朋友圈现场，向左连续滚动" speed={52} />
        <SceneRow shots={tripShots} label="旅拍现场，向右连续滚动" speed={58} reverse />
      </div>
    </section>
  )
}

/* ------------------------------- life teaser ------------------------------- */
function LifeTeaser() {
  const blocks = [
    { to: '/life/moments', title: '朋友圈', desc: '项目的坑、比赛的现场、路上的风景。', color: 'rgb(var(--c-lime))', icon: MessageCircle, tag: '默认入口' },
    { to: '/life/travel', title: '旅拍相册', desc: '地图上钉了 11 个点，每个都有故事。', color: 'rgb(var(--c-sky))', icon: MapPin, tag: '11 座城市' },
    { to: '/life/love', title: '恋爱记录', desc: '1240 天，86 次见面，11 座城市。', color: 'rgb(var(--c-rose))', icon: Heart, tag: '异地第 4 年' },
    { to: '/life/music', title: '音乐盒', desc: '写代码时在听什么，都在这。', color: 'rgb(var(--c-coral))', icon: Music, tag: '6 张歌单' },
  ]
  return (
    <section>
      <SectionHead index="04" title="生活切片" en="OFF SCREEN" desc="工作之外的那部分，才让这个网站像个人。" action={<Link to="/life/moments" className="inline-flex min-h-[32px] items-center rounded-full px-2 font-mono text-[10px] tracking-widest text-ink/45 transition hover:bg-lime/25 hover:text-ink">进入生活频道 →</Link>} />
      {/* 移动端一行 2 个：四张卡在一屏内就能扫完 */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {blocks.map((b, i) => {
          const Icon = b.icon
          return (
            <Reveal key={b.to} delay={i * 0.06}>
              <Link
                to={b.to}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-1.5 border-ink bg-cream p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-hard sm:p-5"
              >
                <div
                  className="absolute -right-6 -top-6 h-16 w-16 rounded-full border-1.5 border-ink/20 transition-transform duration-500 group-hover:scale-125 sm:-right-8 sm:-top-8 sm:h-24 sm:w-24"
                  style={{ background: b.color }}
                />
                <div className="relative flex items-center justify-between gap-1">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-1.5 border-ink bg-paper sm:h-9 sm:w-9">
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 truncate font-mono text-[8px] tracking-wide text-ink/40 sm:text-[9px] sm:tracking-widest">
                    {b.tag}
                  </span>
                </div>
                <h3 className="relative mt-2.5 text-[13.5px] font-extrabold sm:mt-4 sm:text-[17px]">{b.title}</h3>
                <p className="relative mt-1 text-[10px] leading-relaxed text-ink/50 sm:mt-1.5 sm:text-[11.5px]">{b.desc}</p>
                <span className="relative mt-2.5 inline-flex items-center gap-1 font-mono text-[9px] tracking-wide text-ink/45 group-hover:text-ink sm:mt-4 sm:text-[9.5px] sm:tracking-widest">
                  去看看 <ArrowUpRight size={11} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </Reveal>
          )
        })}
      </div>

      {/* hobbies + latest articles */}
      <div className="mt-3 grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="relative h-full overflow-hidden rounded-2xl border-1.5 border-ink grid-paper bg-paper p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-extrabold">兴趣爱好</h3>
              <span className="font-hand text-[16px] text-ink/45">周末去哪儿</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {hobbies.map((h, i) => {
                const Icon = hobbyIcons[i % hobbyIcons.length]
                return (
                  <div
                    key={h.title}
                    className="group relative rounded-lg border-1.5 border-ink bg-cream p-2 text-center transition-transform hover:-translate-y-1 hover:rotate-0"
                    style={{ transform: `rotate(${h.rotate}deg)` }}
                  >
                    <div className="flex h-12 items-center justify-center rounded-md" style={{ background: `color-mix(in srgb, ${colorMap[h.color]} 50%, transparent)` }}>
                      <Icon size={18} />
                    </div>
                    <p className="mt-1.5 text-[10.5px] font-semibold leading-tight">{h.title}</p>
                    <p className="font-hand text-[12px] leading-tight text-ink/45">{h.note}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="h-full rounded-2xl border-1.5 border-ink bg-cream p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-[15px] font-extrabold">
                <BookOpen size={15} /> 最近更新
              </h3>
              <Link to="/learn" className="flex items-center gap-1 font-mono text-[9.5px] tracking-widest text-ink/45 hover:text-ink">
                知识库 <ArrowRight size={11} />
              </Link>
            </div>
            <div className="mt-3">
              {articleMeta.slice(0, 4).map((a, i) => (
                <Link
                  key={a.id}
                  to={`/learn/${a.id}`}
                  className={cn('group flex items-center gap-3 py-2.5 transition-colors hover:bg-lime/20', i !== 0 && 'border-t border-dashed border-ink/12')}
                >
                  <span className="font-mono text-[9px] text-ink/30">0{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium group-hover:underline">{a.title}</span>
                    <span className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-ink/40">
                      <span>{a.date}</span>
                      <span className="h-0.5 w-0.5 rounded-full bg-ink/30" />
                      <span>{a.readMin} min</span>
                      <span className="hidden sm:inline">· {a.category}</span>
                    </span>
                  </span>
                  <ArrowUpRight size={13} className="shrink-0 text-ink/25 transition group-hover:text-ink" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------- CTA ----------------------------------- */
function HomeCTA() {
  return (
    <section className="relative mt-16 overflow-hidden rounded-[26px] border-1.5 border-ink bg-ink px-6 py-10 text-paper sm:px-10">
      <div className="absolute inset-0 halftone opacity-[0.15]" />
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-lime/20 blur-2xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-8">
        <div>
          <p className="font-mono text-[9.5px] tracking-[0.22em] text-lime">NEXT STEP</p>
          <h2 className="mt-3 max-w-xl font-display text-[clamp(26px,4.6vw,46px)] font-extrabold leading-[1.02]">
            把 Agent 做成产品，
            <br />
            把产品做成事业。
          </h2>
          <p className="mt-4 max-w-lg text-[13px] leading-relaxed text-paper/60">
            研二在读，可以 6 个月以上、每周 5 天，随时到岗。接受加班，也接受被质疑方案——只要最后东西能跑起来。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:w-64">
          <a href={`mailto:${profile.email}`} className="flex items-center justify-between gap-3 rounded-xl border border-paper/25 bg-paper px-4 py-3 text-[13px] font-semibold text-ink transition hover:bg-lime">
            <span className="flex items-center gap-2">
              <Mail size={14} /> {profile.email}
            </span>
            <ArrowUpRight size={14} />
          </a>
          <Link to="/work/resume" className="flex items-center justify-between gap-3 rounded-xl border border-paper/25 px-4 py-3 text-[13px] transition hover:border-lime hover:text-lime">
            <span className="flex items-center gap-2">
              <Download size={14} /> 查看完整简历
            </span>
            <ArrowRight size={14} />
          </Link>
          <Link to="/me/guestbook" className="flex items-center justify-between gap-3 rounded-xl border border-paper/25 px-4 py-3 text-[13px] transition hover:border-lime hover:text-lime">
            <span className="flex items-center gap-2">
              <Play size={14} /> 在弹幕墙留一句
            </span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      <div className="relative mt-8 flex items-center gap-3 border-t border-paper/15 pt-4 font-mono text-[9.5px] text-paper/40">
        <span>WYX.SPACE</span>
        <span className="h-px flex-1 bg-paper/15" />
        <span>UPDATED 2026.10.29</span>
      </div>
    </section>
  )
}

/* ---------------------------------- page ---------------------------------- */
export default function Home() {
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [cardOpen, setCardOpen] = useState(false)

  useSeo({
    title: '晓叶 · WYX.SPACE',
    description: 'AI 全栈 / 智能体开发。把想法做成能上线的东西 —— 项目、学习笔记、生活碎片与成长时间轴。',
    path: '/',
    jsonLd: personJsonLd(),
  })

  return (
    <div className="shell">
      <Hero onContact={() => setCardOpen(true)} />

      {/* 奖项跑马灯：负 margin 抵消 shell 左右 gutter，整行占满视口宽度 */}
      <div className="relative my-10 mx-[calc(50%_-_50vw)] overflow-hidden border-y-1.5 border-ink bg-lime py-2.5">
        <Marquee
          speed={32}
          items={awards.slice(0, 8).map((a) => (
            <span className="flex items-center gap-2 text-[13px] font-semibold">
              <Award size={13} />
              {a.name}
              <span className="text-ink/50">{a.rank}</span>
            </span>
          ))}
        />
        <span className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-lime to-transparent" />
        <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-lime to-transparent" />
      </div>

      <section className="space-y-14 pb-6">
        <SkillsBento />
        <ProjectCarousel onOpen={setActiveProject} paused={!!activeProject} />
        <Honors />
        <SceneWall />
        <LifeTeaser />
        <HomeCTA />
      </section>

      <ProjectModal project={activeProject} onClose={() => setActiveProject(null)} />

      {/* name card modal */}
      <Modal open={cardOpen} onClose={() => setCardOpen(false)} bare className="max-w-md">
        <div className="relative overflow-hidden rounded-[26px]">
          <div className="absolute inset-0 halftone opacity-20" />
          <div className="relative bg-lime px-6 pb-5 pt-7">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[9px] tracking-[0.22em] text-ink/50">PERSONAL CARD / 2026</p>
                <h3 className="mt-2 text-[30px] font-extrabold leading-none">晓叶</h3>
                <p className="mt-1.5 font-mono text-[10px] tracking-[0.18em] text-ink/55">WEI YUNXIAO · AI FULLSTACK</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-1.5 border-ink bg-cream font-display text-xl font-extrabold">
                魏
              </div>
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-ink/75">
              信息与通信工程硕士（多模态 AI），7 款 AI 付费产品作者，2.3w 粉 AI 内容创作者。正在找 AI 全栈 / 智能体开发实习。
            </p>
          </div>
          <div className="relative bg-cream px-6 py-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['年龄', '24 岁'],
                ['家乡', '重庆万州'],
                ['学历', '硕士在读 · 研二'],
                ['到岗', '随时 · 6 个月+'],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="font-mono text-[9.5px] tracking-[0.16em] text-ink/35">{k}</p>
                  <p className="mt-0.5 text-[12px] font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 border-t border-dashed border-ink/20 pt-3.5 text-[11.5px]">
              <p className="flex items-center gap-2">
                <Mail size={12} className="text-ink/40" /> {profile.email}
              </p>
              <p className="flex items-center gap-2">
                <MessageCircle size={12} className="text-ink/40" /> 微信 {profile.wechat} · 电话 {profile.phone}
              </p>
              <p className="flex items-center gap-2">
                <MapPin size={12} className="text-ink/40" /> 西安 · 可接受远程 / 出差
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <a href={`mailto:${profile.email}`} className="btn-ink flex-1 !py-2 !text-[12px]">
                发邮件
              </a>
              <Link to="/me" onClick={() => setCardOpen(false)} className="btn flex-1 !py-2 !text-[12px]">
                了解更多
              </Link>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
