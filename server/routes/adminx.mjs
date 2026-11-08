/**
 * 后台增强端点（补齐 8 个模块 / 23 个 Tab 里此前只有 UI 的功能）。
 *
 * 设计原则：
 * · 所有写操作落到 server/data/*.json，刷新/重启不丢；不返回「假装成功」
 * · 没有外部依赖的能力（CDN、收录推送、TOTP、邮件）如实返回 available:false，
 *   前端据此禁用按钮并说明原因，绝不弹「已提交」这类空 toast
 * · 统一 admin 角色；所有写操作写审计日志
 */
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { route } from '../lib/router.mjs'
import { sendJson, sendError, readJson, sha256 } from '../lib/http.mjs'
import { getStores, backupSnapshot } from '../lib/store.mjs'
import { requireRole, ROLE_ADMIN, audit, hashPassword } from '../lib/auth.mjs'
import { text, object, arrayOf } from '../lib/validate.mjs'
import { env } from '../lib/env.mjs'
import { clearAnalyticsCache } from '../lib/hits.mjs'
import { DEFAULT_REVIEW_RULES } from '../lib/review.mjs'
import { invalidate } from '../ai/indexer.mjs'
import { saveModules } from '../lib/resume.mjs'

const BACKUP_DIR = resolve(env.dataDir, 'backups')
const UPLOAD_DIR = resolve(env.dataDir, 'uploads')
const iso = () => new Date().toISOString()
const admin = (session) => requireRole(session, ROLE_ADMIN)
const ok = (res, extra = {}) => sendJson(res, 200, { ok: true, ...extra })
const rid = () => `${Date.now()}_${randomBytes(4).toString('hex')}`
const asArray = (v) => (Array.isArray(v) ? v : [])
const num = (v, d = 0) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? d : Number(v))

/* ========================================================================== *
 * 1. 账号管理（个人中心 → 账号）
 * ========================================================================== */

const publicUser = ({ passwordHash, ...u }) => ({ ...u, active: u.active !== false })

route('GET', '/api/admin/users', async ({ res, session }) => {
  admin(session)
  const data = await (await getStores()).users.read()
  sendJson(res, 200, asArray(data.users).map(publicUser))
})

route('POST', '/api/admin/users', async ({ req, res, reqId, session }) => {
  admin(session)
  const body = object(await readJson(req, 32 * 1024))
  const user = text(body.user, { field: '账号', min: 1, max: 64 })
  const password = text(body.password, { field: '密码', min: 8, max: 128 })
  const role = body.role === 'editor' ? 'editor' : 'admin'
  const store = (await getStores()).users
  const data = await store.read()
  if (asArray(data.users).some((u) => u.user === user)) return sendError(res, 409, 'DUPLICATE', '账号已存在', reqId)
  const record = { id: `u_${rid()}`, user, role, passwordHash: hashPassword(password), active: true, createdAt: iso() }
  await store.update((d) => { d.users = [...asArray(d.users), record] })
  await audit(session.user, 'admin.user.create', record.id, null, { user, role })
  sendJson(res, 201, publicUser(record))
})

route('PATCH', '/api/admin/users/:id', async ({ req, res, reqId, params, session }) => {
  admin(session)
  const body = object(await readJson(req, 32 * 1024))
  const store = (await getStores()).users
  const data = await store.read()
  const target = asArray(data.users).find((u) => u.id === params.id)
  if (!target) return sendError(res, 404, 'NOT_FOUND', '账号不存在', reqId)
  const isSelf = target.user === session.user
  if (isSelf && (body.active === false || (body.role && body.role !== 'admin'))) {
    return sendError(res, 422, 'SELF_LOCKOUT', '不能停用或降级当前登录的账号', reqId)
  }
  if (isSelf && body.role === 'editor') return sendError(res, 422, 'SELF_LOCKOUT', '不能降级当前登录的账号', reqId)
  if (body.role && !['admin', 'editor'].includes(body.role)) return sendError(res, 422, 'INVALID_ROLE', '角色只能是 admin 或 editor', reqId)
  const nextUser = body.user ? text(body.user, { field: '账号', min: 1, max: 64 }) : target.user
  if (nextUser !== target.user && asArray(data.users).some((u) => u.user === nextUser)) return sendError(res, 409, 'DUPLICATE', '账号名已被占用', reqId)
  let saved
  await store.update((d) => {
    const u = asArray(d.users).find((x) => x.id === params.id)
    if (!u) return
    if (body.user) u.user = nextUser
    if (body.role) u.role = body.role
    if (body.active !== undefined) u.active = Boolean(body.active)
    u.updatedAt = iso()
    saved = publicUser(u)
  })
  await audit(session.user, 'admin.user.update', params.id, null, { role: body.role, active: body.active, user: nextUser })
  sendJson(res, 200, saved)
})

