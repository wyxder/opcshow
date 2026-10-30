import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Palette } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { SWATCH_TOKENS, type ThemeId } from '@/theme/theme'
import { useTheme } from '@/theme/ThemeProvider'

/**
 * 色板小样：把 data-theme 挂在自身，令牌就会在这个作用域内生效，
 * 因此不需要在 TS 里维护第二份色值。
 */
export function ThemeSwatch({ id, className }: { id: ThemeId; className?: string }) {
  return (
    <span
      data-theme={id}
      aria-hidden
      className={cn('inline-flex shrink-0 overflow-hidden rounded-full border border-ink/20', className)}
    >
      {SWATCH_TOKENS.map((token) => (
        <i key={token} className="block h-full flex-1" style={{ background: `rgb(var(${token}))` }} />
      ))}
    </span>
  )
}

/* ------------------------------ 桌面：下拉选择 ------------------------------ */
export function ThemeSwitcher({ align = 'right', className }: { align?: 'left' | 'right'; className?: string }) {
  const { theme, setTheme, themes } = useTheme()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const current = themes.find((t) => t.id === theme) ?? themes[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`切换主题，当前 ${current.name}`}
        title={`主题 · ${current.name}`}
        className="flex h-8 items-center gap-1.5 rounded-full border-1.5 border-ink/20 bg-paper px-2 text-ink/65 transition hover:border-ink/45 hover:text-ink"
      >
        <Palette size={13} className="shrink-0" />
        <span className="hidden shrink-0 font-mono text-[10px] tracking-wide xl:inline">
          {current.no} {current.name}
        </span>
        <ThemeSwatch id={current.id} className="h-3.5 w-[46px]" />
        <ChevronDown size={11} className={cn('shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={cn(
              'absolute top-[calc(100%+8px)] z-[80] w-[288px] max-w-[calc(100vw-28px)] overflow-hidden rounded-[18px] border-1.5 border-ink bg-cream p-1.5 shadow-hard',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
              <span className="font-mono text-[9px] tracking-[0.2em] text-ink/40">THEME / 5</span>
              <span className="font-mono text-[9px] text-ink/40">{current.no}</span>
            </div>

            <div role="listbox" aria-label="站点主题">
              {themes.map((t) => {
                const on = t.id === theme
                return (
                  <button
                    key={t.id}
                    role="option"
                    aria-selected={on}
                    aria-label={`主题 ${t.no} ${t.name}${on ? '，当前已启用' : ''}`}
                    onClick={() => {
                      setTheme(t.id)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors',
                      on ? 'bg-lime/25' : 'hover:bg-paper',
                    )}
                  >
                    <span className="w-5 shrink-0 font-mono text-[9.5px] text-ink/40">{t.no}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold leading-tight">{t.name}</span>
                      <span className="mt-0.5 block truncate font-mono text-[8.5px] tracking-[0.14em] text-ink/40">{t.en}</span>
                    </span>
                    <ThemeSwatch id={t.id} className="h-4 w-[56px]" />
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {on && <Check size={13} className="text-ink" />}
                    </span>
                  </button>
                )
              })}
            </div>

            <p className="border-t border-dashed border-ink/15 px-2 pb-1 pt-2 font-mono text-[9px] leading-relaxed text-ink/35">
              选择会记住，刷新和跳转都保持
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* --------------------------- 移动端：菜单内宫格 --------------------------- */
export function ThemePicker() {
  const { theme, setTheme, themes } = useTheme()

  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <p className="font-mono text-[9px] tracking-[0.22em] text-paper/45">THEME / 5</p>
        <p className="font-mono text-[9px] text-paper/35">{themes.find((t) => t.id === theme)?.no} 已启用</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {themes.map((t) => {
          const on = t.id === theme
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              aria-pressed={on}
              /* fx.md A4：选中态不能只靠颜色+图标区分，给读屏器一句完整描述 */
              aria-label={`主题 ${t.no} ${t.name}${on ? '，当前已启用' : ''}`}
              className={cn(
                'rounded-xl border px-2.5 py-2 text-left transition-colors',
                on ? 'border-lime bg-lime/15' : 'border-paper/20 active:bg-paper/10',
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[9px] text-paper/45">{t.no}</span>
                {on && <Check size={11} className="text-lime" />}
              </div>
              <p className="mt-1 truncate text-[12px] font-semibold text-paper">{t.name}</p>
              <ThemeSwatch id={t.id} className="mt-1.5 h-3 w-full" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
