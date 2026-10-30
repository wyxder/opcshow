import { useEffect, type RefObject } from 'react'

/**
 * 弹层可访问性（fx.md A1）。
 * 打开时：记住触发元素 → 聚焦弹层内第一个可交互元素（可用 data-autofocus 指定）；
 * Tab / Shift+Tab：焦点循环约束在弹层内；
 * 关闭时：焦点归还给触发元素。
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function isFocusable(el: HTMLElement) {
  if (el.hasAttribute('inert') || el.getAttribute('aria-hidden') === 'true') return false
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
}

export function useFocusTrap(active: boolean, containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const raf = requestAnimationFrame(() => {
      // 已经聚焦到弹层内部（例如 input autoFocus）就不要抢焦点
      if (container.contains(document.activeElement)) return
      const target =
        container.querySelector<HTMLElement>('[data-autofocus]') ??
        Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).find(isFocusable)
      target?.focus()
    })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isFocusable)
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement as HTMLElement | null
      const inside = current ? container.contains(current) : false
      if (e.shiftKey && (!inside || current === first)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (!inside || current === last)) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown, true)
      // 归还焦点：只在触发元素还活着的时候做，否则会把焦点丢到 detached 节点上
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus()
    }
  }, [active, containerRef])
}

/** 弹层打开时锁住背景滚动，关闭后恢复原值 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [active])
}
