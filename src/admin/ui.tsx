import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Loader2, LockKeyhole, RefreshCw, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap, useScrollLock } from '@/lib/a11y'
import { cn } from '@/lib/utils'

/* ---------------------------------- toast --------------------------------- */

export function useAdminToast() {
  const [msg, setMsg] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const timer = useRef<number | null>(null)

  /** F-16：polite / 失败 assertive，重复消息不叠加 */
  const show = useCallback((m: string, opts?: { error?: boolean }) => {
    setIsError(opts?.error ?? /失败|错误|不能|超时|不可用|不允许/.test(m))
    setMsg((prev) => (prev === m ? prev : m))
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 2200)
  }, [])

  const node = (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8 }}
          role={isError ? 'alert' : 'status'}
          aria-live={isError ? 'assertive' : 'polite'}
          className="fixed bottom-6 right-6 z-[95] flex items-center gap-2 rounded-full border-1.5 border-ink bg-ink px-4 py-2.5 text-[12px] font-medium text-paper shadow-hard"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lime text-ink">
            <Check size={12} />
          </span>
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return { show, node }
}

/* --------------------------------- buttons -------------------------------- */

type Variant = 'primary' | 'ghost' | 'dark' | 'danger' | 'soft'

export function AButton({
  variant = 'ghost',
  size = 'md',
  icon,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: 'sm' | 'md'
  icon?: ReactNode
}) {
  const palette: Record<Variant, string> = {
    primary: 'bg-ink text-paper border-ink hover:-translate-y-0.5 hover:shadow-hard-sm',
    ghost: 'bg-cream text-ink border-ink hover:-translate-y-0.5 hover:shadow-hard-sm',
    dark: 'bg-lime text-ink border-ink hover:-translate-y-0.5 hover:shadow-hard-sm',
    // fx.md T2：破坏性操作走语义状态令牌，不再混用 coral
    danger: 'bg-danger/12 text-admin-danger border-danger/45 hover:bg-danger/20',
    soft: 'bg-paper text-ink border-transparent hover:border-ink/30 hover:bg-surface-hover',
  }
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border-1.5 font-medium transition-all duration-200 active:translate-y-0 active:shadow-none',
        size === 'sm' ? 'px-2.5 py-1 text-[11.5px]' : 'px-3.5 py-2 text-[12.5px]',
        'disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none',
        palette[variant],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  )
}

export function IconButton({
  children,
  label,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md border-1.5 border-ink/25 bg-cream text-ink/60 transition hover:border-ink hover:bg-lime hover:text-ink',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink/25 disabled:hover:bg-cream disabled:hover:text-ink/60',
        className,
      )}
    >
      {children}
    </button>
  )
}

/* -------------------------------- container ------------------------------- */

export function Panel({
  title,
  kicker,
  desc,
  right,
  children,
  className,
  bodyClassName,
  flush,
  dark,
}: {
  title?: ReactNode
  kicker?: string
  desc?: ReactNode
  right?: ReactNode
  children?: ReactNode
  className?: string
  bodyClassName?: string
  flush?: boolean
  dark?: boolean
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[20px] border-1.5 border-ink shadow-hard-sm',
        dark ? 'bg-ink text-paper' : 'bg-cream',
        className,
      )}
    >
      {(title || right) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-4 pb-2 pt-4 sm:px-5">
          <div className="min-w-0">
            {kicker && (
              <p className={cn('font-mono text-[9.5px] uppercase tracking-[0.18em]', dark ? 'text-paper/70' : 'text-admin-muted')}>{kicker}</p>
            )}
            {title && (
              <h2 className={cn('mt-0.5 font-display text-[15px] font-extrabold tracking-tight', dark ? 'text-paper' : 'text-ink')}>{title}</h2>
            )}
            {desc && <p className={cn('mt-1 text-[11.5px] leading-relaxed', dark ? 'text-paper/70' : 'text-admin-muted')}>{desc}</p>}
          </div>
          {right}
        </header>
      )}
      <div className={cn(flush ? '' : 'p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

/* ---------------------------------- badge --------------------------------- */

type Tone = 'neutral' | 'red' | 'teal' | 'amber' | 'plum' | 'moss'

/* fx.md T2：后台状态色一律走语义令牌（success / warning / danger / info），
   新增主题只需要给这四个令牌取值，不用逐页试色。 */
const tones: Record<Tone, string> = {
  neutral: 'bg-sand/70 text-ink/70',
  red: 'bg-danger/12 text-admin-danger',
  teal: 'bg-success/15 text-admin-success',
  amber: 'bg-warning/15 text-admin-warning',
  plum: 'bg-info/12 text-admin-info',
  moss: 'bg-success/12 text-admin-success',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium', tones[tone], className)}>
      {children}
    </span>
  )
}

export function statusTone(status: string): Tone {
  if (['已发布', '已通过', '成功', '当前版本', '公开', '完成'].includes(status)) return 'teal'
  if (['待审核', '待审', '上传中', '等待中', '待发布'].includes(status)) return 'amber'
  if (['已拒绝', '失败'].includes(status)) return 'red'
  if (['已隐藏', '私密'].includes(status)) return 'plum'
  if (['草稿', '已下线', '已过期', '仅自己'].includes(status)) return 'neutral'
  return 'neutral'
}

export function Status({ children }: { children: string }) {
  return <Badge tone={statusTone(children)}>{children}</Badge>
}

/* --------------------------------- toggle --------------------------------- */

export function Toggle({
  on,
  onChange,
  label,
  disabled,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      className={cn(
        'flex h-[22px] w-[38px] shrink-0 items-center rounded-full border-1.5 border-ink p-[2px] transition-colors',
        on ? 'justify-end bg-lime' : 'justify-start bg-sand',
        disabled && 'cursor-not-allowed opacity-45',
      )}
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 34 }} className="h-4 w-4 rounded-full border border-ink bg-ink" />
    </button>
  )
}

