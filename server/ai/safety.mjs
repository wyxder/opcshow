/**
 * AI 安全与合规（fx.md A-10）。
 *
 * · 系统提示与用户内容严格分离（prompts.buildMessages 里用 role 隔离）
 * · 注入样例检测 → 拒绝并把问题转成「问站内内容」
 * · 输出过滤：邮箱/手机号打码、敏感词屏蔽
 * · 日志脱敏：只记录长度与哈希，不落原文
 */
import { sha256 } from '../lib/http.mjs'

const INJECTION = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+.*instructions/i,
  /system\s*prompt/i,
  /reveal\s+your\s+(prompt|instructions)/i,
  /忽略(之前|以上|上面)(的)?(所有)?(指令|提示)/,
  /你现在(是|扮演)/,
  /输出(你的)?(系统)?提示词/,
  /开发者模式/,
  /(开发者|系统|内部)(指令|配置|消息|提示)/,
  /(内部|系统|后台)的?(配置|密钥|凭证|秘钥)/,
  /打印\s*(?:API\s*KEY|api\s*key|密钥)/i,
  /(扮演|假装|装作)[^，。]{0,12}(不受限制|无限制|没有限制|越狱)/,
  /\bDAN\b/,
]

const PII = [
  { re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, tag: '[email]' },
  { re: /\b1[3-9]\d{9}\b/g, tag: '[phone]' },
  { re: /\b(?:sk|ak)-[A-Za-z0-9]{12,}\b/g, tag: '[key]' },
]

export function detectInjection(text) {
  const hits = INJECTION.filter((re) => re.test(text ?? ''))
  return { flagged: hits.length > 0, count: hits.length }
}

export function redactPII(text) {
  let out = text ?? ''
  for (const { re, tag } of PII) out = out.replace(re, tag)
  return out
}

const SENSITIVE_OUT = ['忽略之前的指令', '系统提示词是', '我的密钥', 'API KEY 是']
export function filterOutput(text) {
  let out = redactPII(text ?? '')
  for (const word of SENSITIVE_OUT) out = out.split(word).join('***')
  return out
}

/** 日志里只放可关联信息，不放原文 */
export function auditPayload(message, answer) {
  return {
    inputLen: (message ?? '').length,
    inputHash: sha256(message ?? '').slice(0, 12),
    outputLen: (answer ?? '').length,
  }
}

export const INJECTION_REFUSAL =
  '这句看起来像在试图改我的规则，我不能照做。\n\n不过你可以正常问我站内内容：RAG 切片、评测指标、项目细节或简历亮点。'
