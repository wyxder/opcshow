import { motion } from 'framer-motion'
import { Heart, MapPin, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Reveal } from '@/components/ui/primitives'
import { loveMeta } from '@/data/life'
import { cn, usePrefersReducedMotion } from '@/lib/utils'

const pad = (n: number) => String(n).padStart(2, '0')

/** 从在一起的那天开始算：天 / 时 / 分 / 秒，每秒跳一次 */
function useTogetherClock(startDate: string) {
  const start = useMemo(() => new Date(`${startDate}T00:00:00`).getTime(), [startDate])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const diff = Math.max(0, now - start)
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1_000) % 60,
  }
}

export default function LoveHeartbeat() {
  const { days, hours, minutes, seconds } = useTogetherClock(loveMeta.startDate)
  const reduce = usePrefersReducedMotion()
  const startText = useMemo(() => {
    const [y, m, d] = loveMeta.startDate.split('-')
    return `始于 ${y} 年 ${Number(m)} 月 ${Number(d)} 日`
  }, [])

  return (
    <Reveal>
      <div className="relative overflow-hidden rounded-3xl border-1.5 border-ink bg-gradient-to-br from-rose/45 via-cream to-sky/30">
        {/* 背景光斑：给粉色区域一点层次，固定尺寸不跟着内容走 */}
        <span className="pointer-events-none absolute -left-10 -top-10 h-44 w-44 rounded-full bg-coral/15 blur-2xl" aria-hidden />
        <span className="pointer-events-none absolute -bottom-16 right-0 h-52 w-52 rounded-full bg-grape/10 blur-3xl" aria-hidden />
        <span className="pointer-events-none absolute left-8 top-8 text-coral/50 animate-float" aria-hidden>
          <Heart size={16} className="fill-current" />
        </span>
        <span className="pointer-events-none absolute right-10 top-12 text-rose/70 animate-bob" aria-hidden>
          <Heart size={11} className="fill-current" />
        </span>
        <span className="pointer-events-none absolute left-1/3 bottom-8 text-rose/40 animate-float" aria-hidden>
          <Heart size={9} className="fill-current" />
        </span>

        <div className="relative px-4 py-7 text-center sm:px-8 sm:py-9">
          <p className="font-mono text-[9.5px] tracking-[0.26em] text-ink/45">TOGETHER WITH YOU</p>
          <p className="mt-1.5 text-[12px] text-ink/55">那些一起走过的日子</p>

          {/* 两个头像 + 中间爱心：用首字代替真人照片，不拿示意图冒充本人 */}
          <div className="mt-5 flex items-center justify-center gap-3 sm:gap-6">
            <PersonAvatar name="晓叶" initial="叶" tone="from-coral/70 to-rose" />
            <div className="relative flex flex-col items-center">
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink/15" aria-hidden />
              <motion.span
                className="relative flex h-9 w-9 items-center justify-center rounded-full border-1.5 border-ink bg-cream shadow-hard-sm sm:h-11 sm:w-11"
                animate={reduce ? undefined : { scale: [1, 1.14, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Heart size={16} className="fill-coral text-coral" />
              </motion.span>
            </div>
            <PersonAvatar name={loveMeta.partner} initial="羊" tone="from-grape/60 to-sky" />
          </div>

          <p className="mt-5 font-mono text-[9.5px] tracking-[0.14em] text-ink/40">这是我们一起走过的时间</p>

          <div className="mt-2.5 flex items-center justify-center gap-1.5 sm:gap-2.5">
            <TimeCell value={days} unit="天" />
            <Dot />
            <TimeCell value={pad(hours)} unit="时" />
            <Dot />
            <TimeCell value={pad(minutes)} unit="分" />
            <Dot />
            <TimeCell value={pad(seconds)} unit="秒" live />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-cream/80 px-3 py-1 font-mono text-[10px] text-ink/55 backdrop-blur">
              <Sparkles size={10} className="text-coral" /> {startText}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-cream/80 px-3 py-1 font-mono text-[10px] text-ink/55 backdrop-blur">
              <MapPin size={10} /> {loveMeta.city}
            </span>
          </div>
        </div>
      </div>
    </Reveal>
  )
}

function PersonAvatar({ name, initial, tone }: { name: string; initial: string; tone: string }) {
  const reduce = usePrefersReducedMotion()
  return (
    <div className="group flex flex-col items-center">
      <div className="relative">
        {/* 外层：缓慢旋转的渐变光环（圆锥感由双向渐变近似），营造“头像圆环特效” */}
        <motion.span
          className={`absolute -inset-2 rounded-full bg-gradient-to-tr ${tone} opacity-55 blur-[6px]`}
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          aria-hidden
        />
        {/* 内层：呼吸描边环，明暗脉动 */}
        <motion.span
          className={`absolute -inset-1 rounded-full bg-gradient-to-br ${tone}`}
          animate={reduce ? undefined : { scale: [1, 1.06, 1], opacity: [0.9, 0.55, 0.9] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />
        {/* 头像本体：首字头像（无真人素材，不拿照片冒充），白底描边 + 硬阴影 */}
        <span className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full border-1.5 border-ink bg-cream font-display text-[24px] font-extrabold shadow-hard-sm transition-transform duration-300 group-hover:scale-[1.04] sm:h-[92px] sm:w-[92px] sm:text-[28px]">
          {initial}
        </span>
      </div>
      <span className="mt-3 text-[12px] font-bold">{name}</span>
    </div>
  )
}

function TimeCell({ value, unit, live }: { value: number | string; unit: string; live?: boolean }) {
  const reduce = usePrefersReducedMotion()
  return (
    <div className="text-center">
      <span className="relative inline-flex items-center justify-center">
        {/* 数字背后的柔光：实时（秒）更亮，营造跳动氛围 */}
        <span
          className={cn(
            'pointer-events-none absolute inset-x-1 inset-y-0 rounded-full blur-md transition-opacity',
            live ? 'bg-coral/30 animate-pulse' : 'bg-coral/12',
          )}
          aria-hidden
        />
        {/* 值变化时重新挂载 → 数字自上滑落淡入，形成“翻页跳动”特效 */}
        <motion.span
          key={String(value)}
          initial={reduce ? false : { y: '-58%', opacity: 0.25 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'relative block bg-gradient-to-b from-coral to-grape bg-clip-text font-display text-[30px] font-extrabold leading-none tabular-nums text-transparent sm:text-[42px]',
            live && 'min-w-[2.1ch]',
          )}
        >
          {value}
        </motion.span>
      </span>
      <span className="mt-1.5 block font-mono text-[9px] tracking-[0.2em] text-ink/40">{unit}</span>
    </div>
  )
}

function Dot() {
  return <span className="mb-4 font-display text-[20px] font-extrabold text-coral/60 sm:text-[26px]">·</span>
}
