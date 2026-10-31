/**
 * 后台账号、总览、简历与安全（补齐 23 个 Tab 里缺的「真接口」）。
 *
 * GET    /api/admin/overview                 总览卡片与趋势
 * POST   /api/admin/password                 改密码（撤销其它会话）
 * GET    /api/admin/security                 安全信息（2FA 如实降级）
 * GET    /api/admin/sessions                 会话列表
 * DELETE /api/admin/sessions/:id             撤销会话
 * GET    /api/admin/audit                    审计日志（admin）
 * POST   /api/admin/report                   规则周报（不调用模型）
 * GET/PUT /api/admin/resume*                 简历模块与版本
 * DELETE /api/admin/backup/:id               删除备份
 */
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { route } from '../lib/router.mjs'
import { sendJson, sendError, readJson, sha256 } from '../lib/http.mjs'
import { getStores } from '../lib/store.mjs'
import { getSession, requireRole, audit, hashPassword, verifyPassword, ROLE_ADMIN } from '../lib/auth.mjs'
import { text, arrayOf } from '../lib/validate.mjs'
import { getResumeState, saveModules, createVersion, restoreVersion, deleteVersion } from '../lib/resume.mjs'
import { env } from '../lib/env.mjs'

const byStatus = (list = []) => {
  const map = { published: 0, draft: 0, pending: 0, hidden: 0 }
  for (const item of list) map[item.status ?? 'published'] = (map[item.status ?? 'published'] ?? 0) + 1
  return map
}

route('GET', '/api/admin/overview', async ({ req, res }) => {
  requireRole(await getSession(req))
  const stores = await getStores()
  const [content, guestbook, files, analytics, jobs, ai] = await Promise.all([
    stores.content.read(),
    stores.guestbook.read(),
    stores.files.read(),
    stores.analytics.read(),
    stores.jobs.read(),
    stores.ai.read(),
  ])

  const weekAgo = Date.now() - 7 * 86400000
  const hits = analytics.hits.filter((h) => new Date(h.ts).getTime() >= weekAgo)
  const days = []
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    const list = hits.filter((h) => h.ts.slice(0, 10) === date)
    days.push({
      date,
      pv: list.length,
      uv: new Set(list.map((h) => h.sessionHash ?? h.ipHash)).size,
      ai: list.filter((h) => h.kind === 'ai').length,
    })
  }

  const articles = content.articles ?? []
  const projects = content.projects ?? []
  const moments = content.moments ?? []
  const danmaku = content.danmaku ?? []
  const fileList = files.files ?? []
  const today = new Date().toISOString().slice(0, 10)
  const aiToday = (ai.usage ?? []).filter((u) => u.day === today)
  const pageMap = new Map()
  for (const h of hits) pageMap.set(h.path, (pageMap.get(h.path) ?? 0) + 1)

  sendJson(res, 200, {
    generatedAt: new Date().toISOString(),
    content: {
      articles: { total: articles.length, ...byStatus(articles) },
      projects: { total: projects.length, ...byStatus(projects) },
      moments: { total: moments.length, ...byStatus(moments) },
      danmaku: { total: danmaku.length, ...byStatus(danmaku) },
    },
    guestbook: {
      total: guestbook.messages.length,
      pending: guestbook.messages.filter((m) => m.status === 'pending').length,
      published: guestbook.messages.filter((m) => m.status === 'published').length,
    },
    files: {
      total: fileList.filter((f) => f.status !== 'deleted').length,
      public: fileList.filter((f) => f.status === 'published' && f.visibility === 'public').length,
      private: fileList.filter((f) => f.status === 'published' && f.visibility !== 'public').length,
      trashed: fileList.filter((f) => f.status === 'trashed').length,
      shares: (files.shares ?? []).length,
    },
    ai: {
      todayCalls: aiToday.length,
      todayTokens: aiToday.reduce((s, u) => s + (u.tokens ?? 0), 0),
      successRate: aiToday.length ? Math.round((aiToday.filter((u) => u.ok).length / aiToday.length) * 100) : null,
      quota: env.ai.dailyQuota,
    },
    analytics: {
      days,
      pv: hits.length,
      uv: new Set(hits.map((h) => h.sessionHash ?? h.ipHash)).size,
      ai: hits.filter((h) => h.kind === 'ai').length,
      topPages: [...pageMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([path, pv]) => ({ path, pv })),
    },
    jobs: {
      total: jobs.jobs.length,
      dead: jobs.jobs.filter((j) => j.status === 'dead').length,
      running: jobs.jobs.filter((j) => j.status === 'running').length,
    },
    resume: { modules: (await getResumeState()).modules.length },
    env: { model: env.ai.baseUrl && env.ai.apiKey ? 'configured' : 'retrieval' },
  })
})

