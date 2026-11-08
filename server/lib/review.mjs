/**
 * 投稿审核规则的唯一生效点（后台「互动审核 → 审核规则」）。
 *
 * 之前 settings.reviewRules 只是被存下来，投稿端完全没读，导致后台配置形同虚设。
 * 这里把「内置敏感词 + 后台自定义黑名单 + 长度 + 需登录 + 自动通过」收敛成一个判定，
 * 留言 / 弹幕共用，保证后台改了规则立刻对真实投稿生效。
 */
import { getStores } from './store.mjs'
import { containsBlocked } from './validate.mjs'

export const DEFAULT_REVIEW_RULES = {
  autoApprove: false,
  keywordBlacklist: ['广告', '博彩', '代开发票'],
  maxLength: 200,
  requireLogin: false,
}

export async function getReviewRules() {
  const data = await (await getStores()).settings.read()
  return { ...DEFAULT_REVIEW_RULES, ...(data.reviewRules ?? {}) }
}

/**
 * @param {string} value 投稿正文
 * @param {{ authenticated?: boolean }} opts 访客是否已登录（requireLogin 用）
 * @returns {{ status, flagged, autoApproved, reject, reasons, matched, maxLength }}
 */
export async function evaluateSubmission(value, { authenticated = false } = {}) {
  const rules = await getReviewRules()
  const lower = String(value).toLowerCase()
  const custom = (Array.isArray(rules.keywordBlacklist) ? rules.keywordBlacklist : [])
    .map((w) => String(w).trim())
    .filter((w) => w && lower.includes(w.toLowerCase()))
  const builtinHit = containsBlocked(value)
  const flagged = builtinHit || custom.length > 0
  const reasons = []
  if (builtinHit) reasons.push('命中内置敏感词')
  if (custom.length) reasons.push(`命中黑名单关键词：${[...new Set(custom)].join('、')}`)
  if (flagged) reasons.push('转人工审核')

  const maxLength = Number(rules.maxLength) || DEFAULT_REVIEW_RULES.maxLength
  const tooLong = value.length > maxLength
  if (tooLong) reasons.push(`超过最大长度 ${maxLength} 字`)

  const needLogin = Boolean(rules.requireLogin) && !authenticated
  if (needLogin) reasons.push('当前规则要求登录后投稿')

  // 超限直接拒绝；命中黑名单一律不自动通过，即使开了自动审核
  const reject = tooLong || needLogin
  const autoApproved = !reject && !flagged && Boolean(rules.autoApprove)

  return {
    status: autoApproved ? 'published' : 'pending',
    flagged,
    autoApproved,
    reject,
    reasons,
    matched: [...new Set(custom)],
    maxLength,
  }
}
