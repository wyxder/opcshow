import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownRight,
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
  Utensils,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProjectModal } from '@/components/ProjectModal'
import { Modal } from '@/components/ui/Modal'
import { CountUp, Marquee, Plate, Reveal, SectionHead, Sticker, Tilt } from '@/components/ui/primitives'
import { articles } from '@/data/articles'
import { awards, education, hobbies, profile, skillGroups, stats } from '@/data/site'
import { projects, featuredProjects } from '@/data/projects'
import type { Project } from '@/data/projects'
import { cn } from '@/lib/utils'

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
    <section id="top" className="relative overflow-hidden pb-12 pt-4 sm:pb-16 sm:pt-8">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-lime/25 blur-3xl" />
      <div className="pointer-events-none absolute right-1/3 top-0 h-60 w-60 rounded-full bg-rose/20 blur-3xl" />

      <div className="relative grid gap-8 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-8">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2.5">
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
          </Reveal>

          <Reveal delay={0.06}>
            <div className="mt-6 flex items-end gap-4">
              <h1 className="font-display text-[clamp(40px,7.6vw,88px)] font-extrabold leading-[0.93] tracking-[-0.03em]">
                把想法
                <br />
                做成<span className="marker">能上线</span>
                <br />
                的东西<span className="text-coral">。</span>
              </h1>
              <div className="mb-3 hidden shrink-0 sm:block">
                <RotatingBadge />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-3">
              <div>
                <p className="text-[15px] font-bold">魏云潇 <span className="font-mono text-[10px] font-normal tracking-[0.2em] text-ink/40">WEI YUNXIAO</span></p>
                <p className="mt-1 text-[12.5px] text-ink/55">AI 全栈开发 / 智能体开发 · 求职中</p>
              </div>
              <div className="hidden h-8 w-px bg-ink/15 sm:block" />
              <p className="max-w-md text-[13px] leading-relaxed text-ink-soft">
                7 款 AI 付费产品、16 项竞赛、2.3w 粉的自媒体。喜欢把 Agent、RAG 和大模型能力，落成普通人真的会用的产品。
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <a href="#projects" className="btn-ink group">
                看我的作品
                <ArrowDownRight size={15} className="transition group-hover:translate-y-0.5" />
              </a>
              <Link to="/work/resume" className="btn group">
                <Download size={14} /> 简历 · 一页纸
              </Link>
              <Link to="/me/guestbook" className="btn border-dashed">
                <MessageCircle size={14} /> 留句话
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-dashed border-ink/15 pt-4 font-mono text-[10px] tracking-wide text-ink/50">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-coral" /> 此刻在写 RSI 自进化回归用例 #42
              </span>
              <span className="hidden sm:inline">西安 22°C · 周四</span>
            </div>
          </Reveal>
        </div>

        {/* name card */}
        <div className="lg:col-span-4">
          <Reveal delay={0.15} y={26}>
            <div className="relative mx-auto max-w-[330px] lg:mt-4">
              <div className="absolute -left-3 -top-3 z-10">
                <Sticker rotate={-8} color="rgb(var(--c-lime))">2026 可实习</Sticker>
              </div>
              <Tilt strength={10}>
                <button
                  onClick={onOpenCard}
                  className="group relative block w-full rotate-[1.2deg] overflow-hidden rounded-[24px] border-1.5 border-ink bg-cream p-4 text-left shadow-hard transition-shadow hover:shadow-hard-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-1.5 border-ink bg-lime">
                      <div className="absolute inset-0 halftone opacity-25" />
                      <span className="relative font-display text-2xl font-extrabold">魏</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-extrabold leading-tight">魏云潇</p>
                      <p className="mt-0.5 font-mono text-[9px] tracking-[0.16em] text-ink/40">WYX · 2002</p>
                      <p className="mt-1.5 text-[11px] leading-snug text-ink/55">信息与通信工程 · 多模态 AI<br />AI 全栈 / 智能体开发</p>
                    </div>
                    <ArrowUpRight size={16} className="shrink-0 text-ink/30 transition group-hover:text-ink" />
                  </div>

                  <div className="my-3 border-t border-dashed border-ink/20" />

                  <div className="space-y-1.5">
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

                  <div className="mt-3 flex items-end justify-between gap-3 rounded-xl bg-paper p-2.5">
                    <div className="min-w-0">
                      <p className="font-mono text-[9.5px] tracking-[0.16em] text-ink/35">CONTACT</p>
                      <p className="mt-1 truncate text-[10.5px] font-medium">wyxcode@qq.com</p>
                      <p className="truncate text-[10.5px] text-ink/55">微信 wyx200265</p>
                    </div>
                    <svg viewBox="0 0 96 96" className="h-14 w-14 shrink-0" aria-hidden>
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
                  <p className="mt-2.5 text-center font-hand text-[15px] text-ink/45">点开看看我的名片 →</p>
                </button>
              </Tilt>

              <div className="mt-5 hidden -rotate-[1.2deg] rounded-2xl border-1.5 border-ink bg-cream p-4 shadow-hard-sm lg:block">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-ink/55">NOW · 2026.10</p>
                  <span className="h-1.5 w-1.5 animate-blink rounded-full bg-coral" />
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {[
                    ['在写', 'RSI 自进化闭环'],
                    ['在读', 'Building LLM Apps'],
                    ['在听', '橘色落日 · 房东的猫'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 font-mono text-[10px] tracking-widest text-ink/50">{k}</span>
                      <span className="truncate text-[11.5px] font-medium text-ink/75">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------- stats ---------------------------------- */
function StatsStrip() {
  return (
    <section className="relative z-10">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.06}>
            <div
              className={cn(
                'group h-full rounded-2xl border-1.5 border-ink p-4 transition-transform hover:-translate-y-1',
                i === 0 ? 'bg-ink text-paper' : 'bg-cream',
              )}
            >
              <div className="flex items-baseline gap-0.5 font-display text-[clamp(28px,3.4vw,38px)] font-extrabold leading-none">
                <CountUp to={s.value} />
                <span className={cn('text-[14px] font-semibold', i === 0 ? 'text-lime' : 'text-coral')}>{s.suffix}</span>
              </div>
              <p className={cn('mt-2 text-[11.5px] font-medium', i === 0 ? 'text-paper/85' : 'text-ink/70')}>{s.label}</p>
              <p className={cn('mt-0.5 font-mono text-[9px] tracking-wide', i === 0 ? 'text-paper/35' : 'text-ink/35')}>{s.note}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* -------------------------------- carousel -------------------------------- */
function ProjectCarousel({ onOpen }: { onOpen: (p: Project) => void }) {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [paused, setPaused] = useState(false)
  const timer = useRef<number | null>(null)
  const list = featuredProjects

  const go = (next: number) => {
    setDir(next > index ? 1 : -1)
    setIndex((next + list.length) % list.length)
  }

  useEffect(() => {
    if (paused) return
    timer.current = window.setTimeout(() => {
      setDir(1)
      setIndex((i) => (i + 1) % list.length)
    }, 6200)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [index, paused, list.length])

  const p = list[index]

  return (
    <section id="projects" className="scroll-mt-28">
      <SectionHead
        index="01"
        title="精选项目"
        en="SELECTED WORK"
        desc="三个从需求到上线都走完的项目，点开卡片看细节。"
        action={
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-ink/40">
              {String(index + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')}
            </span>
            <button
              onClick={() => go(index - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border-1.5 border-ink bg-cream transition hover:bg-lime"
              aria-label="上一个项目"
            >
              <ArrowRight size={14} className="rotate-180" />
            </button>
            <button
              onClick={() => go(index + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border-1.5 border-ink bg-cream transition hover:bg-lime"
              aria-label="下一个项目"
            >
              <ArrowRight size={14} />
            </button>
          </div>
        }
      />

      <div
        className="relative overflow-hidden rounded-[26px] border-1.5 border-ink bg-cream shadow-hard"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(index + 1)
              if (info.offset.x > 60) go(index - 1)
            }}
            className="grid md:grid-cols-[1.08fr_0.92fr]"
          >
            <div className="order-2 p-6 sm:p-8 md:order-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tag bg-ink text-paper">{p.category}</span>
                <span className="tag">{p.role}</span>
                <span className="font-mono text-[9.5px] tracking-wide text-ink/40">{p.period}</span>
              </div>
              <h3 className="mt-4 text-[clamp(20px,2.8vw,30px)] font-extrabold leading-[1.12]">{p.title}</h3>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{p.summary}</p>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {p.metrics.slice(0, 4).map((m) => (
                  <div key={m.label} className="rounded-lg border border-ink/12 bg-paper px-2.5 py-2">
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink/40">{m.label}</p>
                    <p className="mt-0.5 text-[11.5px] font-bold leading-tight">{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button onClick={() => onOpen(p)} className="btn-ink !py-2 !text-[12px]">
                  项目详情 <ArrowUpRight size={13} />
                </button>
                <div className="flex flex-wrap gap-1">
                  {p.tags.map((t) => (
                    <span key={t} className="rounded-full bg-ink/5 px-2 py-0.5 font-mono text-[9px] text-ink/50">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative order-1 min-h-[190px] border-b border-ink/15 md:order-2 md:min-h-full md:border-b-0 md:border-l">
              <Plate motif={p.motif} accent={p.accent} label={p.en} className="absolute inset-0" />
              <div className="absolute inset-0 flex flex-col justify-between p-5">
                <div className="flex justify-end">
                  <span className="rounded-full border border-ink/60 bg-cream/85 px-2 py-0.5 font-mono text-[9px] tracking-widest">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-end justify-between gap-3">
                  {p.award && (
                    <span className="max-w-[78%] rounded-lg border border-ink/20 bg-cream/90 px-2 py-1 text-[9.5px] leading-tight">
                      <Award size={10} className="mr-1 inline" />
                      {p.award}
                    </span>
                  )}
                  <span className="font-display text-[38px] font-extrabold leading-none text-ink/15">0{index + 1}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-4 border-t border-ink/12 px-5 py-3">
          <div className="flex items-center gap-1.5">
            {list.map((item, i) => (
              <button key={item.id} onClick={() => go(i)} className="group py-2" aria-label={`切换到 ${item.title}`}>
                <span
                  className={cn(
                    'block h-1 rounded-full transition-all duration-300',
                    i === index ? 'w-8 bg-ink' : 'w-4 bg-ink/20 group-hover:bg-ink/40',
                  )}
                />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-hand text-[16px] text-ink/45">拖动卡片也能翻页</span>
            <Link to="/work/resume" className="flex items-center gap-1 font-mono text-[9.5px] tracking-widest text-ink/50 hover:text-ink">
              全部 7 个 <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------- skills --------------------------------- */
function SkillsBento() {
  const [active, setActive] = useState(0)
  const current = skillGroups[active]

  return (
    <section id="skills" className="scroll-mt-28">
      <SectionHead index="02" title="技能图谱" en="WHAT I DO" desc="不是罗列关键词，是每个方向都有一两个能拿出来的结果。" />
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="grid h-full gap-2.5 sm:grid-cols-2">
            {skillGroups.map((s, i) => {
              const color = colorMap[s.color]
              return (
                <button
                  key={s.key}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive(i)}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl border-1.5 border-ink p-4 text-left transition-all duration-300',
                    active === i ? 'bg-cream shadow-hard' : 'bg-cream/60 hover:bg-cream',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] font-bold">{s.title}</span>
                    <span className="font-mono text-[10px] text-ink/40">{s.level}</span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full border border-ink/15 bg-paper">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${s.level}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-[11px] leading-relaxed text-ink/50">{s.summary}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="relative h-full overflow-hidden rounded-2xl border-1.5 border-ink bg-ink p-5 text-paper">
            <div className="absolute inset-0 halftone opacity-[0.18]" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] tracking-[0.2em] text-lime">SKILL / DETAIL</span>
                <span className="font-mono text-[9px] text-paper/35">0{active + 1} / 06</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="mt-4 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm" style={{ background: colorMap[current.color] }} />
                    <h3 className="text-[24px] font-extrabold leading-none">{current.title}</h3>
                  </div>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-paper/65">{current.summary}</p>
                  <ul className="mt-4 space-y-2">
                    {current.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-2 border-b border-dashed border-paper/15 pb-2 text-[12px] text-paper/85">
                        <span className="font-mono text-[9px] text-lime">▸</span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
              <p className="mt-4 font-hand text-[18px] text-paper/40">悬停左侧切换 →</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------- honors --------------------------------- */
function Honors() {
  const [open, setOpen] = useState(false)
  return (
    <section id="awards" className="scroll-mt-28">
      <SectionHead
        index="03"
        title="竞赛荣誉"
        en="AWARDS"
        desc="2026 年跑了 7 场黑客松，6 次进决赛。奖项放在这里，作品在上面。"
        action={
          <button onClick={() => setOpen(true)} className="btn !py-2 !text-[12px]">
            全部 16 项 <ArrowUpRight size={13} />
          </button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="overflow-hidden rounded-2xl border-1.5 border-ink bg-cream">
            {awards.slice(0, 7).map((a, i) => (
              <div
                key={a.name}
                className={cn(
                  'group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-lime/30',
                  i !== 0 && 'border-t border-ink/10',
                )}
              >
                <span className="w-10 shrink-0 font-mono text-[9.5px] text-ink/35">{a.year}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium">{a.name}</span>
                  <span className="mt-0.5 block text-[10.5px] text-ink/45">{a.rank}</span>
                </span>
                <span className="hidden shrink-0 rounded-full border border-ink/20 px-2 py-0.5 font-mono text-[9px] text-ink/50 sm:block">
                  {a.type}
                </span>
                <Star size={12} className="shrink-0 text-ink/15 transition group-hover:text-ink" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="flex h-full flex-col gap-2.5">
            <div className="relative flex-1 overflow-hidden rounded-2xl border-1.5 border-ink bg-lime p-5">
              <Quote size={22} />
              <p className="mt-2 font-display text-[19px] font-extrabold leading-snug">
                黑客松不是比赛，
                <br />
                是 48 小时的
                <br />
                真实产品课。
              </p>
              <p className="mt-3 text-[11px] leading-relaxed text-ink/60">7 场决赛、5 次上台路演、3 个评委追问：你的付费模型怎么走通？</p>
              <div className="absolute -bottom-3 -right-2 font-display text-[64px] font-extrabold text-ink/10">2026</div>
            </div>
            <div className="rounded-2xl border-1.5 border-ink bg-cream p-4">
              <p className="font-mono text-[9px] tracking-[0.18em] text-ink/35">EDUCATION</p>
              {education.map((e) => (
                <div key={e.school} className="mt-2.5 flex items-start gap-2.5 border-t border-dashed border-ink/12 pt-2.5 first:border-0 first:pt-0">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-ink/20 bg-paper">
                    <GraduationCap size={12} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold">{e.school}</p>
                    <p className="mt-0.5 truncate text-[10.5px] text-ink/50">{e.degree}</p>
                    <p className="font-mono text-[9px] text-ink/35">{e.period}</p>
                  </div>
                </div>
              ))}
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

/* ------------------------------- life teaser ------------------------------- */
function LifeTeaser() {
  const blocks = [
    { to: '/life/love', title: '恋爱记录', desc: '1240 天，86 次见面，11 座城市。', color: 'rgb(var(--c-rose))', icon: Heart, tag: '异地第 4 年' },
    { to: '/life/travel', title: '旅拍相册', desc: '地图上钉了 11 个点，每个都有故事。', color: 'rgb(var(--c-sky))', icon: MapPin, tag: '11 座城市' },
    { to: '/life/music', title: '音乐盒', desc: '写代码时在听什么，都在这。', color: 'rgb(var(--c-lime))', icon: Music, tag: '6 张歌单' },
  ]
  return (
    <section>
      <SectionHead index="04" title="生活切片" en="OFF SCREEN" desc="工作之外的那部分，才让这个网站像个人。" action={<Link to="/life/love" className="font-mono text-[10px] tracking-widest text-ink/45 hover:text-ink">进入生活频道 →</Link>} />
      <div className="grid gap-3 sm:grid-cols-3">
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
              {articles.slice(0, 4).map((a, i) => (
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

  return (
    <div className="shell">
      <Hero onOpenCard={() => setCardOpen(true)} />
      <StatsStrip />

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
        <ProjectCarousel onOpen={setActiveProject} />
        <SkillsBento />
        <Honors />
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
                <h3 className="mt-2 text-[30px] font-extrabold leading-none">魏云潇</h3>
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
