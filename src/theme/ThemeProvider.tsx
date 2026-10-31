import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getSiteSettings } from '@/services/settings'
import {
  DEFAULT_THEME,
  applyTheme,
  clearPersonalTheme,
  hasPersonalTheme,
  isThemeId,
  persistTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
  THEMES,
  type ThemeId,
} from './theme'

type ThemeContextValue = {
  theme: ThemeId
  setTheme: (id: ThemeId) => void
  resetTheme: () => void
  /** 访客是否显式选过主题（fx.md T5：本机覆盖 ≠ 站点缺省） */
  isPersonalChoice: boolean
  /** 清掉本机覆盖，回到「站点缺省 + 系统偏好」 */
  followSiteDefault: () => void
  themes: typeof THEMES
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 首屏值来自 localStorage / 系统偏好：index.html 的内联脚本已经写好 data-theme，
  // 这里保持同一份来源，避免 hydrate 后颜色跳变。
  const [theme, setThemeState] = useState<ThemeId>(() => readStoredTheme())
  const [isPersonalChoice, setIsPersonalChoice] = useState(() => hasPersonalTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // 站点默认主题（后台设置 → 新访客生效）；访客显式选过则尊重本机覆盖
  useEffect(() => {
    if (isPersonalChoice) return
    let alive = true
    getSiteSettings().then((site) => {
      if (!alive || !site?.defaultTheme || !isThemeId(site.defaultTheme)) return
      setThemeState((cur) => (cur === site.defaultTheme ? cur : (site.defaultTheme as ThemeId)))
    })
    return () => {
      alive = false
    }
    // 只在首次挂载读一次；isPersonalChoice 变化由用户主动切换处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setTheme = useCallback((id: ThemeId) => {
    if (!isThemeId(id)) return
    // fx.md T3：只在切换这一瞬间挂过渡类，200ms 后摘掉，不污染 hover
    const root = document.documentElement
    root.classList.add('theme-transition')
    window.setTimeout(() => root.classList.remove('theme-transition'), 260)
    setThemeState(id)
    setIsPersonalChoice(true)
    persistTheme(id)
  }, [])

  const resetTheme = useCallback(() => setTheme(DEFAULT_THEME), [setTheme])

  const followSiteDefault = useCallback(() => {
    clearPersonalTheme()
    setIsPersonalChoice(false)
    setThemeState(readStoredTheme())
  }, [])

  // 多标签页同步 + 系统级存储变更
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY && e.key !== null) return
      setThemeState(isThemeId(e.newValue) ? e.newValue : readStoredTheme())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, resetTheme, isPersonalChoice, followSiteDefault, themes: THEMES }),
    [theme, setTheme, resetTheme, isPersonalChoice, followSiteDefault],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme 必须在 ThemeProvider 内使用')
  return ctx
}
