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
  corsOrigins: list(process.env.API_CORS_ORIGIN, 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173'),
  adminUser: process.env.ADMIN_USER || 'admin',
  adminPass: process.env.ADMIN_PASS || 'wyx-admin-2026',
  editorUser: process.env.EDITOR_USER || 'editor',
  editorPass: process.env.EDITOR_PASS || 'wyx-editor-2026',
  sessionTtlMs: num(process.env.SESSION_TTL_MS, 7 * 24 * 3600 * 1000),
  cookieSecure: process.env.COOKIE_SECURE === '1',
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
