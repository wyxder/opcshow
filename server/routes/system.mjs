/**
 * 异步任务、备份、可观测性与 OpenAPI（fx.md B-07 / B-09 / B-10 / B-11 / F-14）。
 *
 * POST /api/resume/parse            简历解析任务（文本 / DOCX base64 → 结构化字段）
 * GET  /api/jobs/:id                任务状态（重试 / 死信可见）
 * POST /api/admin/backup            全量 JSON 快照
 * GET  /api/admin/backup            快照列表
 * POST /api/admin/backup/:id/restore 恢复
 * GET  /api/admin/metrics           运行指标
 * GET  /api/og/:id.svg              每篇文章专属 OG 图（构建期脚本也会用同一逻辑）
 * GET  /api/openapi.json            OpenAPI 3.1
 */
import { mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { route } from '../lib/router.mjs'
import { sendJson, sendError, readJson } from '../lib/http.mjs'
import { env } from '../lib/env.mjs'
import { getStores, backupSnapshot, restoreSnapshot } from '../lib/store.mjs'
import { getSession, requireRole, audit, ROLE_ADMIN } from '../lib/auth.mjs'
import { text, object } from '../lib/validate.mjs'
import { invalidate } from '../ai/indexer.mjs'

const BACKUP_DIR = resolve(env.dataDir, 'backups')
const startedAt = Date.now()

/* ---------------------------------- jobs ---------------------------------- */

const MAX_ATTEMPTS = 2

async function pushJob(type, input, work) {
  const { jobs } = await getStores()
  const job = await jobs.update((data) => {
    const item = { id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, type, status: 'running', attempts: 0, input, createdAt: new Date().toISOString(), result: null, error: null }
    data.jobs.unshift(item)
    data.jobs = data.jobs.slice(0, 500)
    return item
  })

  // BE-08：请求内只负责建任务，真正执行放到下一个事件循环，接口可以立即 202
  setImmediate(async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const result = await work(input)
        await jobs.update((data) => {
          const j = data.jobs.find((x) => x.id === job.id)
          if (!j) return
          j.status = 'completed'
          j.attempts = attempt
          j.result = result
          j.finishedAt = new Date().toISOString()
        })
        return
      } catch (err) {
        if (attempt === MAX_ATTEMPTS) {
          await jobs.update((data) => {
            const j = data.jobs.find((x) => x.id === job.id)
            if (!j) return
            j.status = 'dead'
            j.attempts = attempt
            j.error = err.message
            j.finishedAt = new Date().toISOString()
          })
        }
      }
    }
  })

  return { id: job.id, status: 'running' }
}

route('GET', '/api/jobs/:id', async ({ req, res, reqId, params }) => {
  requireRole(await getSession(req))
  const { jobs } = await getStores()
  const data = await jobs.read()
  const job = data.jobs.find((j) => j.id === params.id)
  if (!job) return sendError(res, 404, 'NOT_FOUND', '任务不存在', reqId)
  sendJson(res, 200, job)
})

route('GET', '/api/jobs', async ({ req, res }) => {
  requireRole(await getSession(req))
  const { jobs } = await getStores()
  const data = await jobs.read()
  sendJson(res, 200, data.jobs.slice(0, 100))
})

function parseResumeText(raw) {
  const textValue = raw ?? ''
  const email = textValue.match(/\b[^\s@]+@[^\s@]+\.[^\s@]{2,}\b/)?.[0] ?? null
  const phone = textValue.match(/\b1[3-9]\d{9}\b/)?.[0] ?? null
  const edu = /(硕士|本科|博士|研究生|在读)/.test(textValue)
  const skills = ['RAG', 'Agent', 'React', 'FastAPI', 'Python', 'TypeScript', '评测', 'LLM', 'pgvector', 'Docker']
    .filter((s) => new RegExp(s, 'i').test(textValue))
  const metrics = (textValue.match(/[\d.]+\s?(%|w|万|倍|ms|s)/gi) ?? []).slice(0, 12)
  const projectCount = (textValue.match(/项目/g) ?? []).length
  return [
    { key: '邮箱', value: email ?? '未识别', confidence: email ? 99 : 40 },
    { key: '手机', value: phone ?? '未识别', confidence: phone ? 98 : 40 },
    { key: '学历', value: edu ? '识别到学历/在读信息' : '未识别', confidence: edu ? 92 : 45 },
    { key: '技能标签', value: skills.length ? skills.join('、') : '未识别', confidence: skills.length ? 88 : 40 },
    { key: '量化指标', value: metrics.length ? metrics.join('、') : '未识别', confidence: metrics.length ? 84 : 40 },
    { key: '项目提及', value: `${projectCount} 处`, confidence: projectCount ? 80 : 40 },
  ]
}