/* ---------------------------------- tabs ---------------------------------- */

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: { key: T; label: string; count?: number }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cn('flex gap-5 border-b-1.5 border-ink/15', className)}>
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className={cn(
            'relative -mb-[1.5px] flex items-center gap-1.5 rounded-t-md border-b-3 px-0.5 pb-2 pt-1 text-[12.5px] transition',
            value === it.key
              ? 'border-coral font-semibold text-ink'
              : 'border-transparent text-admin-muted hover:bg-surface-hover hover:text-ink',
          )}
        >
          {it.label}
          {typeof it.count === 'number' && (
            <span
              className={cn(
                'rounded-full px-1.5 py-px font-mono text-[9.5px]',
                value === it.key ? 'bg-danger/12 text-admin-danger' : 'bg-sand/80 text-ink/75',
              )}
            >
              {it.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex items-center rounded-full border-1.5 border-ink bg-paper p-1">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            'rounded-full px-3 py-1 text-[11.5px] transition',
            value === o.key ? 'bg-cream font-semibold text-ink shadow-hard-sm' : 'text-admin-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* --------------------------------- charts --------------------------------- */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function smooth(points: [number, number][]) {
  if (points.length < 2) return ''
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

export type ChartSeries = { name: string; color: string; values: number[]; area?: boolean }

export function TrendChart({
  labels,
  series,
  bars,
  height = 208,
  labelStep = 1,
}: {
  labels: string[]
  series: ChartSeries[]
  bars?: { values: number[]; color: string }
  height?: number
  labelStep?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const pad = { l: 34, r: 6, t: 8, b: 22 }
  const all = [...series.flatMap((s) => s.values), ...(bars?.values ?? [])]
  const rawMax = Math.max(...all, 10)
  const step = Math.max(1, Math.ceil(rawMax / 4 / 50) * 50)
  const max = step * 4
  const innerW = Math.max(width - pad.l - pad.r, 10)
  const innerH = height - pad.t - pad.b
  const x = (i: number) => pad.l + (i / Math.max(labels.length - 1, 1)) * innerW
  const y = (v: number) => pad.t + innerH - (v / max) * innerH
  const barW = Math.max(2, Math.min(6, innerW / labels.length / 3))
  // fx.md A6：图表对读屏器给一句可读摘要（趋势 + 峰谷）
  const summary = series
    .map((s) => {
      const max = Math.max(...s.values)
      const min = Math.min(...s.values)
      const atMax = s.values.indexOf(max)
      const atMin = s.values.indexOf(min)
      return `${s.name}：峰值 ${max}（${labels[atMax] ?? ''}），谷值 ${min}（${labels[atMin] ?? ''}）`
    })
    .join('；')

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="overflow-visible" role="img" aria-label={summary}>
          <title>{summary}</title>
          {[0, 1, 2, 3, 4].map((i) => {
            const gy = pad.t + (i / 4) * innerH
            return (
              <g key={i}>
                <line x1={pad.l} x2={pad.l + innerW} y1={gy} y2={gy} stroke="rgb(var(--c-ink))" strokeOpacity={0.1} strokeDasharray="2 5" />
                <text x={pad.l - 8} y={gy + 3} textAnchor="end" className="fill-mute" style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}>
                  {Math.round(max - (i / 4) * max)}
                </text>
              </g>
            )
          })}

          {bars &&
            bars.values.map((v, i) => {
              if (!v) return null
              const bh = Math.max(2, (v / max) * innerH)
              return <rect key={i} x={x(i) - barW / 2} y={pad.t + innerH - bh} width={barW} height={bh} rx={barW / 2} fill={bars.color} opacity={0.85} />
            })}

          {series.map((s, si) => {
            const pts = s.values.map((v, i) => [x(i), y(v)] as [number, number])
            const d = smooth(pts)
            return (
              <g key={`${s.name}-${si}`}>
                <defs>
                  <linearGradient id={`g-${uid}-${si}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {s.area !== false && (
                  <path d={`${d} L${x(labels.length - 1)},${pad.t + innerH} L${x(0)},${pad.t + innerH} Z`} fill={`url(#g-${uid}-${si})`} />
                )}
                <path d={d} fill="none" stroke={s.color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                {pts.map((p, i) => (
                  <circle key={i} cx={p[0]} cy={p[1]} r={2.2} fill="rgb(var(--c-surface))" stroke={s.color} strokeWidth={1.6} />
                ))}
              </g>
            )
          })}

          {labels.map((l, i) =>
            i % labelStep === 0 || i === labels.length - 1 ? (
              <text
                key={`${l}-${i}`}
                x={x(i)}
                y={height - 4}
                textAnchor="middle"
                className="fill-mute"
                style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {l}
              </text>
            ) : null,
          )}
        </svg>
      )}
    </div>
  )
}

export function Sparkline({ data, color = 'rgb(var(--c-coral))', width = 62, height = 22 }: { data: number[]; color?: string; width?: number; height?: number }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const pts = data.map((d, i) => [ (i / (data.length - 1)) * width, height - 3 - ((d - min) / (max - min || 1)) * (height - 8) ] as [number, number])
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={smooth(pts)} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  )
}

