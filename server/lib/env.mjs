/**
 * 服务端配置（fx.md B-08 / B-12）。
 *
 * 约定：所有密钥只在服务端。.env 不会提交，.env.example 只写变量名。
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** 极简 .env 读取：KEY=VALUE 与 # 注释，已存在的进程变量优先 */
function loadDotEnv() {
  const file = resolve(ROOT, '.env')
  if (!existsSync(file)) return
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i === -1) continue
    const key = line.slice(0, i).trim()
    const value = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = value
  }
}
loadDotEnv()

const num = (v, fallback) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const list = (v, fallback) =>
  (v ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

export const env = {
  port: num(process.env.PORT, 8787),
  host: process.env.HOST || '127.0.0.1',
  dataDir: resolve(ROOT, process.env.API_DATA_DIR || 'server/data'),
  seedDir: resolve(ROOT, 'server/seed'),
  corsOrigins: list(process.env.API_CORS_ORIGIN, 'http://localhost:5273,http://127.0.0.1:5273,http://localhost:4173'),
  adminUser: process.env.ADMIN_USER || 'admin',
  /** BE-01：不再内置默认口令。未配置时 boot 阶段直接拒绝启动，避免「已知口令可登录」。 */
  adminPass: process.env.ADMIN_PASS || '',
  editorUser: process.env.EDITOR_USER || 'editor',
  editorPass: process.env.EDITOR_PASS || '',
  sessionTtlMs: num(process.env.SESSION_TTL_MS, 7 * 24 * 3600 * 1000),
  cookieSecure: process.env.COOKIE_SECURE === '1',
  /** BE-02：只有显式声明在反向代理后面时，才信任 X-Real-IP / X-Forwarded-For */
  trustProxy: process.env.TRUST_PROXY === '1',
  /** AI 网关（A-01）：OpenAI 兼容。没有密钥时走「站内检索回答」，不会假装接了模型 */
  ai: {
    baseUrl: process.env.AI_BASE_URL || '',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'deepseek-chat',
    timeoutMs: num(process.env.AI_TIMEOUT_MS, 25000),
    firstTokenMs: num(process.env.AI_FIRST_TOKEN_MS, 8000),
    maxOutputTokens: num(process.env.AI_MAX_OUTPUT_TOKENS, 700),
    dailyQuota: num(process.env.AI_DAILY_QUOTA, 60),
    monthlyTokenBudget: num(process.env.AI_MONTHLY_TOKEN_BUDGET, 3000000),
    pricePer1k: num(process.env.AI_PRICE_PER_1K, 0.002),
  },
  upload: {
    maxBytes: num(process.env.UPLOAD_MAX_BYTES, 50 * 1024 * 1024),
    allowedExt: list(process.env.UPLOAD_ALLOWED_EXT, 'pdf,md,zip,xlsx,fig,py,csv,pptx,docx,html,txt,png,jpg,webp,avif,svg'),
    driver: process.env.STORAGE_DRIVER || 'local',
  },
}

export const hasModelKey = () => Boolean(env.ai.apiKey && env.ai.baseUrl)

/** 启动前的配置硬校验（BE-01）：缺口令 / 用示例口令时拒绝启动，并给出可执行的修复提示。 */
export function assertSecureConfig() {
  const problems = []
  const weak = (v) => !v || v.length < 8 || v === 'change-me'
  if (weak(env.adminPass)) problems.push('ADMIN_PASS 未设置或过于简单（至少 8 位，且不能是 change-me）')
  if (weak(env.editorPass)) problems.push('EDITOR_PASS 未设置或过于简单（至少 8 位，且不能是 change-me）')
  if (!problems.length) return
  console.error('[env] 拒绝启动：' + problems.join('；'))
  console.error('[env] 修复：cp .env.example .env，然后修改 ADMIN_PASS / EDITOR_PASS（不要提交 .env）')
  process.exit(1)
}
