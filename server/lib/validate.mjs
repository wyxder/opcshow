/**
 * 入参校验（fx.md B-08：zod 等价物的零依赖实现）。
 * 校验失败统一 throw {status:400, code:'INVALID_INPUT', details}。
 */

export const fail = (message, details) =>
  Object.assign(new Error(message), { status: 400, code: 'INVALID_INPUT', details })

export function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

export function text(value, { field = 'text', min = 0, max = 5000 } = {}) {
  if (typeof value !== 'string') throw fail(`${field} 必须是字符串`)
  const t = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim()
  if (t.length < min) throw fail(`${field} 至少 ${min} 个字符`)
  if (t.length > max) throw fail(`${field} 最多 ${max} 个字符`)
  return t
}

export function object(value, field = 'payload') {
  if (!isPlainObject(value)) throw fail(`${field} 必须是对象`)
  return value
}

export function oneOf(value, allowed, field = 'value') {
  if (!allowed.includes(value)) throw fail(`${field} 必须是 ${allowed.join(' / ')} 之一`)
  return value
}

export function integer(value, { field = 'value', min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) throw fail(`${field} 必须是 ${min}–${max} 的整数`)
  return n
}

export function arrayOf(value, { field = 'items', max = 100 } = {}) {
  if (!Array.isArray(value)) throw fail(`${field} 必须是数组`)
  if (value.length > max) throw fail(`${field} 最多 ${max} 项`)
  return value
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export function email(value, field = 'email') {
  const t = text(value, { field, max: 120 })
  if (!EMAIL.test(t)) throw fail(`${field} 格式不正确`)
  return t.toLowerCase()
}

const URL_RE = /^https?:\/\/[^\s]+$/i
export function httpUrl(value, field = 'url') {
  const t = text(value, { field, max: 300 })
  if (!URL_RE.test(t)) throw fail(`${field} 必须是 http(s) 链接`)
  return t
}

/** 富文本白名单：先去掉 script/style/iframe 与 on* 属性，再截断 */
export function safeHtml(value, { field = 'html', max = 20000 } = {}) {
  const raw = text(value, { field, max })
  return raw
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

/** 敏感词表（B-04）：命中进 pending 而不是直接拒绝，交人工审核 */
const BLOCKED = ['操你', '傻逼', '法轮', '赌博', '代开发票', '加微信返利']
export function containsBlocked(value) {
  return BLOCKED.some((w) => value.includes(w))
}
