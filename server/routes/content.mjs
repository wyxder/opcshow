/**
 * 内容持久化与发布（fx.md B-01 / B-03）。
 *
 * GET  /api/content/:domain            公开读（只返回 published，ETag + cursor）
 * GET  /api/content/meta               后台概览
 * GET  /api/content/:domain/:id        单条（草稿需要登录）
 * PUT  /api/content/:domain/:id        乐观锁 If-Match version
 * POST /api/content/:domain/:id/status 状态机 draft → pending → published → hidden
 */
import { createHash } from 'node:crypto'
import { route } from '../lib/router.mjs'
import { sendJson, sendError, readJson, paginate, idempotency, rememberIdempotency } from '../lib/http.mjs'
import { getStores } from '../lib/store.mjs'
import { getSession, requireRole } from '../lib/auth.mjs'
import { audit } from '../lib/auth.mjs'
import { text, object, oneOf } from '../lib/validate.mjs'
import { invalidate } from '../ai/indexer.mjs'

const DOMAINS = ['articles', 'projects', 'moments', 'trips', 'tracks', 'friends', 'awards', 'skills', 'resources', 'danmaku']
const STATUSES = ['draft', 'pending', 'published', 'hidden']
const TRANSITIONS = {
  draft: ['pending', 'published', 'hidden'],
  pending: ['published', 'draft', 'hidden'],
  published: ['hidden', 'draft'],
  hidden: ['draft', 'published'],
}

const assertDomain = (domain) => {
  if (!DOMAINS.includes(domain)) throw Object.assign(new Error(`未知内容域 ${domain}`), { status: 404, code: 'UNKNOWN_DOMAIN' })
}

const etagOf = (payload) => `"${createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16)}"`

route('GET', '/api/content/meta', async ({ req, res, reqId }) => {
  const { content } = await getStores()
  const data = await content.read()
  const session = await getSession(req)
  // X-06：公开调用只应看到 published 的计数，避免泄露草稿规模
  const visible = (name) => (data[name] ?? []).filter((x) => session || x.status === 'published')
  const counts = Object.fromEntries(DOMAINS.map((d) => [d, visible(d).length]))
  const drafts = session
    ? Object.fromEntries(DOMAINS.map((d) => [d, (data[d] ?? []).filter((x) => x.status !== 'published').length]))
    : null
  sendJson(res, 200, { counts, drafts, toolboxGroups: data.toolboxGroups ?? [], education: data.education ?? [], research: data.research ?? [], stats: data.stats ?? null, version: content.version })
})

route('GET', '/api/content/:domain/:id', async ({ req, res, reqId, params }) => {
  assertDomain(params.domain)
  const { content } = await getStores()
  const data = await content.read()
  const item = (data[params.domain] ?? []).find((x) => x.id === params.id)
  if (!item) return sendError(res, 404, 'NOT_FOUND', '内容不存在', reqId)
  if (item.status !== 'published') {
    const session = await getSession(req)
    if (!session) return sendError(res, 404, 'NOT_FOUND', '内容不存在', reqId)
  }
  sendJson(res, 200, item)
})

route('GET', '/api/content/:domain', async ({ req, res, reqId, params, url }) => {
  assertDomain(params.domain)
  const { content } = await getStores()
  const data = await content.read()
  const session = await getSession(req)
  const scope = url.searchParams.get('scope')
  const all = data[params.domain] ?? []
  const visible = session && scope === 'admin' ? all : all.filter((x) => x.status === 'published')
  const page = paginate(visible, url.searchParams.get('cursor'), url.searchParams.get('limit'))
  const etag = etagOf(page)
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag, 'Cache-Control': 'private, max-age=30' })
    return res.end()
  }
  sendJson(res, 200, scope === 'admin' ? page : page.items, {
    ETag: etag,
    'Cache-Control': 'private, max-age=30',
    'X-Content-Version': String(content.version),
  })
})

route('PUT', '/api/content/:domain', async ({ req, res, reqId }) => sendError(res, 405, 'METHOD_NOT_ALLOWED', '缺少内容 id', reqId))