route('DELETE', '/api/admin/users/:id', async ({ res, reqId, params, session }) => {
  admin(session)
  const store = (await getStores()).users
  const data = await store.read()
  const target = asArray(data.users).find((u) => u.id === params.id)
  if (!target) return sendError(res, 404, 'NOT_FOUND', '账号不存在', reqId)
  if (target.user === session.user) return sendError(res, 422, 'SELF_LOCKOUT', '不能删除当前登录的账号', reqId)
  if (target.role === 'admin' && asArray(data.users).filter((u) => u.role === 'admin' && u.active !== false).length <= 1) {
    return sendError(res, 422, 'LAST_ADMIN', '至少保留一个启用的管理员', reqId)
  }
  await store.update((d) => { d.users = asArray(d.users).filter((u) => u.id !== params.id) })
  const sessions = (await getStores()).sessions
  await sessions.update((d) => { d.sessions = asArray(d.sessions).filter((s) => s.user !== target.user) })
  await audit(session.user, 'admin.user.delete', params.id, null, { user: target.user })
  ok(res)
})

route('POST', '/api/admin/users/:id/reset-password', async ({ req, res, reqId, params, session }) => {
  admin(session)
  const body = await readJson(req, 32 * 1024)
  const password = body.password ? text(body.password, { field: '新密码', min: 8, max: 128 }) : randomBytes(9).toString('base64url')
  const store = (await getStores()).users
  const data = await store.read()
  if (!asArray(data.users).some((u) => u.id === params.id)) return sendError(res, 404, 'NOT_FOUND', '账号不存在', reqId)
  await store.update((d) => {
    const u = asArray(d.users).find((x) => x.id === params.id)
    if (u) { u.passwordHash = hashPassword(password); u.updatedAt = iso() }
  })
  const sessions = (await getStores()).sessions
  const who = asArray(data.users).find((u) => u.id === params.id)?.user
  await sessions.update((d) => { d.sessions = asArray(d.sessions).filter((s) => s.user !== who) })
  await audit(session.user, 'admin.user.reset-password', params.id, null, null)
  sendJson(res, 200, { ok: true, password, note: '请立即保存，明文只返回这一次；该账号的其它会话已全部撤销' })
})

/* ========================================================================== *
 * 2. 安全：API 令牌 / IP 白名单 / 登录日志 / 能力清单
 * ========================================================================== */

const settingsStore = async () => (await getStores()).settings

route('GET', '/api/admin/tokens', async ({ res, session }) => {
  admin(session)
  const data = await (await settingsStore()).read()
  sendJson(res, 200, asArray(data.tokens).map(({ hash, ...t }) => t))
})

route('POST', '/api/admin/tokens', async ({ req, res, session }) => {
  admin(session)
  const body = await readJson(req, 16 * 1024)
  const name = text(body.name ?? '未命名令牌', { field: '名称', min: 1, max: 60 })
  const token = `wyx_${randomBytes(24).toString('hex')}`
  const record = { id: `tok_${rid()}`, name, prefix: token.slice(0, 12), hash: sha256(token), createdAt: iso(), lastUsedAt: null, revoked: false }
  await (await settingsStore()).update((d) => {
    d.tokens = [...asArray(d.tokens), record].slice(-50)
    d.updatedAt = iso()
  })
  await audit(session.user, 'admin.token.create', record.id, null, { name })
  sendJson(res, 201, { ...record, hash: undefined, token })
})

route('DELETE', '/api/admin/tokens/:id', async ({ res, reqId, params, session }) => {
  admin(session)
  const store = await settingsStore()
  if (!asArray((await store.read()).tokens).some((t) => t.id === params.id)) return sendError(res, 404, 'NOT_FOUND', '令牌不存在', reqId)
  await store.update((d) => {
    const t = asArray(d.tokens).find((x) => x.id === params.id)
    if (t) { t.revoked = true; t.revokedAt = iso() }
  })
  await audit(session.user, 'admin.token.revoke', params.id, null, null)
  ok(res)
})

route('GET', '/api/admin/ip-guard', async ({ res, session }) => {
  admin(session)
  const data = await (await settingsStore()).read()
  sendJson(res, 200, data.ipGuard ?? { enabled: false, cidrs: [] })
})

route('PUT', '/api/admin/ip-guard', async ({ req, res, session }) => {
  admin(session)
  const body = await readJson(req, 32 * 1024)
  const cidrs = asArray(body.cidrs).map((x) => String(x).trim()).filter(Boolean).slice(0, 50)
  const value = { enabled: Boolean(body.enabled), cidrs, updatedAt: iso() }
  await (await settingsStore()).update((d) => { d.ipGuard = value; d.updatedAt = iso() })
  await audit(session.user, 'admin.ip-guard.update', 'ipGuard', null, value)
  sendJson(res, 200, value)
})

route('GET', '/api/admin/security/logins', async ({ res, url, session }) => {
  admin(session)
  const data = await (await getStores()).audit.read()
  const limit = Math.min(num(url.searchParams.get('limit'), 30), 100)
  const rows = asArray(data.logs).filter((l) => /^auth\.(login|logout|password)/.test(l.action)).slice(0, limit)
  sendJson(res, 200, rows)
})

