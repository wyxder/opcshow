/**
 * AI 助手的跨组件小状态：浮标现在全局挂在 Layout 上，
 * 页面通过 setAssistantContext() 声明「正在阅读」，通过 openAssistant() 唤起面板。
 *
 * 单独成模块（而不是放在 AIAssistant.tsx 里）是为了让 Layout 静态依赖它时，
 * 不把助手组件本身拖进入口 chunk —— 组件仍走 React.lazy。
 */
let assistantContext = ''
const contextListeners = new Set<() => void>()

export function setAssistantContext(next: string) {
  if (assistantContext === next) return
  assistantContext = next
  contextListeners.forEach((l) => l())
}

export function subscribeAssistantContext(cb: () => void) {
  contextListeners.add(cb)
  return () => {
    contextListeners.delete(cb)
  }
}

export function getAssistantContext() {
  return assistantContext
}

/** 从任意位置打开助手（导航项、文章页按钮、?assistant=1 都用它） */
export function openAssistant() {
  window.dispatchEvent(new CustomEvent('open-assistant'))
}
