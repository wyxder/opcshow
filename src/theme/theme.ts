/**
 * 主题目录 —— 唯一的一份主题清单（5 套）。
 * 令牌「数值」在 src/index.css 的 [data-theme='xx'] 块里，这里只放元信息与读写逻辑，
 * 避免同一份色板出现两处来源。
 */

export type ThemeId = 'paper' | 'lab' | 'swiss' | 'terminal' | 'pop'

export type ThemeMeta = {
  id: ThemeId
  /** 预览稿里的编号，切换器上直接显示 */
  no: string
  name: string
  en: string
  note: string
}

export const THEMES: ThemeMeta[] = [
  { id: 'paper', no: '01', name: '纸感极简', en: 'PAPER & INK', note: '暖纸墨黑 · 荧光黄绿 · 硬边硬投影' },
  { id: 'lab', no: '02', name: '实验室科技', en: 'LAB PROTOCOL', note: '冷白实验台 · 电蓝与青 · 精密网格' },
  { id: 'swiss', no: '03', name: '瑞士国际', en: 'SWISS GRID', note: '纯白黑字 · 血红强调 · 零圆角' },
  { id: 'terminal', no: '05', name: '终端极客', en: 'TERMINAL GREEN', note: '近黑底 · 荧光绿 · 等宽字体' },
  { id: 'pop', no: '06', name: '设计师青春', en: 'DESIGNER POP', note: '奶油粉 · 糖果色 · 大圆角' },
]

export const DEFAULT_THEME: ThemeId = 'paper'
export const THEME_STORAGE_KEY = 'wyx:theme'

/** 切换器色板预览用的令牌（顺序：底色 / 纸面 / 文字 / 主强调 / 次强调） */
export const SWATCH_TOKENS = ['--c-bg', '--c-surface', '--c-ink', '--c-lime', '--c-coral'] as const

const IDS = THEMES.map((t) => t.id)

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (IDS as string[]).includes(value)
}

export function readStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeId(stored)) return stored
  } catch {
    /* 隐私模式下读取会抛错，直接退回默认主题 */
  }
  return DEFAULT_THEME
}

/** 把主题落到 <html data-theme>，并同步移动端浏览器主题色 */
export function applyTheme(id: ThemeId) {
  const root = document.documentElement
  root.setAttribute('data-theme', id)
  const bg = getComputedStyle(root).getPropertyValue('--c-bg').trim()
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta && bg) meta.setAttribute('content', `rgb(${bg})`)
}

/** 读取当前主题下的令牌实际值，供后台「设计变量」面板展示 */
export function readTokens(tokens: string[]): Record<string, string> {
  const styles = getComputedStyle(document.documentElement)
  return tokens.reduce<Record<string, string>>((acc, key) => {
    const raw = styles.getPropertyValue(key).trim()
    acc[key] = raw ? `rgb(${raw})` : ''
    return acc
  }, {})
}