/** 能力清单：前端据此禁用确实不具备的能力，不再弹「未接入」空 toast */
route('GET', '/api/admin/capabilities', async ({ res, session }) => {
  admin(session)
  sendJson(res, 200, {
    email: { available: false, reason: '未配置 SMTP / 邮件服务' },
    totp: { available: false, reason: '未接 TOTP 认证器与密钥托管' },
    oauth: { available: false, reason: '未接入第三方 OAuth 应用' },
    cdn: { available: false, reason: '静态资源由构建期生成，本站没有 CDN 刷新接口' },
    searchConsole: { available: false, reason: '未接入搜索引擎推送凭据' },
    pdfParse: { available: false, reason: 'PDF / DOCX 解析需要 pdfjs / mammoth，当前仅支持纯文本' },
    modelFailover: { available: true, reason: '可切换 ai.json 中的默认模型' },
    backupExport: { available: true },
    backupImport: { available: true },
    deviceStats: { available: true, reason: '埋点仅存 UA 粗分的设备类别（手机/平板/桌面），不保存原始 UA；启用前采集的历史样本没有该字段' },
  })
})

/* ========================================================================== *
 * 3. 备份：下载 / 导入 / 配置导出导入 / 计划 / 清理 / 静态资源
 * ========================================================================== */

const safeBackupId = (id) => /^backup-[\w.-]+\.json$/.test(id) && !id.includes('..')

