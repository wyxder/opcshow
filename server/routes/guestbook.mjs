/**
 * 留言与审核（fx.md B-04 / F-07）。
 *
 * POST /api/guestbook              提交 → pending，敏感词命中进审核队列
 * GET  /api/guestbook              公共墙：只返回 published，cursor 分页
 * GET  /api/guestbook?scope=admin  后台队列（需登录）
 * POST /api/guestbook/:id/approve  通过（幂等）
 * POST /api/guestbook/:id/reject   拒绝
 * POST /api/guestbook/:id/like     点赞（按 ipHash 去重）
 * POST /api/guestbook/:id/report   举报
 */
import { route } from '../lib/router.mjs'
import { sendJson, sendError, readJson, paginate, rateLimit, clientIp, ipHash, sha256, idempotency, rememberIdempotency } from '../lib/http.mjs'
import { getStores } from '../lib/store.mjs'
import { getSession, requireRole, audit } from '../lib/auth.mjs'
import { text, email, oneOf, containsBlocked } from '../lib/validate.mjs'

const COLORS = ['lime', 'coral', 'blue', 'amber', 'grape']

route('GET', '/api/guestbook', async ({ req, res, params, url }) => {
  const { guestbook } = await getStores()
  const data = await guestbook.read()
  const session = await getSession(req)
  const adminScope = session && url.searchParams.get('scope') === 'admin'
  const status = url.searchParams.get('status') ?? (adminScope ? 'all' : 'published')
  const list = adminScope ? data.messages : data.messages.filter((m) => m.status === 'published' && (!status || status === 'published'))
  const page = paginate(list, url.searchParams.get('cursor'), url.searchParams.get('limit') ?? (adminScope ? 50 : 20))
  sendJson(res, 200, adminScope ? page : { items: page.items, nextCursor: page.nextCursor })
})

route('POST', '/api/guestbook', async ({ req, res, reqId }) => {
  const ip = clientIp(req)
  if (!rateLimit(`gb:${ip}`, 3, 60 * 1000).ok) return sendError(res, 429, 'RATE_LIMITED', '留言太频繁，一分钟后再试', reqId)
  const body = await readJson(req, 64 * 1024)
  const cached = idempotency(req, body)
  if (cached) return sendJson(res, 200, cached)

  const payload = {
    user: text(body.user, { field: '昵称', min: 1, max: 24 }),
    email: body.email ? email(body.email) : null,
    text: text(body.text, { field: '留言', min: 2, max: 500 }),
    color: COLORS.includes(body.color) ? body.color : 'lime',
    source: text(body.source ?? '站内', { field: '来源', max: 40 }),
  }
  const hash = ipHash(req)
  const digest = sha256(`${hash}|${payload.text}`)
  const { guestbook } = await getStores()
  const result = await guestbook.update((data) => {
    const dup = data.messages.find((m) => m.digest === digest && Date.now() - new Date(m.createdAt).getTime() < 30 * 1000)
    if (dup) throw Object.assign(new Error('30 秒内请勿重复提交'), { status: 409, code: 'DUPLICATE' })
    const flagged = containsBlocked(payload.text)
    const item = {
      id: `gb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...payload,
      text: payload.text,
      status: flagged ? 'pending' : 'pending',
      flagged,
      digest,
      ipHash: hash,
      likes: 0,
      likedBy: [],
      reports: 0,
      createdAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
    }
    data.messages.unshift(item)
    return item
  })
  const out = { id: result.id, status: result.status, flagged: result.flagged }
  rememberIdempotency(req, body, out)
  sendJson(res, 201, out)
})

route('POST', '/api/guestbook/:id/approve', async ({ req, res, reqId, params }) => {
  const session = requireRole(await getSession(req))
  const { guestbook } = await getStores()
  const item = await guestbook.update((data) => {
    const m = data.messages.find((x) => x.id === params.id)
    if (!m) throw Object.assign(new Error('留言不存在'), { status: 404, code: 'NOT_FOUND' })
    if (m.status === 'published') return m
    m.status = 'published'
    m.reviewedBy = session.user
    m.reviewedAt = new Date().toISOString()
    return m
  })
  await audit(session.user, 'guestbook.approve', params.id, null, { status: 'published' })
  sendJson(res, 200, { id: item.id, status: item.status })
})

route('POST', '/api/guestbook/:id/reject', async ({ req, res, reqId, params }) => {
  const session = requireRole(await getSession(req))
  const { guestbook } = await getStores()
  const item = await guestbook.update((data) => {
    const m = data.messages.find((x) => x.id === params.id)
    if (!m) throw Object.assign(new Error('留言不存在'), { status: 404, code: 'NOT_FOUND' })
    m.status = 'rejected'
    m.reviewedBy = session.user
    m.reviewedAt = new Date().toISOString()
    return m
  })
  await audit(session.user, 'guestbook.reject', params.id, null, { status: 'rejected' })
  sendJson(res, 200, { id: item.id, status: item.status })
})

route('POST', '/api/guestbook/:id/like', async ({ req, res, reqId, params }) => {
  const hash = ipHash(req)
  const { guestbook } = await getStores()
  const item = await guestbook.update((data) => {
    const m = data.messages.find((x) => x.id === params.id)
    if (!m) throw Object.assign(new Error('留言不存在'), { status: 404, code: 'NOT_FOUND' })
    m.likedBy = m.likedBy ?? []
    const liked = m.likedBy.includes(hash)
    if (liked) {
      m.likedBy = m.likedBy.filter((x) => x !== hash)
      m.likes = Math.max(0, (m.likes ?? 0) - 1)
    } else {
      m.likedBy.push(hash)
      m.likes = (m.likes ?? 0) + 1
    }
    return m
  })
  sendJson(res, 200, { id: item.id, likes: item.likes, liked: item.likedBy.includes(hash) })
})

route('POST', '/api/guestbook/:id/report', async ({ req, res, reqId, params }) => {
  if (!rateLimit(`report:${clientIp(req)}`, 5, 10 * 60 * 1000).ok) return sendError(res, 429, 'RATE_LIMITED', '举报过于频繁', reqId)
  const { guestbook } = await getStores()
  const item = await guestbook.update((data) => {
    const m = data.messages.find((x) => x.id === params.id)
    if (!m) throw Object.assign(new Error('留言不存在'), { status: 404, code: 'NOT_FOUND' })
    m.reports = (m.reports ?? 0) + 1
    if (m.reports >= 3) m.status = 'pending'
    return m
  })
  sendJson(res, 200, { id: item.id, reports: item.reports, status: item.status })
})

route('DELETE', '/api/guestbook/:id', async ({ req, res, reqId, params }) => {
  const session = requireRole(await getSession(req))
  const { guestbook } = await getStores()
  await guestbook.update((data) => {
    const m = data.messages.find((x) => x.id === params.id)
    if (!m) throw Object.assign(new Error('留言不存在'), { status: 404, code: 'NOT_FOUND' })
    m.status = 'deleted'
  })
  await audit(session.user, 'guestbook.delete', params.id, null, { status: 'deleted' })
  sendJson(res, 200, { ok: true })
})

route('GET', '/api/guestbook/pending/count', async ({ req, res }) => {
  const session = await getSession(req)
  if (!session) return sendJson(res, 200, { count: 0 })
  const { guestbook } = await getStores()
  const data = await guestbook.read()
  sendJson(res, 200, { count: data.messages.filter((m) => m.status === 'pending').length })
})
