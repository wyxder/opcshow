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

/* -------------------- 桌面：横条下拉 / 移动端：色板圆钮下拉 -------------------- */
export function ThemeSwitcher({
  align = 'right',
  variant = 'bar',
  className,
}: {
  align?: 'left' | 'right'
  /** bar = 桌面端带主题名的横条；dot = 移动端顶栏的圆形色板按钮 */
  variant?: 'bar' | 'dot'
  className?: string
}) {
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

  const triggerA11y = {
    'aria-haspopup': 'listbox' as const,
    'aria-expanded': open,
    'aria-label': `切换主题，当前 ${current.name}`,
    title: `主题 · ${current.name}`,
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      {variant === 'dot' ? (
        /* 移动端：一颗装着当前主题五色的圆钮，展开时微微旋转让色条立起来 */
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          {...triggerA11y}
          className={cn(
            'group flex h-9 w-9 items-center justify-center rounded-full border-1.5 border-ink bg-cream shadow-hard-sm transition-all duration-300',
            'hover:-translate-y-0.5 active:translate-y-0 active:scale-95',
            open && '-translate-y-0.5',
          )}
        >
          <ThemeSwatch
            id={current.id}
            className={cn(
              'h-[22px] w-[22px] rounded-full border-ink/30 transition-transform duration-300',
              open ? 'rotate-90 scale-90' : 'group-hover:rotate-12',
            )}
          />
        </button>
      ) : (
        /* 桌面端：缩短为图标 + 色板胶囊（不再显示主题名，名称在展开面板里仍可见），方便紧靠搜索钮摆放 */
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          {...triggerA11y}
          className="flex h-8 items-center gap-1.5 rounded-full border-1.5 border-ink/20 bg-paper px-2 text-ink/65 transition hover:border-ink/45 hover:text-ink"
        >
          <Palette size={13} className="shrink-0" />
          <ThemeSwatch id={current.id} className="h-3.5 w-[30px]" />
          <ChevronDown size={11} className={cn('shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={cn(
              'absolute top-[calc(100%+8px)] z-[80] overflow-hidden rounded-[18px] border-1.5 border-ink bg-cream p-1.5 shadow-hard',
              variant === 'dot' ? 'w-[228px] max-w-[calc(100vw-24px)]' : 'w-[288px] max-w-[calc(100vw-28px)]',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
              <span className="font-mono text-[9px] tracking-[0.2em] text-ink/40">THEME / {themes.length}</span>
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