route('POST', '/api/admin/password', async ({ req, res, reqId }) => {
  const session = requireRole(await getSession(req), ROLE_ADMIN)
  const body = await readJson(req, 32 * 1024)
  const current = text(body.current, { field: '当前密码', min: 1, max: 128 })
  const next = text(body.next, { field: '新密码', min: 8, max: 128 })
  if (next === current) return sendError(res, 422, 'SAME_PASSWORD', '新密码不能与当前密码相同', reqId)

  const { users, sessions } = await getStores()
  const data = await users.read()
  const account = data.users.find((u) => u.user === session.user)
  if (!account || !verifyPassword(current, account.passwordHash)) return sendError(res, 401, 'INVALID_CREDENTIALS', '当前密码不正确', reqId)

  await users.update((d) => {
    const u = d.users.find((x) => x.user === session.user)
    u.passwordHash = hashPassword(next)
    u.updatedAt = new Date().toISOString()
  })
  const keep = sha256(session.sid)
  await sessions.update((d) => {
    d.sessions = d.sessions.filter((s) => s.user !== session.user || s.id === keep)
  })
  await audit(session.user, 'auth.password.change', 'user', null, { at: new Date().toISOString() })
  sendJson(res, 200, { ok: true, sessionsRevoked: true })
})

route('GET', '/api/admin/security', async ({ req, res }) => {
  const session = requireRole(await getSession(req))
  const { sessions } = await getStores()
  const data = await sessions.read()
  sendJson(res, 200, {
    user: session.user,
    role: session.role,
    sessions: data.sessions.filter((s) => s.user === session.user).length,
    twoFactor: { enabled: false, available: false, reason: '未接 TOTP 认证器与密钥托管；替代方案：强口令 + 会话撤销 + 登录限流' },
    passwordPolicy: { minLength: 8, maxLength: 128 },
  })
})

route('GET', '/api/admin/sessions', async ({ req, res }) => {
  const session = requireRole(await getSession(req))
  const { sessions } = await getStores()
  const data = await sessions.read()
  const keep = sha256(session.sid)
  sendJson(
    res,
    200,
    data.sessions
      .filter((s) => s.user === session.user)
      .map((s) => ({ id: s.id, shortId: String(s.id).slice(0, 10), current: s.id === keep, createdAt: new Date(s.createdAt).toISOString(), expiresAt: new Date(s.expiresAt).toISOString() })),
  )
})

route('DELETE', '/api/admin/sessions/:id', async ({ req, res, reqId, params }) => {
  const session = requireRole(await getSession(req))
  if (params.id === sha256(session.sid)) return sendError(res, 422, 'CANNOT_REVOKE_CURRENT', '不能撤销当前登录会话', reqId)
  const { sessions } = await getStores()
  const data = await sessions.read()
  const target = data.sessions.find((s) => s.id === params.id && s.user === session.user)
  if (!target) return sendError(res, 404, 'NOT_FOUND', '会话不存在', reqId)
  await sessions.update((d) => {
    d.sessions = d.sessions.filter((s) => s.id !== params.id)
  })
  await audit(session.user, 'auth.session.revoke', params.id, null, null)
  sendJson(res, 200, { ok: true })
})

route('GET', '/api/admin/audit', async ({ req, res, url }) => {
  requireRole(await getSession(req), ROLE_ADMIN)
  const { audit: auditStore } = await getStores()
  const data = await auditStore.read()
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200)
  sendJson(res, 200, data.logs.slice(0, limit))
})