export function Donut({
  data,
  size = 148,
  thickness = 16,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let acc = 0
  // fx.md A6：给每片弧一段可读文案
  const ariaSummary = `占比分布，共 ${data.length} 项：${data
    .map((d) => `${d.label} ${Math.round((d.value / total) * 100)}%`)
    .join('、')}`
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={ariaSummary}>
        <title>{ariaSummary}</title>
        {data.map((d) => {
          const len = (d.value / total) * c
          const el = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(len - 2.5, 0)} ${c}`}
              strokeDashoffset={-acc}
              strokeLinecap="butt"
            />
          )
          acc += len
          return el
        })}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[21px] font-extrabold leading-none tracking-tight text-ink">{centerValue}</span>
          <span className="mt-1 font-mono text-[9px] tracking-[0.14em] text-admin-muted">{centerLabel}</span>
        </div>
      )}
    </div>
  )
}

export function Legend({ data, className }: { data: { label: string; value?: number | string; color: string }[]; className?: string }) {
  return (
    <ul className={cn('space-y-2', className)}>
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-2 text-[11.5px]">
          <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: d.color }} />
          <span className="flex-1 text-ink/60">{d.label}</span>
          {d.value !== undefined && <span className="font-mono text-[10.5px] font-medium text-ink">{d.value}</span>}
        </li>
      ))}
    </ul>
  )
}

export function Meter({ value, color = 'rgb(var(--c-coral))', className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full border border-ink/20 bg-paper', className)}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  )
}

export function MiniBars({ data, color = 'rgb(var(--c-coral))', height = 56 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {data.map((d, i) => (
        <span
          key={i}
          className="flex-1 rounded-t-[2px]"
          style={{ height: `${Math.max((d / max) * 100, 3)}%`, background: color, opacity: 0.35 + (d / max) * 0.65 }}
        />
      ))}
    </div>
  )
}

/* --------------------------------- table ---------------------------------- */

export function TableHead({ cols, template }: { cols: string[]; template: string }) {
  return (
    <div
      className="grid items-center gap-3 border-b-1.5 border-ink/25 bg-sand px-4 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink/70"
      style={{ gridTemplateColumns: template }}
    >
      {cols.map((c, i) => (
        <span key={c} className={i === cols.length - 1 ? 'text-right' : ''}>
          {c}
        </span>
      ))}
    </div>
  )
}

export function EmptyState({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
      <p className="font-hand text-[21px] text-coral">{title}</p>
      {desc && <p className="mt-0.5 text-[11px] text-admin-muted">{desc}</p>}
    </div>
  )
}

/**
 * 列表三态（加载 / 错误 / 内容）。
 * 真实模式下列表失败不再静默回落演示数据，而是给出可重试的明确错误。
 */
export function LoadState({
  loading,
  error,
  onRetry,
  label = '正在加载…',
  children,
}: {
  loading?: boolean
  error?: string
  onRetry?: () => void
  label?: string
  children: ReactNode
}) {
  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 px-4 py-12 text-[11.5px] text-admin-muted">
        <Loader2 size={14} className="animate-spin" />
        {label}
      </div>
    )
  }
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center gap-2.5 px-4 py-10 text-center">
        <p className="max-w-[420px] text-[11.5px] leading-relaxed text-admin-danger">{error}</p>
        {onRetry && (
          <AButton size="sm" icon={<RefreshCw size={12} />} onClick={onRetry}>
            重试
          </AButton>
        )}
      </div>
    )
  }
  return <>{children}</>
}

/** 未接服务端时的统一只读说明：写操作禁用，且不伪装成功 */
export function ReadOnlyNotice({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border-1.5 border-dashed border-warning/60 bg-warning/10 px-3 py-2 text-[11px] leading-relaxed text-ink">
      <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-admin-warning">
        <LockKeyhole size={12} /> READ ONLY
      </span>
      <span className="text-ink/75">{children}</span>
    </div>
  )
}

/* --------------------------------- inputs --------------------------------- */

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-admin-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-admin-muted">{hint}</span>}
    </label>
  )
}

const inputBase =
  'mt-1.5 w-full rounded-xl border-1.5 border-ink/20 bg-cream px-3 py-2 text-[12.5px] text-ink outline-none transition placeholder:text-admin-muted focus:border-ink focus:shadow-hard-sm disabled:bg-sand/50 disabled:text-admin-muted'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, props.className)} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputBase, 'min-h-[88px] resize-y leading-relaxed', props.className)} />
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={cn(inputBase, 'appearance-none pr-8', props.className)}>
        {children}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 mt-0.5 -translate-y-1/2 text-admin-muted" />
    </div>
  )
}

/* --------------------------------- modal ---------------------------------- */

export function AdminModal({
  open,
  onClose,
  title,
  desc,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  desc?: string
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // fx.md A1：后台弹层同样要焦点陷阱 + 关闭后归还焦点
  useFocusTrap(open, panelRef)
  useScrollLock(open)

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-admin-ink/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn('relative z-10 w-full overflow-hidden rounded-[22px] border-1.5 border-ink bg-cream shadow-hard-lg outline-none', width)}
          >
            <div className="flex items-start justify-between gap-4 border-b border-ink/15 px-5 py-3.5">
              <div>
                <h3 className="font-display text-[16px] font-extrabold text-ink">{title}</h3>
                {desc && <p className="mt-0.5 text-[11px] text-admin-muted">{desc}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="关闭"
                className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border-1.5 border-ink bg-paper text-ink transition hover:rotate-90 hover:bg-coral"
              >
                <X size={14} />
              </button>
            </div>
            <div className="max-h-[64vh] overflow-y-auto px-5 py-4 no-scrollbar">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-ink/15 bg-paper px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ---------------------------------- misc ---------------------------------- */

export function PageTitle({ kicker, title, desc, right }: { kicker: string; title: string; desc?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-admin-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" />
          {kicker}
        </p>
        <h1 className="mt-1.5 font-display text-[28px] font-extrabold leading-none tracking-tight text-ink sm:text-[32px]">{title}</h1>
        {desc && <p className="mt-2 text-[11.5px] text-admin-muted">{desc}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder = '搜索…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 rounded-full border-1.5 border-ink/20 bg-cream px-3 py-1.5 transition focus-within:border-ink', className)}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-admin-muted">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[11.5px] outline-none placeholder:text-admin-muted"
      />
    </div>
  )
}
