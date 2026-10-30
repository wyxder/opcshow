import { useEffect, useState } from 'react'
import { readStored, writeStored, type StorageKey, type Validator } from '@/lib/storage'

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

/**
 * 本地持久化 state。key 必须来自 STORAGE_KEYS（带版本、集中管理），
 * validate 用来挡住旧版本 / 被改坏的脏数据，失败直接回落 initial。
 */
export function useLocalStorage<T>(key: StorageKey, initial: T, validate?: Validator<T>) {
  const [value, setValue] = useState<T>(() => readStored(key, initial, validate))

  useEffect(() => {
    writeStored(key, value)
  }, [key, value])

  return [value, setValue] as const
}

/**
 * 全站唯一 id 生成器（fx.md R6）。
 * 之前 10+ 处用 `Date.now()`，连点 / 同一帧内会撞 key。
 * crypto.randomUUID 在非安全上下文可能不可用，退化成时间 + 随机。
 */
export function newId(prefix?: string) {
  const c = typeof crypto !== 'undefined' ? crypto : undefined
  const raw =
    c && typeof c.randomUUID === 'function'
      ? c.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  return prefix ? `${prefix}-${raw}` : raw
}

/**  prefers-reduced-motion 的实时读取（fx.md R2：把死代码真正用起来）  */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = () => setMatches(mql.matches)
    handler()
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])
  return matches
}

export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')

export function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Equirectangular projection into a 0..1 box, used by the travel map. */
export function projectLonLat(lon: number, lat: number, box = { lon: [75, 135], lat: [16, 48] }) {
  const x = (lon - box.lon[0]) / (box.lon[1] - box.lon[0])
  const y = 1 - (lat - box.lat[0]) / (box.lat[1] - box.lat[0])
  return { x: Math.min(Math.max(x, 0.02), 0.98), y: Math.min(Math.max(y, 0.02), 0.98) }
}

export function daysBetween(from: string, to = new Date()) {
  const start = new Date(from).getTime()
  return Math.max(0, Math.floor((to.getTime() - start) / 86400000))
}

/** 给彩色背景挑一个可读的前景色。令牌色（rgb(var(--c-*))）直接用 --c-on-accent。 */
export function readableInk(color: string) {
  const hex = /^#([0-9a-fA-F]{6})$/.exec(color.trim())
  if (!hex) return 'rgb(var(--c-on-accent))'
  const clean = hex[1]
  const r = parseInt(clean.slice(0, 2), 16) || 0
  const g = parseInt(clean.slice(2, 4), 16) || 0
  const b = parseInt(clean.slice(4, 6), 16) || 0
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.62 ? 'rgb(var(--c-ink))' : 'rgb(var(--c-surface))'
}