route('POST', '/api/admin/report', async ({ req, res }) => {
  requireRole(await getSession(req))
  const stores = await getStores()
  const [analytics, guestbook, content, ai] = await Promise.all([stores.analytics.read(), stores.guestbook.read(), stores.content.read(), stores.ai.read()])
  const weekAgo = Date.now() - 7 * 86400000
  const hits = analytics.hits.filter((h) => new Date(h.ts).getTime() >= weekAgo)
  const pv = hits.length
  const uv = new Set(hits.map((h) => h.sessionHash ?? h.ipHash)).size
  const aiRounds = hits.filter((h) => h.kind === 'ai').length
  const pending = guestbook.messages.filter((m) => m.status === 'pending').length
  const drafts = ['articles', 'projects', 'moments'].reduce((s, d) => s + (content[d] ?? []).filter((x) => x.status !== 'published').length, 0)
  const tokens = ai.usage.filter((u) => new Date(u.ts).getTime() >= weekAgo).reduce((s, u) => s + (u.tokens ?? 0), 0)
  const textOut = [
    `近 7 天：PV ${pv} / UV ${uv} / AI 轮次 ${aiRounds}。`,
    `内容：待审 ${pending} 条留言、非公开内容 ${drafts} 条。`,
    `AI：本周 token 估算 ${tokens}，日配额 ${env.ai.dailyQuota}。`,
    pending > 0 ? '建议一：先清掉互动审核里的待审留言。' : '建议一：互动队列为空，可以按计划补一篇长文。',
    drafts > 0 ? '建议二：把草稿里最近改过的一篇补完并发布，索引会自动重建。' : '建议二：内容都在已发布状态，适合做一次旧文回顾。',
    aiRounds === 0 ? '建议三：近 7 天没有 AI 会话，检查 VITE_API_BASE 或助手入口。' : '建议三：用 AI 用量页确认缓存命中与降级比例。',
  ].join('\n')
  sendJson(res, 200, { generatedAt: new Date().toISOString(), source: 'rules', note: '规则生成（未调用模型）；发送邮件未接入', kpis: { pv, uv, ai: aiRounds, pending, drafts, tokens }, text: textOut })
})

route('GET', '/api/admin/resume', async ({ req, res }) => {
  requireRole(await getSession(req))
  sendJson(res, 200, await getResumeState())
})

route('PUT', '/api/admin/resume/modules', async ({ req, res }) => {
  const session = requireRole(await getSession(req))
  const body = await readJson(req, 256 * 1024)
  const modules = arrayOf(body.modules ?? [], { field: 'modules', max: 40 })
  const saved = await saveModules(modules, session.user)
  await audit(session.user, 'resume.modules.save', 'resume', null, { count: saved.length })
  sendJson(res, 200, { modules: saved })
})

route('POST', '/api/admin/resume/versions', async ({ req, res }) => {
  const session = requireRole(await getSession(req))
  const body = await readJson(req, 256 * 1024)
  const name = text(body.name ?? '', { field: '版本名', max: 60 })
  const note = text(body.note ?? '', { field: '备注', max: 200 })
  const state = await getResumeState()
  const version = await createVersion({ name, note, modules: body.modules ?? state.modules, source: 'manual', actor: session.user })
  await audit(session.user, 'resume.version.create', version.id, null, { name: version.name })
  sendJson(res, 201, version)
})

route('POST', '/api/admin/resume/versions/:id/restore', async ({ req, res, params }) => {
  const session = requireRole(await getSession(req))
  const result = await restoreVersion(params.id, session.user)
  await audit(session.user, 'resume.version.restore', params.id, null, null)
  sendJson(res, 200, result)
})

route('DELETE', '/api/admin/resume/versions/:id', async ({ req, res, params }) => {
  const session = requireRole(await getSession(req))
  await deleteVersion(params.id)
  await audit(session.user, 'resume.version.delete', params.id, null, null)
  sendJson(res, 200, { ok: true })
})

route('DELETE', '/api/admin/backup/:id', async ({ req, res, reqId, params }) => {
  const session = requireRole(await getSession(req), ROLE_ADMIN)
  if (!/^backup-[\w.-]+\.json$/.test(params.id) || params.id.includes('..')) return sendError(res, 404, 'NOT_FOUND', '备份不存在', reqId)
  const full = join(resolve(env.dataDir, 'backups'), params.id)
  if (!existsSync(full)) return sendError(res, 404, 'NOT_FOUND', '备份不存在', reqId)
  await rm(full, { force: true })
  await audit(session.user, 'backup.delete', params.id, null, null)
  sendJson(res, 200, { ok: true })
})
