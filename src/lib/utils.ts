import { useEffect, useState } from 'react'

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage full or blocked */
    }
  }, [key, value])

  return [value, setValue] as const
}

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
