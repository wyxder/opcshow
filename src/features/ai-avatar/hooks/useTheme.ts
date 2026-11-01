/**
 * AI 分身模块的主题适配层。
 *
 * 原项目使用独立 ThemeContext + 5 套 ThemeConfig；迁移后统一读取当前站点的
 * ThemeProvider（paper / lab / swiss / terminal / pop），把站点令牌转换成
 * AI 分身组件需要的 ThemeConfig 结构，从而在全部主题下保持一致的配色。
 */
import { useEffect, useState } from 'react'
import type { ThemeConfig } from '../lib/themes'
import { useTheme as useSiteTheme } from '@/theme/ThemeProvider'

/** 把站点令牌的 "r g b" 形式转成 #rrggbb，便于拼接 alpha 后缀 */
function tripleToHex(triple: string, fallback: string): string {
  const parts = triple.trim().split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return fallback
  return '#' + parts.map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('')
}

function readToken(styles: CSSStyleDeclaration | null, name: string, fallback: string) {
  const raw = styles?.getPropertyValue(name).trim()
  return raw ? tripleToHex(raw, fallback) : fallback
}

const FALLBACKS = {
  bg: '#f4f0e6',
  surface: '#fbf8f1',
  surfaceAlt: '#eae1cf',
  ink: '#14140f',
  inkSoft: '#4a4a40',
  inkMute: '#6b6255',
  line: '#14140f',
  lime: '#c9f158',
  coral: '#ff5a2b',
  blue: '#3c5bff',
  sky: '#bfd8ff',
  teal: '#2e6b3f',
}

/** 根据当前站点主题生成 AI 分身所需的 ThemeConfig */
export function buildThemeConfig(): ThemeConfig {
  const styles = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null
  const bg = readToken(styles, '--c-bg', FALLBACKS.bg)
  const surface = readToken(styles, '--c-surface', FALLBACKS.surface)
  const surfaceAlt = readToken(styles, '--c-surface-2', FALLBACKS.surfaceAlt)
  const text = readToken(styles, '--c-ink', FALLBACKS.ink)
  const textSecondary = readToken(styles, '--c-ink-soft', FALLBACKS.inkSoft)
  const textMuted = readToken(styles, '--c-ink-mute', FALLBACKS.inkMute)
  const border = readToken(styles, '--c-line', FALLBACKS.line)
  const lime = readToken(styles, '--c-lime', FALLBACKS.lime)
  const coral = readToken(styles, '--c-coral', FALLBACKS.coral)
  const blue = readToken(styles, '--c-blue', FALLBACKS.blue)
  const sky = readToken(styles, '--c-sky', FALLBACKS.sky)
  const teal = readToken(styles, '--c-teal', FALLBACKS.teal)
  const fontSans = styles?.getPropertyValue('--ff-body').trim() || "'Inter', 'Noto Sans SC', system-ui, sans-serif"
  const fontMono = styles?.getPropertyValue('--ff-mono').trim() || "'JetBrains Mono', monospace"

  return {
    id: 'minimal',
    name: '站点主题',
    description: '跟随站点主题',
    icon: '◐',
    colors: {
      bg,
      bgAlt: surfaceAlt,
      surface,
      surfaceAlt,
      card: surface,
      cardHover: surfaceAlt,
      primary: teal,
      primaryGlow: blue,
      primaryDim: teal,
      primaryMuted: `${teal}1f`,
      accent: coral,
      accentGlow: lime,
      accentDim: coral,
      rose: coral,
      cyan: blue,
      emerald: teal,
      sky,
      text,
      textSecondary,
      textMuted,
      textDim: textMuted,
      border,
      borderLight: `${border}26`,
    },
    fonts: {
      sans: fontSans,
      mono: fontMono,
    },
    borderRadius: {
      sm: '4px',
      md: '10px',
      lg: '16px',
      xl: '22px',
      full: '9999px',
    },
    shadows: {
      glow: `0 0 30px ${teal}26`,
      card: '0 2px 12px rgba(0, 0, 0, 0.06)',
      cardHover: '0 8px 30px rgba(0, 0, 0, 0.1)',
      float: '0 20px 60px rgba(0, 0, 0, 0.12)',
    },
    glassEffect: {
      background: `${surface}d9`,
      border: `1px solid ${border}26`,
      backdropBlur: 'blur(20px)',
    },
  }
}

export function useTheme() {
  const { theme } = useSiteTheme()
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => buildThemeConfig())

  // 站点主题先写入 <html data-theme>，下一帧再读取令牌，避免取到旧配色
  useEffect(() => {
    const raf = requestAnimationFrame(() => setThemeConfig(buildThemeConfig()))
    return () => cancelAnimationFrame(raf)
  }, [theme])

  return {
    currentTheme: theme,
    themeConfig,
    isTransitioning: false,
    setTheme: () => undefined,
  }
}
