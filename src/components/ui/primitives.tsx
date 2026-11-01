import { motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn, usePrefersReducedMotion } from '@/lib/utils'

/* ---------------------------------- Reveal --------------------------------- */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  once = true,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  once?: boolean
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/* --------------------------------- Marquee -------------------------------- */
export function Marquee({
  items,
  speed = 30,
  reverse,
  className,
  separator = '✦',
  itemClassName,
  fill,
}: {
  items: ReactNode[]
  speed?: number
  reverse?: boolean
  className?: string
  separator?: string
  itemClassName?: string
  /** 铺满模式：把内容重复到至少一屏宽，避免条数太少时右侧出现空白 */
  fill?: boolean
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const blockRef = useRef<HTMLDivElement>(null)
  const [copies, setCopies] = useState(1)

  // 测量容器与单块内容宽度，算出每侧需要重复几块才能盖满可视区
  useEffect(() => {
    if (!fill) {
      setCopies(1)
      return
    }
    const compute = () => {
      const wrap = wrapRef.current
      const blk = blockRef.current
      if (!wrap || !blk) return
      const cw = wrap.clientWidth
      const bw = blk.getBoundingClientRect().width
      if (!cw || !bw) return
      setCopies(Math.max(1, Math.ceil(cw / bw)))
    }
    compute()
    const timer = window.setTimeout(compute, 300) // 字体/图片加载后再量一次
    window.addEventListener('resize', compute)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', compute)
    }
  }, [fill, items.length])

  const block = (key: string, measure = false) => (
    <div key={key} ref={measure ? blockRef : undefined} className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <span key={i} className={cn('flex items-center gap-6 whitespace-nowrap px-6', itemClassName)}>
          {item}
          <span className="text-[0.7em] opacity-40">{separator}</span>
        </span>
      ))}
    </div>
  )

  // 轨道渲染偶数块（每侧 copies 块），-50% 位移正好走满一侧，循环无缝且不留空白
  const blocks: ReactNode[] = []
  for (let side = 0; side < 2; side++) {
    for (let c = 0; c < copies; c++) blocks.push(block(`${side}-${c}`, side === 0 && c === 0))
  }

  return (
    <div
      ref={wrapRef}
      className={cn('group flex overflow-hidden', className)}
      data-marquee
    >
      <div
        className="flex min-w-max animate-marquee group-hover:[animation-play-state:paused]"
        style={{
          animationDuration: `${speed}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {blocks}
      </div>
    </div>
  )
}

/* ---------------------------------- Tilt ---------------------------------- */
export function Tilt({
  children,
  className,
  strength = 8,
}: {
  children: ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({})

  return (
    <div
      ref={ref}
      className={cn('transition-transform duration-300 ease-out will-change-transform', className)}
      style={style}
      onMouseMove={(e) => {
        const el = ref.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width - 0.5
        const py = (e.clientY - r.top) / r.height - 0.5
        setStyle({
          transform: `perspective(900px) rotateY(${px * strength}deg) rotateX(${-py * strength}deg) translateY(-2px)`,
        })
      }}
      onMouseLeave={() => setStyle({ transform: 'perspective(900px) rotateY(0) rotateX(0)' })}
    >
      {children}
    </div>
  )
}

/* -------------------------------- CountUp --------------------------------- */
export function CountUp({ to, suffix = '', decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })
  const reduced = usePrefersReducedMotion()
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!inView) return
    // fx.md A5 / P5 / R2：减少动画时直接落终值，不跑逐帧 setState
    if (reduced) {
      setN(to)
      return
    }
    let raf = 0
    const start = performance.now()
    const dur = 1300
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(to * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, reduced])

  return (
    <span ref={ref} className="tabular-nums">
      {n.toFixed(decimals)}
      {suffix}
    </span>
  )
}

/* --------------------------------- Sticker -------------------------------- */
export function Sticker({
  children,
  rotate = -6,
  color = 'rgb(var(--c-lime))',
  className,
}: {
  children: ReactNode
  rotate?: number
  color?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-1.5 border-ink px-3 py-1 text-[11px] font-semibold shadow-hard-sm',
        className,
      )}
      style={{ background: color, transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  )
}

/* ------------------------------- SectionHead ------------------------------ */
export function SectionHead({
  index,
  title,
  en,
  desc,
  action,
  className,
}: {
  index?: string
  title: string
  en?: string
  desc?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-ink/12 pb-4', className)}>
      <div>
        <div className="flex items-baseline gap-3">
          {index && <span className="font-mono text-[11px] tracking-[0.2em] text-ink/40">{index}</span>}
          <h2 className="text-[clamp(25px,3.4vw,38px)] font-extrabold leading-none">{title}</h2>
          {en && <span className="hidden font-mono text-[10px] tracking-[0.24em] text-ink/35 sm:inline">{en}</span>}
        </div>
        {desc && <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-ink-soft">{desc}</p>}
      </div>
      {action}
    </div>
  )
}

/* -------------------------------- PageHead -------------------------------- */
/**
 * 紧凑页头：一行 kicker + 标题（+ 可选右侧操作）。
 * 取代原来的大张 PageIntro 卡片，把首屏让给真正的内容；
 * 需要保留的操作（如简历页的打印/下载）放在 right 槽里。
 */
export function PageHead({
  kicker,
  title,
  right,
  className,
}: {
  kicker: string
  title: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink/12 pb-3.5',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink/40">{kicker}</p>
        <h1 className="mt-1.5 text-[clamp(20px,3vw,27px)] font-extrabold leading-none">{title}</h1>
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  )
}

/* -------------------------------- PageIntro ------------------------------- */
export function PageIntro({
  kicker,
  title,
  desc,
  note,
  right,
}: {
  kicker: string
  title: ReactNode
  desc?: string
  note?: string
  right?: ReactNode
}) {
  return (
    <div className="relative mb-10 overflow-hidden rounded-[26px] border-1.5 border-ink bg-cream px-6 py-8 shadow-hard sm:px-9 sm:py-11">
      <div className="pointer-events-none absolute inset-0 grid-paper opacity-70" />
      <div className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full border-1.5 border-ink/15 bg-lime/40 blur-[1px]" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="kicker mb-3">{kicker}</div>
          <h1 className="text-[clamp(30px,5.4vw,54px)] font-extrabold leading-[0.98]">{title}</h1>
          {desc && <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-ink-soft">{desc}</p>}
          {note && <p className="mt-3 font-hand text-[19px] text-coral">{note}</p>}
        </div>
        {right}
      </div>
    </div>
  )
}

/* ---------------------------------- Plate -------------------------------- */
export function Plate({
  motif = 'grid',
  accent = 'rgb(var(--c-lime))',
  label,
  index,
  className,
  children,
}: {
  motif?: 'grid' | 'orbit' | 'wave' | 'bars' | 'stack' | 'rings'
  accent?: string
  label?: string
  index?: string
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      className={cn('overflow-hidden', !className?.includes('absolute') && 'relative', className)}
      style={{ background: `linear-gradient(150deg, color-mix(in srgb, ${accent} 33%, transparent) 0%, rgb(var(--c-surface)) 68%)` }}
    >
      <div className="absolute inset-0 halftone" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g fill="none" stroke={accent} strokeOpacity="0.75" strokeWidth="1.6">
          {motif === 'grid' &&
            [...Array(9)].map((_, i) => (
              <line key={`v${i}`} x1={i * 48} y1="0" x2={i * 48 - 60} y2="260" />
            ))}
          {motif === 'grid' &&
            [...Array(5)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 58 + 20} x2="400" y2={i * 58 + 20} strokeOpacity="0.28" />
            ))}
          {motif === 'orbit' && (
            <>
              <ellipse cx="200" cy="130" rx="150" ry="58" strokeOpacity="0.4" />
              <ellipse cx="200" cy="130" rx="105" ry="105" />
              <ellipse cx="200" cy="130" rx="62" ry="62" strokeOpacity="0.35" />
              <circle cx="200" cy="130" r="26" fill={accent} fillOpacity="0.5" stroke="none" />
              <circle cx="305" cy="130" r="5" fill="rgb(var(--c-ink))" stroke="none" />
            </>
          )}
          {motif === 'wave' &&
            [...Array(7)].map((_, i) => (
              <path
                key={i}
                d={`M-20 ${60 + i * 26} C 70 ${10 + i * 26}, 130 ${120 + i * 20}, 220 ${70 + i * 24} S 360 ${20 + i * 26}, 430 ${80 + i * 22}`}
                strokeOpacity={0.22 + i * 0.09}
              />
            ))}
          {motif === 'bars' &&
            [...Array(11)].map((_, i) => (
              <rect
                key={i}
                x={26 + i * 33}
                y={220 - ((i * 37) % 150) - 24}
                width="18"
                height={((i * 37) % 150) + 24}
                rx="3"
                fill={accent}
                fillOpacity={i % 3 === 0 ? 0.85 : 0.4}
                stroke="none"
              />
            ))}
          {motif === 'stack' &&
            [...Array(5)].map((_, i) => (
              <rect
                key={i}
                x={70 + i * 18}
                y={50 + i * 22}
                width="200"
                height="86"
                rx="8"
                fill="rgb(var(--c-surface))"
                fillOpacity={0.7}
                stroke={accent}
                strokeOpacity={0.8}
                transform={`rotate(-6 170 100)`}
              />
            ))}
          {motif === 'rings' &&
            [...Array(6)].map((_, i) => (
              <circle key={i} cx="200" cy="130" r={22 + i * 22} strokeOpacity={0.75 - i * 0.1} strokeDasharray={i % 2 ? '6 8' : '0'} />
            ))}
        </g>
      </svg>
      {index && <span className="absolute left-4 top-3 font-mono text-[10px] tracking-[0.2em] text-ink/45">{index}</span>}
      {label && (
        <span className="absolute bottom-3 left-4 rounded-full border border-ink/70 bg-cream/90 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink/70">
          {label}
        </span>
      )}
      {children}
    </div>
  )
}

/* --------------------------------- Avatar --------------------------------- */
export function Avatar({
  name = '晓叶',
  size = 56,
  accent = 'rgb(var(--c-lime))',
  className,
}: {
  name?: string
  size?: number
  accent?: string
  className?: string
}) {
  return (
    <div
      className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-1.5 border-ink', className)}
      style={{ width: size, height: size, background: accent }}
    >
      <div className="absolute inset-0 halftone opacity-20" />
      <span className="relative font-display font-extrabold leading-none" style={{ fontSize: size * 0.36 }}>
        {name.slice(0, 1)}
      </span>
    </div>
  )
}

/* ---------------------------------- Pill ---------------------------------- */
export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('rounded-full border border-ink/15 bg-paper px-2.5 py-1 font-mono text-[10px] tracking-wide text-ink/60', className)}>
      {children}
    </span>
  )
}