route('POST', '/api/resume/parse', async ({ req, res }) => {
  const session = requireRole(await getSession(req))
  const body = object(await readJson(req, 2 * 1024 * 1024))
  const raw = text(body.text ?? body.content ?? '', { field: '简历文本', min: 10, max: 60000 })
  const job = await pushJob('resume.parse', { chars: raw.length }, async () => ({
    fileName: body.fileName ? String(body.fileName).slice(0, 120) : 'resume.txt',
    fields: parseResumeText(raw),
    extractedAt: new Date().toISOString(),
    engine: 'local-rules',
  }))
  await audit(session.user, 'resume.parse', job.id, null, { status: job.status })
  sendJson(res, 202, job)
})

/* --------------------------------- backups -------------------------------- */

route('POST', '/api/admin/backup', async ({ req, res }) => {
  const session = requireRole(await getSession(req), ROLE_ADMIN)
  await mkdir(BACKUP_DIR, { recursive: true })
  const snapshot = await backupSnapshot()
  const name = `backup-${snapshot.createdAt.replace(/[:.]/g, '-')}.json`
  await writeFile(join(BACKUP_DIR, name), JSON.stringify(snapshot), 'utf8')
  await audit(session.user, 'backup.create', name, null, null)
  sendJson(res, 201, { id: name, createdAt: snapshot.createdAt, bytes: JSON.stringify(snapshot).length })
})

route('GET', '/api/admin/backup', async ({ req, res }) => {
  requireRole(await getSession(req), ROLE_ADMIN)
  await mkdir(BACKUP_DIR, { recursive: true })
  const names = (await readdir(BACKUP_DIR)).filter((n) => n.endsWith('.json')).sort().reverse()
  const items = []
  for (const name of names.slice(0, 50)) {
    const full = join(BACKUP_DIR, name)
    const content = JSON.parse(await readFile(full, 'utf8'))
    items.push({ id: name, createdAt: content.createdAt ?? null, entries: Object.keys(content.snapshot ?? {}).length })
  }
  sendJson(res, 200, items)
})

route('POST', '/api/admin/backup/:id/restore', async ({ req, res, reqId, params }) => {
  const session = requireRole(await getSession(req), ROLE_ADMIN)
  // BE-06：只接受本服务生成的备份文件名，防止读取任意 JSON
  if (!/^backup-[\w.-]+\.json$/.test(params.id) || params.id.includes('..')) return sendError(res, 404, 'NOT_FOUND', '备份不存在', reqId)
  const full = join(BACKUP_DIR, params.id)
  if (!existsSync(full)) return sendError(res, 404, 'NOT_FOUND', '备份不存在', reqId)
  const content = JSON.parse(await readFile(full, 'utf8'))
  await restoreSnapshot(content.snapshot)
  // 恢复后：问答索引与聚合缓存必须失效，否则会继续用旧内容/旧数字
  invalidate()
  const { clearAnalyticsCache } = await import('../lib/hits.mjs')
  clearAnalyticsCache()
  await audit(session.user, 'backup.restore', params.id, null, null)
  sendJson(res, 200, { ok: true, restoredAt: new Date().toISOString() })
})

/* --------------------------------- metrics -------------------------------- */

route('GET', '/api/admin/metrics', async ({ req, res }) => {
  requireRole(await getSession(req), ROLE_ADMIN)
  const stores = await getStores()
  const audited = await stores.audit.read()
  const jobs = await (await stores.jobs).read()
  sendJson(res, 200, {
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    node: process.version,
    pid: process.pid,
    dataDir: env.dataDir,
    auditEvents: audited.logs.length,
    recentAudit: audited.logs.slice(0, 10),
    jobs: { total: jobs.jobs.length, dead: jobs.jobs.filter((j) => j.status === 'dead').length },
    model: { configured: Boolean(env.ai.apiKey && env.ai.baseUrl), model: env.ai.model },
  })
})