route('PUT', '/api/content/:domain/:id', async ({ req, res, reqId, params }) => {
  assertDomain(params.domain)
  const session = requireRole(await getSession(req))
  const body = object(await readJson(req, 2 * 1024 * 1024))
  const cached = idempotency(req, body)
  if (cached) return sendJson(res, 200, cached)

  const { content } = await getStores()
  const result = await content.update((data) => {
    const list = data[params.domain] ?? (data[params.domain] = [])
    const index = list.findIndex((x) => x.id === params.id)
    const before = index === -1 ? null : list[index]
    const currentVersion = before?.version ?? 0
    const ifMatch = req.headers['if-match']?.replace(/"/g, '')
    if (ifMatch && Number(ifMatch) !== currentVersion) {
      throw Object.assign(new Error(`版本冲突：当前 version=${currentVersion}`), { status: 409, code: 'VERSION_CONFLICT', details: { currentVersion } })
    }
    const payload = object(body.payload ?? body, 'payload')
    // BE-04：状态只能走 /status 状态机；直接 PUT 里的 status 一律忽略
    const { status: _ignoredStatus, ...editable } = payload
    const next = {
      ...(before ?? { id: params.id, status: 'draft' }),
      ...editable,
      id: params.id,
      version: currentVersion + 1,
      updatedAt: new Date().toISOString(),
    }
    if (!STATUSES.includes(next.status)) next.status = before?.status ?? 'draft'
    if (index === -1) list.unshift(next)
    else list[index] = next
    return { before, after: next }
  })
  await audit(session.user, 'content.upsert', `${params.domain}/${params.id}`, result.before, result.after)
  // X-06 / AI-03：内容变了，问答索引必须失效，下次请求重建
  invalidate()
  const out = { id: params.id, version: result.after.version, status: result.after.status }
  rememberIdempotency(req, body, out)
  sendJson(res, 200, out)
})

route('POST', '/api/content/:domain/:id/status', async ({ req, res, reqId, params }) => {
  assertDomain(params.domain)
  const session = requireRole(await getSession(req))
  const body = await readJson(req, 64 * 1024)
  const next = oneOf(body.status, STATUSES, 'status')
  const { content } = await getStores()
  const result = await content.update((data) => {
    const list = data[params.domain] ?? []
    const item = list.find((x) => x.id === params.id)
    if (!item) throw Object.assign(new Error('内容不存在'), { status: 404, code: 'NOT_FOUND' })
    const from = item.status ?? 'draft'
    if (from !== next && !TRANSITIONS[from]?.includes(next)) {
      throw Object.assign(new Error(`非法状态迁移 ${from} → ${next}`), { status: 422, code: 'INVALID_TRANSITION' })
    }
    item.status = next
    item.version = (item.version ?? 0) + 1
    item.updatedAt = new Date().toISOString()
    if (next === 'published') item.publishedAt = item.publishedAt ?? new Date().toISOString()
    return item
  })
  await audit(session.user, 'content.status', `${params.domain}/${params.id}`, null, { status: next })
  invalidate()
  sendJson(res, 200, { id: result.id, status: result.status, version: result.version })
})

route('DELETE', '/api/content/:domain/:id', async ({ req, res, reqId, params }) => {
  assertDomain(params.domain)
  const session = requireRole(await getSession(req))
  const { content } = await getStores()
  await content.update((data) => {
    const list = data[params.domain] ?? []
    const item = list.find((x) => x.id === params.id)
    if (!item) throw Object.assign(new Error('内容不存在'), { status: 404, code: 'NOT_FOUND' })
    item.status = 'hidden'
    item.version = (item.version ?? 0) + 1
  })
  await audit(session.user, 'content.delete', `${params.domain}/${params.id}`, null, null)
  invalidate()
  sendJson(res, 200, { ok: true })
})

route('POST', '/api/content', async ({ req, res, reqId }) => {
  const session = requireRole(await getSession(req))
  const body = object(await readJson(req, 2 * 1024 * 1024))
  const domain = oneOf(body.domain, DOMAINS, 'domain')
  const id = text(body.id, { field: 'id', min: 1, max: 80 })
  const payload = object(body.payload ?? {}, 'payload')
  // BE-04：新建时校验状态枚举，避免写入 archived 这类永远不可见的非法值
  const status = payload.status ? oneOf(payload.status, STATUSES, 'status') : 'draft'
  const { content } = await getStores()
  const created = await content.update((data) => {
    const list = data[domain] ?? (data[domain] = [])
    if (list.some((x) => x.id === id)) throw Object.assign(new Error('id 已存在'), { status: 409, code: 'DUPLICATE_ID' })
    const item = { ...payload, id, status, version: 1, createdAt: new Date().toISOString() }
    list.unshift(item)
    return item
  })
  await audit(session.user, 'content.create', `${domain}/${id}`, null, created)
  invalidate()
  sendJson(res, 201, { id, version: created.version, status: created.status })
})
