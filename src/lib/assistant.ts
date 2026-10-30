/**
 * AI 助手的跨组件小状态：浮标现在全局挂在 Layout 上，
 * 页面通过 setAssistantContext() 声明「正在阅读」，通过 openAssistant() 唤起面板。
 *
 * F-06：上下文从「一整个字符串」升级为结构化对象，
 * 让服务端知道用户读的是哪篇文章、哪一节，检索加权才能生效。
 *
 * 单独成模块（而不是放在 AIAssistant.tsx 里）是为了让 Layout 静态依赖它时，
 * 不把助手组件本身拖进入口 chunk —— 组件仍走 React.lazy。
 */
export type AssistantContext = {
  articleId?: string
  articleTitle?: string
  sectionId?: string
  sectionTitle?: string
}

let assistantContext: AssistantContext = {}
let contextVersion = 0
const EMPTY: AssistantContext = {}
const listeners = new Set<() => void>()

export function setAssistantContext(next: AssistantContext) {
  const same = next.articleId === assistantContext.articleId && next.sectionId === assistantContext.sectionId
  if (same) return
  assistantContext = next
  contextVersion += 1
  listeners.forEach((l) => l())
}

export function subscribeAssistantContext(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function getAssistantContext() {
  return assistantContext
}

/** useSyncExternalStore 需要稳定快照；只在版本变化时返回新引用 */
export function getAssistantContextSnapshot() {
  return contextVersion === 0 ? EMPTY : assistantContext
}

/** 拼接成给模型的一句话，例如「《RAG 工程化》 · 01 切片怎么定」 */
export function describeContext(ctx: AssistantContext): string {
  if (!ctx.articleTitle) return ''
  return ctx.sectionTitle ? `《${ctx.articleTitle}》 · ${ctx.sectionTitle}` : `《${ctx.articleTitle}》`
}

/** 从任意位置打开助手（导航项、文章页按钮、?assistant=1 都用它） */
export function openAssistant() {
  window.dispatchEvent(new CustomEvent('open-assistant'))
}
