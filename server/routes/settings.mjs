/**
 * 个人资料、站点设置与友链申请（BE-14）。
 *
 * GET  /api/profile                 公开资料（settings.profile 优先，回落内容种子）
 * PUT  /api/admin/profile           管理员更新资料
 * GET  /api/admin/settings          站点设置（SEO / 默认主题等）
 * PUT  /api/admin/settings          管理员更新站点设置
 * POST /api/friend-requests         访客提交友链（进 pending）
 * GET  /api/admin/friend-requests   待审友链
 * PATCH /api/admin/friend-requests/:id  通过 / 拒绝
 */
import { route } from '../lib/router.mjs'
import { sendJson, sendError, readJson, rateLimit, clientIp } from '../lib/http.mjs'
import { getStores } from '../lib/store.mjs'
import { getSession, requireRole, audit } from '../lib/auth.mjs'
import { text, object, oneOf, httpUrl } from '../lib/validate.mjs'

const PROFILE_FIELDS = ['name', 'latin', 'handle', 'role', 'tagline', 'location', 'hometown', 'age', 'status', 'availability', 'email', 'wechat', 'phone', 'bio', 'keywords']
const SITE_FIELDS = ['url', 'title', 'description', 'keywords', 'ogImage', 'defaultTheme']

const pick = (source, fields) => Object.fromEntries(fields.filter((k) => source[k] !== undefined).map((k) => [k, source[k]]))

route('GET', '/api/profile', async ({ res }) => {
  const { settings, content } = await getStores()
  const [saved, seed] = await Promise.all([settings.read(), content.read()])
  sendJson(res, 200, saved.profile ?? seed.profile ?? null, { 'Cache-Control': 'public, max-age=60' })
})

route('PUT', '/api/admin/profile', async ({ req, res, reqId }) => {
  const session = requireRole(await getSession(req), ['admin'])
  const body = object(await readJson(req, 256 * 1024))
  const patch = pick(body, PROFILE_FIELDS)
  if (!Object.keys(patch).length) return sendError(res, 422, 'EMPTY_PATCH', '没有可更新的字段', reqId)
  if (patch.bio && (!Array.isArray(patch.bio) || patch.bio.some((x) => typeof x !== 'string'))) return sendError(res, 422, 'INVALID_BIO', 'bio 必须是字符串数组', reqId)
  const { settings } = await getStores()
  const before = (await settings.read()).profile
  const after = { ...(before ?? {}), ...patch, updatedAt: new Date().toISOString() }
  await settings.update((data) => {
    data.profile = after
    data.updatedAt = after.updatedAt
  })
  await audit(session.user, 'profile.update', 'profile', before, after)
  sendJson(res, 200, after)
})

route('GET', '/api/admin/settings', async ({ req, res }) => {
  requireRole(await getSession(req), ['admin'])
  const { settings, content } = await getStores()
  const [saved, seed] = await Promise.all([settings.read(), content.read()])
  sendJson(res, 200, { site: saved.site ?? seed.siteMeta ?? null, updatedAt: saved.updatedAt ?? null })
})

route('PUT', '/api/admin/settings', async ({ req, res, reqId }) => {
  const session = requireRole(await getSession(req), ['admin'])
  const body = object(await readJson(req, 64 * 1024))
  const patch = pick(body, SITE_FIELDS)
  if (!Object.keys(patch).length) return sendError(res, 422, 'EMPTY_PATCH', '没有可更新的字段', reqId)
  if (patch.url) patch.url = httpUrl(patch.url, '站点地址')
  const { settings } = await getStores()
  const before = (await settings.read()).site
  const after = { ...(before ?? {}), ...patch, updatedAt: new Date().toISOString() }
  await settings.update((data) => {
    data.site = after
    data.updatedAt = after.updatedAt
  })
  await audit(session.user, 'settings.update', 'site', before, after)
  sendJson(res, 200, after)
})

route('POST', '/api/friend-requests', async ({ req, res, reqId }) => {
  if (!rateLimit(`friend:${clientIp(req)}`, 3, 60 * 60 * 1000).ok) return sendError(res, 429, 'RATE_LIMITED', '提交太频繁，一小时后再试', reqId)
  const body = await readJson(req, 32 * 1024)
  const payload = {
    name: text(body.name, { field: '站点名', min: 1, max: 40 }),
    url: httpUrl(body.url, '站点地址'),
    desc: text(body.desc ?? '', { field: '简介', max: 120 }),
    status: 'pending',
    version: 1,
    source: 'apply',
    createdAt: new Date().toISOString(),
  }
  const { content } = await getStores()
  const item = await content.update((data) => {
    const list = data.friends ?? (data.friends = [])
    if (list.some((f) => f.url === payload.url)) throw Object.assign(new Error('这个站点已经提交过了'), { status: 409, code: 'DUPLICATE' })
    const record = { ...payload, id: `friend_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }
    list.unshift(record)
    return record
  })
  sendJson(res, 201, { id: item.id, status: item.status })
})

route('GET', '/api/admin/friend-requests', async ({ req, res }) => {
  requireRole(await getSession(req))
  const { content } = await getStores()
  const data = await content.read()
  sendJson(res, 200, (data.friends ?? []).filter((f) => f.status === 'pending'))
})

route('PATCH', '/api/admin/friend-requests/:id', async ({ req, res, reqId, params }) => {
  const session = requireRole(await getSession(req))
  const body = await readJson(req, 8 * 1024)
  const status = oneOf(body.status, ['published', 'hidden'], 'status')
  const { content } = await getStores()
  const item = await content.update((data) => {
    const f = (data.friends ?? []).find((x) => x.id === params.id)
    if (!f) throw Object.assign(new Error('友链申请不存在'), { status: 404, code: 'NOT_FOUND' })
    f.status = status
    f.reviewedBy = session.user
    f.reviewedAt = new Date().toISOString()
    return f
  })
  await audit(session.user, 'friend.review', params.id, null, { status })
  sendJson(res, 200, { id: item.id, status: item.status })
})
