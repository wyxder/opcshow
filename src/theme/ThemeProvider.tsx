import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyTheme, DEFAULT_THEME, isThemeId, MODEL_THEME_EVENT, readStoredTheme, THEME_STORAGE_KEY, THEMES, type ThemeId } from './theme'

type ThemeContextValue = {
  theme: ThemeId
  setTheme: (id: ThemeId) => void
  resetTheme: () => void
  themes: typeof THEMES
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 首屏值来自 localStorage：index.html 的内联脚本已经写好 data-theme，
  // 这里保持同一份来源，避免 hydrate 后颜色跳变。
  const [theme, setThemeState] = useState<ThemeId>(() => readStoredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((id: ThemeId) => {
    if (!isThemeId(id)) return
    setThemeState(id)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id)
    } catch {
      /* 存不下就算了，本次会话内仍然生效 */
    }
    window.dispatchEvent(new CustomEvent(MODEL_THEME_EVENT, { detail: id }))
  }, [])

  const resetTheme = useCallback(() => setTheme(DEFAULT_THEME), [setTheme])

  // 多标签页同步 + 系统级存储变更
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return
      setThemeState(isThemeId(e.newValue) ? e.newValue : DEFAULT_THEME)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo(() => ({ theme, setTheme, resetTheme, themes: THEMES }), [theme, setTheme, resetTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme 必须在 ThemeProvider 内使用')
  return ctx
}