route('GET', '/api/admin/backup/:id/download', async ({ res, reqId, params, session }) => {
  admin(session)
  if (!safeBackupId(params.id)) return sendError(res, 404, 'NOT_FOUND', '备份不存在', reqId)
  const full = join(BACKUP_DIR, params.id)
  if (!existsSync(full)) return sendError(res, 404, 'NOT_FOUND', '备份不存在', reqId)
  const content = await readFile(full, 'utf8')
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="${params.id}"`,
    'Cache-Control': 'no-store',
  })
  res.end(content)
})

route('POST', '/api/admin/backup/import', async ({ req, res, reqId, session }) => {
  admin(session)
  const body = await readJson(req, 32 * 1024 * 1024)
  const snapshot = body.snapshot && typeof body.snapshot === 'object' ? body.snapshot : body
  // 至少要有内容或用户数据，避免把空对象当备份写进去
  if (!snapshot || typeof snapshot !== 'object' || (!snapshot.content && !snapshot.users)) {
    return sendError(res, 422, 'INVALID_SNAPSHOT', '不是有效的备份快照（缺少 content / users）', reqId)
  }
  await mkdir(BACKUP_DIR, { recursive: true })
  const name = `backup-import-${iso().replace(/[:.]/g, '-')}.json`
  const payload = JSON.stringify({ createdAt: body.createdAt ?? iso(), snapshot })
  await writeFile(join(BACKUP_DIR, name), payload, 'utf8')
  await audit(session.user, 'backup.import', name, null, { bytes: payload.length })
  sendJson(res, 201, { id: name, createdAt: iso(), bytes: payload.length, note: '已导入备份列表，可在列表里执行恢复' })
})

/** 只导出可迁移的配置，不含账号口令、会话、埋点明细 */
route('GET', '/api/admin/config/export', async ({ res, session }) => {
  admin(session)
  const s = await getStores()
  const [settings, ai, resume, content] = await Promise.all([s.settings.read(), s.ai.read(), s.resume.read(), s.content.read()])
  sendJson(res, 200, {
    version: 1,
    exportedAt: iso(),
    // 尚未在后台保存过时回落到内容种子，避免导出一份空配置
    site: settings.site ?? content.siteMeta ?? null,
    profile: settings.profile ?? content.profile ?? null,
    ipGuard: settings.ipGuard ?? null,
    reviewRules: settings.reviewRules ?? null,
    backupPlan: settings.backupPlan ?? null,
    prompts: asArray(ai.prompts),
    aiSettings: ai.settings ?? null,
    globalConstraint: ai.globalConstraint ?? '',
    resumeModules: asArray(resume.modules),
  })
})

route('POST', '/api/admin/config/import', async ({ req, res, reqId, session }) => {
  admin(session)
  const body = object(await readJson(req, 8 * 1024 * 1024))
  if (!body || typeof body !== 'object' || body.version !== 1) return sendError(res, 422, 'INVALID_CONFIG', '不是本后台导出的配置（version 必须为 1）', reqId)
  const s = await getStores()
  const applied = []
  if (body.site || body.profile || body.ipGuard || body.reviewRules || body.backupPlan) {
    await s.settings.update((d) => {
      for (const key of ['site', 'profile', 'ipGuard', 'reviewRules', 'backupPlan']) {
        if (body[key] && typeof body[key] === 'object') { d[key] = body[key]; applied.push(key) }
      }
      if (typeof body.globalConstraint === 'string') applied.push('globalConstraint')
      d.updatedAt = iso()
    })
  }
  if (asArray(body.prompts).length || body.aiSettings || typeof body.globalConstraint === 'string') {
    await s.ai.update((d) => {
      if (asArray(body.prompts).length) { d.prompts = body.prompts; applied.push('prompts') }
      if (body.aiSettings && typeof body.aiSettings === 'object') { d.settings = body.aiSettings; applied.push('aiSettings') }
      if (typeof body.globalConstraint === 'string') d.globalConstraint = body.globalConstraint
    })
  }
  if (asArray(body.resumeModules).length) {
    await saveModules(body.resumeModules, session.user)
    applied.push('resumeModules')
  }
  invalidate()
  await audit(session.user, 'admin.config.import', 'config', null, { applied })
  ok(res, { applied: [...new Set(applied)] })
})

route('GET', '/api/admin/backup-plan', async ({ res, session }) => {
  admin(session)
  const data = await (await settingsStore()).read()
  sendJson(res, 200, data.backupPlan ?? { enabled: false, time: '03:00', retain: 7, lastRunAt: null, note: '站内计划仅记录配置；真正定时执行需外部调度器调用 POST /api/admin/backup' })
})

route('PUT', '/api/admin/backup-plan', async ({ req, res, session }) => {
  admin(session)
  const body = await readJson(req, 16 * 1024)
  const value = {
    enabled: Boolean(body.enabled),
    time: /^\d{2}:\d{2}$/.test(body.time) ? body.time : '03:00',
    retain: Math.min(Math.max(num(body.retain, 7), 1), 60),
    lastRunAt: (await (await settingsStore()).read()).backupPlan?.lastRunAt ?? null,
    note: '站内计划仅记录配置；真正定时执行需外部调度器调用 POST /api/admin/backup',
  }
  await (await settingsStore()).update((d) => { d.backupPlan = value; d.updatedAt = iso() })
  await audit(session.user, 'admin.backup-plan.update', 'backupPlan', null, value)
  sendJson(res, 200, value)
})

route('POST', '/api/admin/backup/cleanup', async ({ req, res, session }) => {
  admin(session)
  const body = await readJson(req, 16 * 1024)
  const keep = Math.min(Math.max(num(body.keep, 7), 1), 50)
  await mkdir(BACKUP_DIR, { recursive: true })
  const names = (await readdir(BACKUP_DIR)).filter((n) => n.endsWith('.json')).sort().reverse()
  const removed = names.slice(keep)
  for (const name of removed) await rm(join(BACKUP_DIR, name), { force: true })
  await audit(session.user, 'backup.cleanup', 'backups', null, { removed: removed.length })
  ok(res, { removed: removed.length, kept: Math.min(names.length, keep) })
})

/** 静态资源信息：版本来自真实构建产物（public/ 下资源修改时间），不编造命中率 */
route('GET', '/api/admin/assets', async ({ res, session }) => {
  admin(session)
  const data = await (await settingsStore()).read()
  const indexHtml = resolve(env.dataDir, '../../index.html')
  let builtAt = null
  try { builtAt = (await stat(indexHtml)).mtime.toISOString() } catch { /* 生产构建产物不存在时如实返回 null */ }
  sendJson(res, 200, {
    version: builtAt ? `build-${builtAt.slice(0, 10).replace(/-/g, '.')}` : 'dev',
    builtAt,
    refreshedAt: data.assetsRefreshedAt ?? null,
    cdnAvailable: false,
    note: '静态资源由构建期生成；本站没有 CDN，缓存标记仅用于记录一次手动刷新',
  })
})

route('POST', '/api/admin/assets/refresh', async ({ res, session }) => {
  admin(session)
  const at = iso()
  await (await settingsStore()).update((d) => { d.assetsRefreshedAt = at; d.updatedAt = at })
  await audit(session.user, 'admin.assets.refresh', 'assets', null, { at })
  ok(res, { refreshedAt: at, note: '已记录刷新时间；本站无 CDN，未向外部服务提交任何请求' })
})

/* ========================================================================== *
 * 4. AI 配置：用量清零 / 缓存 / 配额 / 全局约束 / 故障切换 / 真实日志
 * ========================================================================== */

route('POST', '/api/admin/ai/usage/reset', async ({ res, session }) => {
  admin(session)
  const store = (await getStores()).ai
  const before = (await store.read()).usage.length
  await store.update((d) => { d.usage = []; d.quota = {} })
  clearAnalyticsCache()
  await audit(session.user, 'ai.usage.reset', 'usage', null, { cleared: before })
  ok(res, { cleared: before })
})

route('DELETE', '/api/admin/ai/cache', async ({ res, session }) => {
  admin(session)
  const store = (await getStores()).ai
  const before = Object.keys((await store.read()).cache ?? {}).length
  await store.update((d) => { d.cache = {} })
  await audit(session.user, 'ai.cache.clear', 'cache', null, { cleared: before })
  ok(res, { cleared: before })
})

const aiSettingsStore = async () => (await getStores()).ai

route('GET', '/api/admin/ai/settings', async ({ res, session }) => {
  admin(session)
  const data = await (await aiSettingsStore()).read()
  sendJson(res, 200, {
    dailyQuota: num(data.settings?.dailyQuota, env.ai.dailyQuota),
    monthlyTokenBudget: num(data.settings?.monthlyTokenBudget, env.ai.monthlyTokenBudget),
    perVisitorDailyLimit: num(data.settings?.perVisitorDailyLimit, num(data.settings?.dailyQuota, env.ai.dailyQuota)),
    globalConstraint: data.globalConstraint ?? '',
    fallbackModelId: data.settings?.fallbackModelId ?? null,
    updatedAt: data.settings?.updatedAt ?? null,
    note: '保存后对真实请求立即生效：dailyQuota=全站每日总次数，perVisitorDailyLimit=单访客每日上限，monthlyTokenBudget=月度 token 预算；未保存时回落到 .env',
  })
})

route('PUT', '/api/admin/ai/settings', async ({ req, res, session }) => {
  admin(session)
  const body = await readJson(req, 64 * 1024)
  const store = await aiSettingsStore()
  const current = await store.read()
  const value = {
    dailyQuota: Math.min(Math.max(num(body.dailyQuota, num(current.settings?.dailyQuota, env.ai.dailyQuota)), 1), 100000),
    monthlyTokenBudget: Math.min(Math.max(num(body.monthlyTokenBudget, num(current.settings?.monthlyTokenBudget, env.ai.monthlyTokenBudget)), 1000), 1e9),
    perVisitorDailyLimit: Math.min(Math.max(num(body.perVisitorDailyLimit, num(current.settings?.perVisitorDailyLimit, num(current.settings?.dailyQuota, env.ai.dailyQuota))), 1), 10000),
    fallbackModelId: body.fallbackModelId ? String(body.fallbackModelId).slice(0, 80) : null,
    updatedAt: iso(),
  }
  await store.update((d) => {
    d.settings = value
    if (typeof body.globalConstraint === 'string') d.globalConstraint = body.globalConstraint.slice(0, 4000)
  })
  await audit(session.user, 'ai.settings.update', 'settings', null, value)
  sendJson(res, 200, { ...value, globalConstraint: typeof body.globalConstraint === 'string' ? body.globalConstraint.slice(0, 4000) : current.globalConstraint ?? '' })
})

route('GET', '/api/admin/ai/logs', async ({ res, url, session }) => {
  admin(session)
  const data = await (await aiSettingsStore()).read()
  const limit = Math.min(num(url.searchParams.get('limit'), 50), 200)
  sendJson(res, 200, asArray(data.usage).slice(0, limit).map((u) => ({
    id: u.id, ts: u.ts, day: u.day, model: u.model, tokens: u.tokens,
    latency: u.latency, source: u.source, ok: u.ok !== false, cost: u.cost,
  })))
})

route('POST', '/api/admin/ai/failover', async ({ req, res, reqId, session }) => {
  admin(session)
  const body = await readJson(req, 16 * 1024)
  const store = await aiSettingsStore()
  const data = await store.read()
  const models = asArray(data.models)
  const target = body.modelId ? models.find((m) => m.id === body.modelId) : models.find((m) => m.enabled && !m.isDefault)
  if (!target) return sendError(res, 422, 'NO_FALLBACK', '没有可用的备用模型：请先在「模型」页启用至少一个模型', reqId)
  await store.update((d) => {
    asArray(d.models).forEach((m) => { m.isDefault = m.id === target.id; if (m.id === target.id) m.enabled = true })
    d.settings = { ...(d.settings ?? {}), fallbackModelId: target.id, updatedAt: iso() }
  })
  invalidate()
  await audit(session.user, 'ai.failover', target.id, null, { model: target.model })
  ok(res, { modelId: target.id, model: target.model, name: target.name })
})

/* ========================================================================== *
 * 5. 文件资源：真实用量 / 批量清空回收站 / 清理 / 重复检测
 * ========================================================================== */

async function storageReport() {
  const data = await (await getStores()).files.read()
  const files = asArray(data.files).filter((f) => f.status !== 'deleted')
  const shares = asArray(data.shares)
  let uploadsBytes = 0
  let orphanBytes = 0
  const orphans = []
  const diskFiles = existsSync(UPLOAD_DIR) ? await readdir(UPLOAD_DIR) : []
  const usedKeys = new Set(files.map((f) => f.storageKey).filter(Boolean))
  for (const name of diskFiles) {
    try {
      const s = await stat(join(UPLOAD_DIR, name))
      if (!s.isFile()) continue
      uploadsBytes += s.size
      if (!usedKeys.has(name)) { orphanBytes += s.size; orphans.push({ name, sizeBytes: s.size }) }
    } catch { /* 文件可能刚被删除 */ }
  }
  let tmpBytes = 0
  const tmpFiles = []
  for (const name of existsSync(env.dataDir) ? await readdir(env.dataDir) : []) {
    if (!/\.tmp$|\.bak$/.test(name)) continue
    try {
      const s = await stat(join(env.dataDir, name))
      tmpBytes += s.size
      tmpFiles.push({ name, sizeBytes: s.size })
    } catch { /* ignore */ }
  }
  const expired = shares.filter((s) => s.expiresAt && new Date(s.expiresAt).getTime() < Date.now())
  const byCategory = {}
  for (const f of files) {
    const k = f.category || '未分类'
    byCategory[k] = (byCategory[k] ?? 0) + num(f.sizeBytes)
  }
  return {
    totalBytes: files.reduce((s, f) => s + num(f.sizeBytes), 0),
    uploadsBytes, orphanBytes, orphans: orphans.length, orphanList: orphans.slice(0, 20),
    tmpBytes, tmpCount: tmpFiles.length, tmpList: tmpFiles.slice(0, 20),
    byCategory,
    files: files.length,
    published: files.filter((f) => f.status === 'published').length,
    trashed: files.filter((f) => f.status === 'trashed').length,
    pending: files.filter((f) => f.status === 'pending').length,
    shares: shares.length,
    sharesExpired: expired.length,
    limits: { maxBytes: env.upload.maxBytes, allowedExt: env.upload.allowedExt, driver: env.upload.driver, dir: UPLOAD_DIR },
  }
}

route('GET', '/api/admin/files/storage', async ({ res, session }) => {
  admin(session)
  sendJson(res, 200, await storageReport())
})

route('GET', '/api/admin/files/duplicates', async ({ res, session }) => {
  admin(session)
  const data = await (await getStores()).files.read()
  const groups = new Map()
  for (const f of asArray(data.files)) {
    if (f.status === 'deleted') continue
    const key = `${f.name}|${num(f.sizeBytes)}`
    groups.set(key, [...(groups.get(key) ?? []), { id: f.id, name: f.name, sizeBytes: num(f.sizeBytes), status: f.status, createdAt: f.createdAt }])
  }
  const duplicates = [...groups.values()].filter((g) => g.length > 1)
  sendJson(res, 200, { groups: duplicates, reclaimableBytes: duplicates.reduce((s, g) => s + num(g[0].sizeBytes) * (g.length - 1), 0) })
})

route('DELETE', '/api/admin/files/trashed', async ({ res, session }) => {
  admin(session)
  const store = (await getStores()).files
  const data = await store.read()
  const targets = asArray(data.files).filter((f) => f.status === 'trashed')
  for (const f of targets) {
    if (f.storageKey) await rm(join(UPLOAD_DIR, f.storageKey), { force: true }).catch(() => {})
  }
  const ids = new Set(targets.map((f) => f.id))
  await store.update((d) => {
    d.files = asArray(d.files).filter((f) => !ids.has(f.id))
    d.shares = asArray(d.shares).filter((s) => !ids.has(s.fileId))
  })
  await audit(session.user, 'files.trash.empty', 'files', null, { removed: targets.length })
  ok(res, { removed: targets.length, freedBytes: targets.reduce((s, f) => s + num(f.sizeBytes), 0) })
})

route('POST', '/api/admin/files/cleanup', async ({ req, res, session }) => {
  admin(session)
  const body = await readJson(req, 32 * 1024)
  const doOrphans = body.orphans !== false
  const doTmp = body.tmp !== false
  const doShares = body.expiredShares !== false
  const result = { orphansRemoved: 0, bytesFreed: 0, tmpRemoved: 0, sharesRemoved: 0 }
  const store = (await getStores()).files
  if (doOrphans) {
    const data = await store.read()
    const used = new Set(asArray(data.files).map((f) => f.storageKey).filter(Boolean))
    for (const name of existsSync(UPLOAD_DIR) ? await readdir(UPLOAD_DIR) : []) {
      if (used.has(name)) continue
      try {
        const s = await stat(join(UPLOAD_DIR, name))
        if (!s.isFile()) continue
        await rm(join(UPLOAD_DIR, name), { force: true })
        result.orphansRemoved += 1
        result.bytesFreed += s.size
      } catch { /* ignore */ }
    }
  }
  if (doTmp) {
    for (const name of existsSync(env.dataDir) ? await readdir(env.dataDir) : []) {
      if (!/\.tmp$|\.bak$/.test(name)) continue
      try { await rm(join(env.dataDir, name), { force: true }); result.tmpRemoved += 1 } catch { /* ignore */ }
    }
  }
  if (doShares) {
    const before = await store.read()
    const expiredIds = new Set(asArray(before.shares).filter((s) => s.expiresAt && new Date(s.expiresAt).getTime() < Date.now()).map((s) => s.token))
    result.sharesRemoved = expiredIds.size
    if (expiredIds.size) await store.update((d) => { d.shares = asArray(d.shares).filter((s) => !expiredIds.has(s.token)) })
  }
  await audit(session.user, 'files.cleanup', 'files', null, result)
  ok(res, result)
})

/* ========================================================================== *
 * 6. 互动审核：弹幕批量审核 / 规则持久化 / 友链全量
 * ========================================================================== */

route('POST', '/api/admin/danmaku/batch-review', async ({ req, res, reqId, session }) => {
  admin(session)
  const body = await readJson(req, 64 * 1024)
  const ids = new Set(asArray(body.ids).map(String))
  const action = ['approve', 'reject', 'delete'].includes(body.action) ? body.action : null
  if (!action) return sendError(res, 422, 'INVALID_ACTION', 'action 只能是 approve / reject / delete', reqId)
  if (!ids.size) return sendError(res, 422, 'EMPTY_IDS', '没有选中任何弹幕', reqId)
  const store = (await getStores()).content
  let changed = 0
  await store.update((d) => {
    const list = d.danmaku ?? (d.danmaku = [])
    for (const item of list) {
      if (!ids.has(String(item.id))) continue
      if (action === 'delete') { item.status = 'hidden'; item.version = num(item.version, 1) + 1 }
      else { item.status = action === 'approve' ? 'published' : 'hidden'; item.version = num(item.version, 1) + 1 }
      item.reviewedBy = session.user
      item.reviewedAt = iso()
      changed += 1
    }
  })
  invalidate()
  await audit(session.user, 'danmaku.batch-review', 'danmaku', null, { action, changed })
  ok(res, { changed })
})

route('GET', '/api/admin/review-rules', async ({ res, session }) => {
  admin(session)
  const data = await (await settingsStore()).read()
  sendJson(res, 200, {
    ...DEFAULT_REVIEW_RULES,
    ...(data.reviewRules ?? {}),
    updatedAt: data.reviewRules?.updatedAt ?? null,
    appliesTo: '留言 / 弹幕投稿（POST /api/guestbook）',
  })
})

route('PUT', '/api/admin/review-rules', async ({ req, res, session }) => {
  admin(session)
  const body = await readJson(req, 32 * 1024)
  const value = {
    autoApprove: Boolean(body.autoApprove),
    keywordBlacklist: asArray(body.keywordBlacklist).map((x) => String(x).trim()).filter(Boolean).slice(0, 100),
    maxLength: Math.min(Math.max(num(body.maxLength, 200), 20), 2000),
    requireLogin: Boolean(body.requireLogin),
    updatedAt: iso(),
    appliesTo: '留言 / 弹幕投稿（POST /api/guestbook）',
  }
  await (await settingsStore()).update((d) => { d.reviewRules = value; d.updatedAt = iso() })
  await audit(session.user, 'admin.review-rules.update', 'reviewRules', null, value)
  sendJson(res, 200, value)
})

route('GET', '/api/admin/friend-requests/all', async ({ res, session }) => {
  admin(session)
  const data = await (await getStores()).content.read()
  sendJson(res, 200, asArray(data.friends).sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))))
})

/* ========================================================================== *
 * 7. 数据看板：实时快照 / 原始日志 / 导出 / 真实维度聚合
 * ========================================================================== */

function windowHits(hits, win) {
  const daysCount = win === '30d' ? 30 : 7
  const since = Date.now() - daysCount * 86400000
  return hits.filter((h) => new Date(h.ts).getTime() >= since)
}

route('GET', '/api/admin/analytics/realtime', async ({ res, session }) => {
  admin(session)
  const data = await (await getStores()).analytics.read()
  const hits = asArray(data.hits)
  const today = iso().slice(0, 10)
  const todayHits = hits.filter((h) => String(h.ts).slice(0, 10) === today)
  const recent = Date.now() - 5 * 60 * 1000
  sendJson(res, 200, {
    online: new Set(hits.filter((h) => new Date(h.ts).getTime() >= recent).map((h) => h.sessionHash ?? h.ipHash)).size,
    todayPv: todayHits.length,
    todayUv: new Set(todayHits.map((h) => h.sessionHash ?? h.ipHash)).size,
    todayAi: todayHits.filter((h) => h.kind === 'ai').length,
    totalHits: hits.length,
    generatedAt: iso(),
  })
})

route('GET', '/api/admin/analytics/logs', async ({ res, url, session }) => {
  admin(session)
  const data = await (await getStores()).analytics.read()
  const q = (url.searchParams.get('q') ?? '').toLowerCase()
  const kind = url.searchParams.get('kind') ?? ''
  const limit = Math.min(num(url.searchParams.get('limit'), 100), 500)
  const rows = asArray(data.hits)
    .filter((h) => (!kind || h.kind === kind) && (!q || String(h.path).toLowerCase().includes(q) || String(h.referrer ?? '').toLowerCase().includes(q)))
    .slice(0, limit)
    .map(({ ipHash, ...h }) => h)
  sendJson(res, 200, { items: rows, total: asArray(data.hits).length })
})

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

route('GET', '/api/admin/analytics/export', async ({ res, url, session }) => {
  admin(session)
  const data = await (await getStores()).analytics.read()
  const hits = asArray(data.hits).slice(0, Math.min(num(url.searchParams.get('limit'), 5000), 20000))
  const header = 'ts,path,kind,referrer,session,stayMs'
  const body = hits.map((h) => [h.ts, h.path, h.kind, h.referrer, h.sessionHash, h.stayMs].map(csvCell).join(',')).join('\n')
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="analytics-${iso().slice(0, 10)}.csv"`,
    'Cache-Control': 'no-store',
  })
  res.end('\uFEFF' + header + '\n' + body)
})

