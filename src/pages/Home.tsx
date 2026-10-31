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
  GraduationCap,
  Heart,
  Mail,
  MapPin,
  MessageCircle,
  Music,
  Play,
  Quote,
  Sparkles,
  Star,
  Trophy,
  Utensils,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProjectModal } from '@/components/ProjectModal'
import { SmartImage } from '@/components/SmartImage'
import { Modal } from '@/components/ui/Modal'
import { CountUp, Marquee, Plate, Reveal, SectionHead, Sticker, Tilt } from '@/components/ui/primitives'
import { articleMeta } from '@/data/articles.index'
import { moments, trips } from '@/data/life'
import { lookupMedia } from '@/data/media'
import { awards, figures, hobbies, profile, skillGroups, stats } from '@/data/site'
import { featuredProjects, projects } from '@/data/projects'
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

/* -------------------------------- rotating -------------------------------- */
function RotatingBadge({ text = 'OPEN TO WORK · AI FULLSTACK · ', size = 106, accent = 'rgb(var(--c-ink))' }: { text?: string; size?: number; accent?: string }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full animate-spin-slow">
        <defs>
          <path id="circlePath" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
        </defs>
        <text fill={accent} fontSize="8.6" letterSpacing="2.4" fontFamily="'JetBrains Mono', monospace">
          <textPath href="#circlePath">{text.repeat(2)}</textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-1.5 border-ink bg-lime">
          <Sparkles size={16} />
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------- hero ---------------------------------- */
function Hero({ onOpenCard }: { onOpenCard: () => void }) {
  return (
    <section id="top" className="relative pb-10 pt-2 sm:pb-14 sm:pt-6">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-lime/25 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 top-0 h-60 w-60 rounded-full bg-rose/20 blur-3xl" />

      <Reveal>
        <div className="relative overflow-hidden rounded-[28px] border-1.5 border-ink bg-cream shadow-hard">
          <div className="pointer-events-none absolute inset-0 grid-paper opacity-60" />

          {/* 顶部状态条 */}
          <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-ink/15 bg-paper/70 px-4 py-2.5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tag bg-ink text-paper">
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-lime" /> 现在可实习
              </span>
              <span className="tag">
                <MapPin size={11} /> 西安 · 陕西科技大学
              </span>
              <span className="tag">
                <GraduationCap size={11} /> 研二 · 2028 届
              </span>
            </div>
            <span className="font-mono text-[9px] tracking-[0.2em] text-ink/40">PORTFOLIO / 2026 — 01</span>
          </div>

          <div className="relative grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            {/* 左：主叙事 */}
            <div className="relative min-w-0 px-5 pb-7 pt-7 sm:px-8 sm:pb-9 sm:pt-9">
              <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-lime/20 blur-3xl" />
              <Reveal delay={0.05}>
                <div className="relative flex items-center gap-3">
                  <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.2em] text-ink/45">
                    <span className="h-1.5 w-1.5 animate-blink rounded-full bg-lime" />
                    OPEN TO WORK · AI FULLSTACK · AGENT
                  </p>
                  <span className="h-px flex-1 bg-ink/15" />
                  <span className="hidden font-hand text-[17px] text-ink/45 sm:block">Hi, 我是晓叶</span>
                </div>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <h1 className="min-w-0 font-display text-[clamp(40px,6.8vw,80px)] font-extrabold leading-[0.94] tracking-[-0.03em]">
                    把想法
                    <br />
                    做成<span className="marker">能上线</span>
                    <br />
                    的东西<span className="text-coral">。</span>
                  </h1>
                  <div className="mb-1 hidden shrink-0 md:block">
                    <RotatingBadge size={98} />
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="mt-6 flex flex-wrap items-end gap-x-5 gap-y-3 border-t border-dashed border-ink/15 pt-4">
                  <div className="min-w-0">
                    <p className="text-[16px] font-extrabold leading-tight">
                      晓叶 <span className="font-mono text-[9.5px] font-normal tracking-[0.2em] text-ink/40">WEI YUNXIAO</span>
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-ink/55">
                      AI 全栈开发 / 智能体开发
                      <span className="inline-flex items-center gap-1 rounded-full border border-lime/70 bg-lime/30 px-2 py-0.5 text-[10px] font-semibold">
                        <span className="h-1 w-1 rounded-full bg-coral" /> 求职中
                      </span>
                    </p>
                  </div>
                  <div className="hidden h-9 w-px bg-ink/15 sm:block" />
                  <p className="max-w-md text-[13px] leading-relaxed text-ink-soft">
                    <span className="font-bold text-ink">{figures.products} 款</span> AI 付费产品、<span className="font-bold text-ink">{figures.awards} 项</span>竞赛、<span className="font-bold text-ink">{figures.mainPlatformFollowers}</span> 粉的自媒体。喜欢把 Agent、RAG 和大模型能力，落成普通人真的会用的产品。
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.15}>
                <div className="mt-6 flex flex-wrap items-center gap-2.5">
                  <a href="#projects" className="btn-ink group min-h-[42px]">
                    看我的作品
                    <ArrowDownRight size={15} className="transition group-hover:translate-y-0.5" />
                  </a>
                  <Link to="/work/resume" className="btn group min-h-[42px]">
                    <Download size={14} /> 简历 · 一页纸
                  </Link>
                  <Link to="/me/guestbook" className="btn min-h-[42px] border-dashed">
                    <MessageCircle size={14} /> 留句话
                  </Link>
                </div>
                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] tracking-[0.12em] text-ink/40">
                  <span>6 个月 · 5 天/周 · 随时到岗</span>
                  <span className="hidden h-3 w-px bg-ink/15 sm:block" />
                  <span className="hidden sm:inline">西安 · 可远程 / 出差</span>
                </p>
              </Reveal>
            </div>

            {/* 右：名片 + NOW */}
            <div className="relative border-t border-ink/15 bg-sand/60 px-4 pb-5 pt-4 sm:px-5 lg:border-l lg:border-t-0">
              <div className="pointer-events-none absolute inset-0 halftone opacity-[0.1]" />
              <div className="relative grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] tracking-[0.18em] text-ink/45">ID CARD / 2026</span>
                    <span className="tag bg-lime">
                      <Sparkles size={11} /> OPEN TO WORK
                    </span>
                  </div>

                  <div className="relative mt-3">
                    <div className="absolute -left-1 -top-3 z-10">
                      <Sticker rotate={-8} color="rgb(var(--c-lime))">2026 可实习</Sticker>
                    </div>
                    <Tilt strength={8}>
                      <button
                        onClick={onOpenCard}
                        aria-label="打开晓叶的名片"
                        className="group relative block w-full rotate-[1deg] overflow-hidden rounded-[22px] border-1.5 border-ink bg-cream p-4 text-left shadow-hard transition-shadow hover:shadow-hard-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-1.5 border-ink bg-lime">
                            <div className="absolute inset-0 halftone opacity-25" />
                            <span className="relative font-display text-xl font-extrabold">魏</span>
                            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-ink bg-cream font-mono text-[7px] font-bold">
                              AI
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[16px] font-extrabold leading-tight">晓叶</p>
                            <p className="mt-0.5 font-mono text-[9px] tracking-[0.16em] text-ink/40">WYX · 2002 · 西安</p>
                            <p className="mt-1 text-[11px] leading-snug text-ink/55">
                              信息与通信工程 · 多模态 AI
                              <br />
                              AI 全栈 / 智能体开发
                            </p>
                          </div>
                          <ArrowUpRight size={16} className="shrink-0 text-ink/30 transition group-hover:text-ink" />
                        </div>

                        <div className="my-2.5 border-t border-dashed border-ink/20" />

                        <div className="space-y-1">
                          {[
                            ['坐标', '西安 / 重庆万州'],
                            ['身份', '研二在读 · 2028 届'],
                            ['方向', 'Agent 评测 · RAG · AIGC'],
                          ].map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between gap-3 text-[11px]">
                              <span className="font-mono text-[9px] tracking-widest text-ink/35">{k}</span>
                              <span className="truncate font-medium text-ink/75">{v}</span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-2.5 flex items-end justify-between gap-3 rounded-xl bg-paper p-2">
                          <div className="min-w-0">
                            <p className="font-mono text-[9px] tracking-[0.16em] text-ink/35">CONTACT</p>
                            <p className="mt-0.5 truncate text-[10.5px] font-medium">wyxcode@qq.com</p>
                            <p className="truncate text-[10.5px] text-ink/55">微信 wyx200265</p>
                          </div>
                          <svg viewBox="0 0 96 96" className="h-12 w-12 shrink-0" aria-hidden>
                            {Array.from({ length: 144 }).map((_, i) => {
                              const x = i % 12
                              const y = Math.floor(i / 12)
                              const on = (x * 13 + y * 29 + ((x * y) % 7)) % 5 < 2
                              return on ? <rect key={i} x={x * 8} y={y * 8} width="7" height="7" fill="rgb(var(--c-ink))" /> : null
                            })}
                            {[
                              [0, 0],
                              [64, 0],
                              [0, 64],
                            ].map(([x, y], i) => (
                              <g key={i}>
                                <rect x={x} y={y} width="24" height="24" fill="none" stroke="rgb(var(--c-ink))" strokeWidth="5" />
                                <rect x={x + 10} y={y + 10} width="5" height="5" fill="rgb(var(--c-ink))" />
                              </g>
                            ))}
                          </svg>
                        </div>
                        <p className="mt-2 text-center font-hand text-[14px] text-ink/45">点开看看我的名片 →</p>
                      </button>
                    </Tilt>
                  </div>
                </div>

                <div className="relative flex flex-col">
                  <div className="relative flex-1 -rotate-[1deg] rounded-2xl border-1.5 border-ink bg-cream p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[9.5px] tracking-[0.2em] text-ink/55">NOW · 2026.10</p>
                      <span className="h-1.5 w-1.5 animate-blink rounded-full bg-coral" />
                    </div>
                    <div className="mt-2 space-y-1">
                      {[
                        ['在写', 'RSI 自进化闭环'],
                        ['在读', 'Building LLM Apps'],
                        ['在听', '橘色落日 · 房东的猫'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-baseline justify-between gap-3">
                          <span className="shrink-0 font-mono text-[9.5px] tracking-widest text-ink/50">{k}</span>
                          <span className="truncate text-[11px] font-medium text-ink/75">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 核心数据带 */}
          <div className="relative grid grid-cols-2 border-t border-ink/15 bg-paper/50 sm:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  'px-4 py-4 sm:px-5',
                  i % 2 === 1 && 'border-l border-ink/10',
                  i >= 2 && 'border-t border-ink/10 sm:border-t-0',
                  i > 0 && 'sm:border-l sm:border-ink/10',
                )}
              >
                <div className="flex items-baseline gap-0.5 font-display text-[clamp(26px,3.2vw,36px)] font-extrabold leading-none">
                  <CountUp to={s.value} />
                  <span className="text-[13px] font-semibold text-ink/60">{s.suffix}</span>
                </div>
                <span
                  className="mt-2 block h-1 w-6 rounded-full"
                  style={{ background: colorMap[['lime', 'coral', 'blue', 'grape'][i % 4]] }}
                />
                <p className="mt-2 text-[11.5px] font-medium text-ink/75">{s.label}</p>
                <p className="mt-0.5 font-mono text-[9px] tracking-wide text-ink/40">{s.note}</p>
              </div>
            ))}
          </div>

          {/* 底部状态条 */}
          <div className="relative flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-ink/15 bg-paper/60 px-4 py-2.5 font-mono text-[9.5px] tracking-wide text-ink/50 sm:px-6">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-coral" /> 此刻在写 RSI 自进化回归用例 #42
            </span>
            <span className="hidden h-3 w-px bg-ink/15 sm:block" />
            <span>西安 22°C · 周四</span>
            <span className="ml-auto hidden items-center gap-1.5 sm:flex">
              <ArrowDownRight size={11} /> SCROLL / 继续往下看
            </span>
          </div>
        </div>
      </Reveal>
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

  // 自动向左滑动（每 5s 前进一张）；悬停 / 聚焦 / 弹窗打开 / reduced-motion 时暂停
  useEffect(() => {
    if (hold || reduce) return
    const t = window.setInterval(() => setIndex((i) => (i + 1) % n), 5000)
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
      <div className="relative overflow-hidden rounded-[28px] border-1.5 border-ink bg-sand shadow-hard">
        <div className="pointer-events-none absolute inset-0 grid-paper opacity-[0.08]" />
        <div className="pointer-events-none absolute inset-0 halftone opacity-[0.06]" />

        {/* 顶栏 */}
        <div className="relative flex items-center justify-between gap-3 border-b border-ink/15 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 shrink-0 animate-blink rounded-full bg-lime" />
            <span className="text-[15px] font-extrabold tracking-tight">精选项目</span>
            <span className="hidden font-mono text-[9px] tracking-[0.22em] text-ink/45 sm:inline">FEATURED PROJECTS</span>
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
          {/* 窄屏卡片为单列堆叠、自然高度更高：按实测最大值留出空间，避免底部按钮/封面被裁切 */}
          <div className="relative h-[560px] min-[480px]:h-[510px] sm:h-[430px]">
            {list.map((p, i) => {
              const rel = relOf(i)
              const ar = Math.abs(rel)
              const isMain = rel === 0
              const visible = ar <= 2
              return (
                <div
                  key={p.id}
                  className="absolute inset-0 flex items-center justify-center px-4"
                  style={{
                    zIndex: 30 - ar,
                    pointerEvents: visible ? 'auto' : 'none',
                    visibility: visible ? 'visible' : 'hidden',
                  }}
                  aria-hidden={!isMain}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      x: `${rel * 64}%`,
                      scale: isMain ? 1 : ar === 1 ? 0.82 : 0.6,
                      opacity: isMain ? 1 : ar === 1 ? 0.5 : 0.16,
                    }}
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 210, damping: 26 }}
                    drag={isMain && !reduce ? 'x' : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.14}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -60) go(index + 1)
                      if (info.offset.x > 60) go(index - 1)
                    }}
                    onClick={() => (isMain ? onOpen(p) : go(i))}
                    className={cn(
                      'w-full max-w-[600px] cursor-pointer select-none',
                      isMain && 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime',
                    )}
                  >
                    <div className="grid overflow-hidden rounded-[22px] border-1.5 border-ink bg-cream text-ink shadow-hard-lg sm:grid-cols-[1.06fr_0.94fr]">
                      {/* 左：文案 */}
                      <div className="flex flex-col p-5 sm:p-6">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] tracking-[0.2em] text-ink/40">
                            {pad2(i + 1)} / {pad2(n)}
                          </span>
                          {p.award && (
                            <span className="inline-flex max-w-[62%] items-center gap-1 truncate rounded-full border border-lime/70 bg-paper px-2 py-0.5 text-[9.5px] font-medium text-ink">
                              <Award size={9} className="shrink-0" />
                              <span className="truncate">{p.award}</span>
                            </span>
                          )}
                        </div>
                        <p className="mt-3 font-mono text-[9px] tracking-[0.22em] text-ink/45">{p.en}</p>
                        <h3 className="mt-1 text-[clamp(19px,2.5vw,25px)] font-extrabold leading-[1.12]">{p.title}</h3>
                        <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-ink-soft">{p.summary}</p>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {p.metrics.slice(0, 3).map((m) => (
                            <div key={m.label}>
                              <p className="break-words text-[clamp(14px,1.9vw,20px)] font-extrabold leading-tight">{m.value}</p>
                              <span className="mt-1 block h-[3px] w-6 rounded-full" style={{ background: p.accent }} />
                              <p className="mt-1 truncate font-mono text-[9px] tracking-wide text-ink/45">{m.label}</p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {p.tags.slice(0, 3).map((t) => (
                            <span key={t} className="rounded-full border border-ink/15 bg-paper px-2 py-0.5 font-mono text-[9.5px] text-ink/60">
                              {t}
                            </span>
                          ))}
                        </div>

                        <div className="mt-auto flex items-center justify-between gap-2 pt-5">
                          <span className="font-mono text-[9px] tracking-wide text-ink/40">{p.period}</span>
                          <span className="btn-ink inline-flex !py-1.5 !text-[12px]">
                            查看详情 <ArrowUpRight size={13} />
                          </span>
                        </div>
                      </div>

                      {/* 右：16:10 封面（真实图缺失时降级为 Plate 主题图形） */}
                      <div className="relative min-h-[170px] border-t border-ink/12 sm:min-h-full sm:border-l sm:border-t-0">
                        <SmartImage
                          asset={lookupMedia(`${p.en}.cover`)}
                          className="absolute inset-0"
                          fallback={<Plate motif={p.motif} accent={p.accent} className="absolute inset-0" />}
                        />
                        <span className="pointer-events-none absolute bottom-2 right-3 font-display text-[46px] font-extrabold leading-none text-ink/10">
                          {pad2(i + 1)}
                        </span>
                        <span className="absolute left-3 top-3 rounded-full border border-ink/25 bg-paper/90 px-2 py-0.5 font-mono text-[9px] tracking-wide text-ink/65">
                          {p.category}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 移动端指示点 */}
        <div className="relative flex items-center justify-center gap-1.5 border-t border-ink/15 py-3 sm:hidden">
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
function SkillCard({ index, skill }: { index: number; skill: (typeof skillGroups)[number] }) {
  const color = colorMap[skill.color]
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-1.5 border-ink bg-cream p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-hard sm:p-5">
      <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: color }} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[9px] tracking-[0.18em] text-ink/35">
            0{index + 1} / {skill.key.toUpperCase()}
          </p>
          <h3 className="mt-1.5 flex items-center gap-2 text-[17px] font-extrabold leading-none">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-ink/25" style={{ background: color }} />
            {skill.title}
          </h3>
        </div>
        <span className="shrink-0 rounded-full border border-ink/15 bg-paper px-2 py-1 font-mono text-[9px] tracking-wide text-ink/50">
          {skill.level}%
        </span>
      </div>

      <p className="mt-2.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink/55">{skill.summary}</p>

      <div className="mt-3 flex-1 space-y-2 border-t border-dashed border-ink/15 pt-3">
        {skill.proofs.map((p) => (
          <div key={p.label} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[11px] text-ink/60">{p.label}</span>
            <span className="shrink-0 font-display text-[14px] font-extrabold leading-none">{p.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-3.5 border-t border-ink/10 pt-2.5">
        <div className="flex items-center justify-between font-mono text-[8.5px] tracking-[0.14em] text-ink/35">
          <span>PROFICIENCY</span>
          <span>{skill.level}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full border border-ink/10 bg-paper">
          <div className="h-full rounded-full" style={{ width: `${skill.level}%`, background: color }} />
        </div>
      </div>
    </article>
  )
}

function SkillsBento() {
  const proofCount = skillGroups.reduce((n, s) => n + s.proofs.length, 0)

  return (
    <section id="skills" className="scroll-mt-28">
      <SectionHead index="02" title="技能图谱" en="WHAT I DO" desc="不是罗列关键词，是每个方向都有一两个能拿出来的结果。" />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-2xl border-1.5 border-ink bg-sand/70 px-4 py-3">
        <p className="flex items-center gap-2 font-mono text-[9.5px] tracking-[0.16em] text-ink/55">
          <Sparkles size={13} className="text-ink/60" />
          SKILL LEDGER · {skillGroups.length} 个方向
        </p>
        <p className="font-mono text-[9px] tracking-[0.12em] text-ink/40">
          {proofCount} 条可验证结果 · 来自上线项目 / 竞赛 / 论文
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {skillGroups.map((s, i) => (
          <Reveal key={s.key} delay={i * 0.05} className="h-full">
            <SkillCard index={i} skill={s} />
          </Reveal>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border-1.5 border-ink bg-cream px-4 py-3">
        <p className="text-[11.5px] text-ink/55">每一条结果都能在下面的项目、简历或论文里找到出处。</p>
        <a href="#projects" className="inline-flex min-h-[32px] items-center gap-1 rounded-full px-2 font-mono text-[10px] tracking-[0.14em] text-ink/50 transition hover:bg-lime/25 hover:text-ink">
          看结果落在哪 <ArrowDownRight size={12} />
        </a>
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
        <div className="min-w-0 lg:col-span-8">
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

        <div className="lg:col-span-4">
          <div className="flex h-full flex-col gap-2.5">
            {/* 年度战绩卡：深色底 + 计数动画，与其他区块样式区分 */}
            <div className="relative overflow-hidden rounded-2xl border-1.5 border-ink bg-ink p-5 text-paper">
              <div className="absolute inset-0 halftone opacity-[0.14]" />
              <div className="relative">
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

            <div className="relative overflow-hidden rounded-2xl border-1.5 border-ink bg-lime p-5">
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {blocks.map((b, i) => {
          const Icon = b.icon
          return (
            <Reveal key={b.to} delay={i * 0.06}>
              <Link
                to={b.to}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-1.5 border-ink bg-cream p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-hard"
              >
                <div
                  className="absolute -right-8 -top-8 h-24 w-24 rounded-full border-1.5 border-ink/20 transition-transform duration-500 group-hover:scale-125"
                  style={{ background: b.color }}
                />
                <div className="relative flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border-1.5 border-ink bg-paper">
                    <Icon size={15} />
                  </span>
                  <span className="font-mono text-[9px] tracking-widest text-ink/40">{b.tag}</span>
                </div>
                <h3 className="relative mt-4 text-[17px] font-extrabold">{b.title}</h3>
                <p className="relative mt-1.5 text-[11.5px] leading-relaxed text-ink/50">{b.desc}</p>
                <span className="relative mt-4 inline-flex items-center gap-1 font-mono text-[9.5px] tracking-widest text-ink/45 group-hover:text-ink">
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
            我需要一份实习，
            <br />
            你们需要一个能做事的人。
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
      <Hero onOpenCard={() => setCardOpen(true)} />

      <div className="relative my-10 overflow-hidden border-y-1.5 border-ink bg-lime py-2.5">
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
        <ProjectCarousel onOpen={setActiveProject} paused={!!activeProject} />
        <SkillsBento />
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