/* ---------------------------------- OG 图 --------------------------------- */

const escapeXml = (s) =>
  String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))

function wrapTitle(title, perLine = 16) {
  const lines = []
  let rest = title
  while (rest.length > perLine && lines.length < 3) {
    lines.push(rest.slice(0, perLine))
    rest = rest.slice(perLine)
  }
  if (rest) lines.push(rest)
  return lines
}

export function articleOgSvg(article) {
  const lines = wrapTitle(article.title)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#fffdf5"/>
  <rect x="0" y="0" width="1200" height="630" fill="none" stroke="#101010" stroke-width="10"/>
  <rect x="64" y="64" width="168" height="44" rx="22" fill="#c9f56b" stroke="#101010" stroke-width="3"/>
  <text x="148" y="94" font-family="monospace" font-size="20" text-anchor="middle" fill="#101010">${escapeXml(article.category)}</text>
  ${lines
    .map((l, i) => `<text x="64" y="${210 + i * 86}" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="72" font-weight="800" fill="#101010">${escapeXml(l)}</text>`)
    .join('\n  ')}
  <text x="64" y="520" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="26" fill="#555">${escapeXml(article.abstract ?? '').slice(0, 46)}</text>
  <text x="64" y="580" font-family="monospace" font-size="20" fill="#888">WYX.SPACE · ${escapeXml(article.date ?? '')} · ${escapeXml(article.readMin ?? 0)} min</text>
  <rect x="980" y="470" width="156" height="96" rx="18" fill="#101010"/>
  <text x="1058" y="532" font-family="monospace" font-size="30" text-anchor="middle" fill="#c9f56b">WYX</text>
</svg>`
}

route('GET', '/api/og/:file', async ({ res, params, reqId }) => {
  const id = params.file.replace(/\.svg$/i, '')
  const { content } = await getStores()
  const data = await content.read()
  const article = (data.articles ?? []).find((a) => a.id === id)
  if (!article) return sendError(res, 404, 'NOT_FOUND', '文章不存在', reqId)
  res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' })
  res.end(articleOgSvg(article))
})

/* --------------------------------- openapi -------------------------------- */

const openapi = {
  openapi: '3.1.0',
  info: { title: 'WYX.SPACE API', version: '1.0.0', description: '个人站内容、审核、文件、埋点与 AI 网关。' },
  servers: [{ url: '/api' }, { url: '/api/v1' }],
  components: {
    schemas: {
      Error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, requestId: { type: 'string' } }, required: ['code', 'message', 'requestId'] },
    },
  },
  paths: {
    '/auth/login': { post: { summary: '登录（HttpOnly Cookie）', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['user', 'password'], properties: { user: { type: 'string' }, password: { type: 'string' } } } } } }, responses: { 200: { description: '会话' }, 401: { description: '账号或密码错误', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } } } },
    '/auth/logout': { post: { summary: '退出登录', responses: { 200: { description: '已清除 Cookie' } } } },
    '/auth/session': { get: { summary: '当前会话', responses: { 200: { description: '会话' }, 401: { description: '未登录' } } } },
    '/content/{domain}': { get: { summary: '读内容（只返回 published）', parameters: [{ name: 'domain', in: 'path', required: true, schema: { type: 'string' } }, { name: 'cursor', in: 'query', schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 100 } }], responses: { 200: { description: '数组或分页对象' }, 304: { description: 'ETag 未变化' } } } },
    '/content/{domain}/{id}': {
      put: {
        summary: '更新内容（If-Match 乐观锁）',
        parameters: [{ name: 'domain', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'If-Match', in: 'header', schema: { type: 'string' } }, { name: 'Idempotency-Key', in: 'header', schema: { type: 'string' } }],
        responses: { 200: { description: '新 version' }, 409: { description: '版本冲突', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } },
      },
    },
    '/content/{domain}/{id}/status': { post: { summary: '状态机 draft→pending→published→hidden', responses: { 200: { description: '新状态' }, 422: { description: '非法迁移' } } } },
    '/guestbook': {
      get: { summary: '公共留言（published）', parameters: [{ name: 'cursor', in: 'query', schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { 200: { description: '分页' } } },
      post: { summary: '提交留言（进 pending）', responses: { 201: { description: '待审核' }, 429: { description: '频率限制' } } },
    },
    '/guestbook/{id}/approve': { post: { summary: '审核通过（幂等）', responses: { 200: { description: '已发布' } } } },
    '/files/sign': { post: { summary: '直传签名', responses: { 200: { description: '上传地址与有效期' } } } },
    '/files/share': { post: { summary: '分享短链（密码 / 过期）', responses: { 201: { description: 'token' } } } },
    '/files/download/{token}': { get: { summary: '下载（Range / 密码）', responses: { 200: { description: '文件流' }, 404: { description: '失效' }, 401: { description: '需要密码' } } } },
    '/track': { post: { summary: '埋点（IP 哈希）', responses: { 202: { description: '已记录' } } } },
    '/analytics/summary': { get: { summary: '日聚合（缓存 5 分钟）', responses: { 200: { description: 'summary' } } } },
    '/ai/chat': {
      post: {
        summary: 'AI 对话（SSE：delta / done / error）',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['message'], properties: { message: { type: 'string' }, context: { type: 'object' }, history: { type: 'array' }, stream: { type: 'boolean' }, sessionId: { type: 'string' } } } } } },
        responses: { 200: { description: 'text/event-stream' }, 429: { description: '额度或频率限制' }, 503: { description: '模型不可用' } },
      },
    },
    '/ai/feedback': { post: { summary: '👍/👎 反馈', responses: { 201: { description: '已记录' } } } },
    '/ai/prompts': { get: { summary: 'Prompt 版本', responses: { 200: { description: '列表' } } } },
    '/ai/prompts/{id}': { put: { summary: '编辑并升版本', responses: { 200: { description: '新版本号' } } } },
    '/ai/prompts/{id}/rollback': { post: { summary: '回滚上一版', responses: { 200: { description: '新版本号' } } } },
    '/ai/usage': { get: { summary: '真实用量（admin）', responses: { 200: { description: '按日 / 按模型' } } } },
    '/ai/eval': { get: { summary: '评测报告', responses: { 200: { description: '报告 JSON' } } } },
    '/resume/parse': { post: { summary: '简历解析任务', responses: { 202: { description: 'job id' } } } },
    '/jobs/{id}': { get: { summary: '任务状态（失败进入 dead）', responses: { 200: { description: 'job' } } } },
    '/admin/backup': { get: { summary: '备份列表' }, post: { summary: '创建快照' } },
    '/admin/backup/{id}/restore': { post: { summary: '恢复快照', responses: { 200: { description: '已恢复' } } } },
    '/admin/metrics': { get: { summary: '运行指标', responses: { 200: { description: 'metrics' } } } },
    '/og/{file}.svg': { get: { summary: '文章专属 OG 图', responses: { 200: { description: 'image/svg+xml' } } } },
  },
}

route('GET', '/api/openapi.json', async ({ res }) => {
  sendJson(res, 200, openapi, { 'Cache-Control': 'public, max-age=3600' })
})

route('GET', '/healthz', async ({ res }) => sendJson(res, 200, { status: 'ok', uptime: Math.round((Date.now() - startedAt) / 1000) }))
route('GET', '/readyz', async ({ res }) => {
  const stores = await getStores()
  await stores.content.read()
  // BE-13：真的探一次目录可写，而不是只读缓存
  let writable = true
  try {
    await mkdir(resolve(env.dataDir, 'uploads'), { recursive: true })
    const probe = resolve(env.dataDir, `.readyz-${process.pid}.tmp`)
    await writeFile(probe, 'ok')
    await rm(probe, { force: true })
  } catch {
    writable = false
  }
  if (!writable) return sendError(res, 503, 'DATA_DIR_READONLY', '数据目录不可写', 'readyz')
  sendJson(res, 200, { status: 'ready', stores: Object.keys(stores).length, writable })
})