route('GET', '/api/admin/analytics/breakdown', async ({ res, url, session }) => {
  admin(session)
  const s = await getStores()
  const [analytics, ai] = await Promise.all([s.analytics.read(), s.ai.read()])
  const hits = windowHits(asArray(analytics.hits), url.searchParams.get('window') === '30d' ? '30d' : '7d')
  const paths = new Map()
  for (const h of hits) paths.set(h.path, (paths.get(h.path) ?? 0) + 1)
  const pageRank = [...paths.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, pv]) => ({ path, pv }))

  const referrers = new Map()
  for (const h of hits) {
    const r = String(h.referrer ?? '').trim()
    const key = !r ? '直接访问' : r.includes('127.0.0.1') || r.includes('localhost') ? '站内跳转' : new URL(r, 'http://x').hostname || '外部来源'
    referrers.set(key, (referrers.get(key) ?? 0) + 1)
  }
  const total = hits.length || 1
  const sourceShare = [...referrers.entries()].map(([name, value]) => ({ name, value, percent: Math.round((value / total) * 100) }))

  const hourly = Array.from({ length: 24 }, (_, i) => ({ hour: i, value: 0 }))
  for (const h of hits) {
    const hour = new Date(h.ts).getHours()
    if (Number.isFinite(hour)) hourly[hour].value += 1
  }

  const stay = hits.map((h) => num(h.stayMs)).filter((v) => v > 0)
  const bucket = (max) => stay.filter((v) => v <= max).length
  const readDepth = [
    { label: '<10s', value: bucket(10000) },
    { label: '10-30s', value: bucket(30000) - bucket(10000) },
    { label: '30-60s', value: bucket(60000) - bucket(30000) },
    { label: '>60s', value: stay.filter((v) => v > 60000).length },
  ]

  // 会话漏斗：按 sessionHash 分组，看是否走到内容页 / AI
  const sessions = new Map()
  for (const h of hits) {
    const k = h.sessionHash ?? h.ipHash
    if (!k) continue
    const cur = sessions.get(k) ?? { home: false, content: false, ai: false }
    if (h.path === '/' || h.path === '') cur.home = true
    if (/^\/(learn|work|life|me|project)/.test(h.path)) cur.content = true
    if (h.kind === 'ai') cur.ai = true
    sessions.set(k, cur)
  }
  const all = [...sessions.values()]
  const funnels = [
    { label: '访问会话', value: all.length },
    { label: '浏览内容', value: all.filter((x) => x.content).length },
    { label: '使用 AI', value: all.filter((x) => x.ai).length },
  ]

  const aiUsage = asArray(ai.usage)
  const bySource = {}
  for (const u of aiUsage) bySource[u.source ?? 'unknown'] = (bySource[u.source ?? 'unknown'] ?? 0) + 1
  const aiSessions = Object.entries(bySource).map(([name, value]) => ({ name, value }))

  // 设备分布：埋点只存 UA 粗分类别，启用采集前的历史 hit 没有该字段，如实给出覆盖度
  const deviceMap = new Map()
  for (const h of hits) {
    if (!h.device) continue
    deviceMap.set(h.device, (deviceMap.get(h.device) ?? 0) + 1)
  }
  const deviceSamples = [...deviceMap.values()].reduce((a, b) => a + b, 0)
  const deviceShare = [...deviceMap.entries()]
    .map(([name, value]) => ({ name, value, percent: Math.round((value / (deviceSamples || 1)) * 100) }))
    .sort((a, b) => b.value - a.value)
  const unsupported = [{ key: 'regionShare', reason: '埋点不采集 IP 归属地（隐私优先），无法统计来源地区' }]
  if (!deviceSamples) unsupported.push({ key: 'deviceShare', reason: '当前窗口内还没有带设备信息的新样本；启用 UA 类别采集后产生的访问才会进入统计' })

  sendJson(res, 200, {
    window: url.searchParams.get('window') === '30d' ? '30d' : '7d',
    samples: hits.length,
    pageRank, sourceShare, hourly, readDepth, funnels, aiSessions,
    deviceShare, deviceSamples, regionShare: [], unsupported,
    generatedAt: iso(),
  })
})

/* ========================================================================== *
 * 8. 简历：最近解析结果 / 同步到模块 / 版本统计
 * ========================================================================== */

route('GET', '/api/admin/resume/parse/latest', async ({ res, session }) => {
  admin(session)
  const data = await (await getStores()).jobs.read()
  const job = asArray(data.jobs).find((j) => j.type === 'resume.parse' && j.status === 'completed' && j.result)
  sendJson(res, 200, job ? { jobId: job.id, finishedAt: job.finishedAt ?? null, ...job.result } : null)
})

route('POST', '/api/admin/resume/sync', async ({ res, reqId, session }) => {
  admin(session)
  const data = await (await getStores()).jobs.read()
  const job = asArray(data.jobs).find((j) => j.type === 'resume.parse' && j.status === 'completed' && Array.isArray(j.result?.modules))
  if (!job) return sendError(res, 422, 'NO_PARSE_RESULT', '还没有成功的解析结果，请先在「解析」页运行一次', reqId)
  const saved = await saveModules(job.result.modules, session.user)
  await audit(session.user, 'resume.sync', job.id, null, { modules: saved.length })
  ok(res, { modules: saved.length, from: job.id })
})

/* ========================================================================== *
 * 9. SEO：真实可索引页面状态（不做无法兑现的收录推送）
 * ========================================================================== */

route('GET', '/api/admin/seo/status', async ({ res, session }) => {
  admin(session)
  const s = await getStores()
  const [content, settings] = await Promise.all([s.content.read(), s.settings.read()])
  const published = ['articles', 'projects', 'moments'].reduce((n, k) => n + asArray(content[k]).filter((x) => x.status === 'published').length, 0)
  const site = settings.site ?? content.siteMeta ?? {}
  sendJson(res, 200, {
    indexablePages: published + 8,
    publishedContent: published,
    sitemap: site.sitemap ?? '/sitemap.xml',
    canonical: site.canonical ?? site.url ?? '',
    robots: site.robots ?? 'index, follow',
    updatedAt: settings.updatedAt ?? null,
    submitAvailable: false,
    note: '收录由搜索引擎抓取，本站不提供推送接口；sitemap / robots 由构建期脚本生成',
  })
})
