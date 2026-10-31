/**
 * 文件与对象存储（fx.md B-05）。
 *
 * 本地驱动：文件落在 server/data/uploads，签名直传接口与 S3/OSS 同构，
 * 换云存储只需替换 upload/download 两个函数。
 *
 * POST /api/files/sign               直传签名（admin/editor）
 * PUT  /api/files/upload/:key        上传（签名后）
 * GET  /api/files                    公开文件列表
 * POST /api/files/:id/visibility     公开 / 私密
 * POST /api/files/share              分享短链（密码 + 过期）
 * GET  /api/files/download/:token    下载（Range / 密码 / 计数）
 */
import { createReadStream, existsSync } from 'node:fs'
import { mkdir, stat, writeFile, rm } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { route } from '../lib/router.mjs'
import { sendJson, sendError, readJson, readBody, rateLimit, clientIp } from '../lib/http.mjs'
import { env } from '../lib/env.mjs'
import { getStores } from '../lib/store.mjs'
import { getSession, requireRole, audit } from '../lib/auth.mjs'
import { text, integer, oneOf } from '../lib/validate.mjs'

const UPLOAD_DIR = resolve(env.dataDir, 'uploads')

/**
 * BE-05：签名不再只是「返回一个过期时间」，而是真的在服务端登记。
 * 上传时必须能对上（key + 名称 + 体积 + 未过期），否则拒绝。
 */
const signatures = new Map()
let signCount = 0
function sweepSignatures(now) {
  signCount += 1
  if (signCount % 50 !== 0) return
  for (const [key, sig] of signatures) if (sig.expiresAt < now) signatures.delete(key)
}

const humanSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const extOf = (name) => extname(name).replace('.', '').toLowerCase()

const hashPassword = (pwd) => {
  const salt = randomBytes(12).toString('hex')
  return `${salt}:${scryptSync(pwd, salt, 32).toString('hex')}`
}
const checkPassword = (pwd, stored) => {
  if (!stored) return true
  const [salt, hash] = stored.split(':')
  return timingSafeEqual(scryptSync(pwd ?? '', salt, 32), Buffer.from(hash, 'hex'))
}

route('POST', '/api/files/sign', async ({ req, res, reqId }) => {
  const session = requireRole(await getSession(req))
  const body = await readJson(req, 64 * 1024)
  const name = text(body.name, { field: '文件名', min: 1, max: 200 })
  const size = integer(body.size, { field: '文件大小', min: 1, max: env.upload.maxBytes })
  const ext = extOf(name)
  if (!env.upload.allowedExt.includes(ext)) return sendError(res, 422, 'MIME_NOT_ALLOWED', `不允许的类型 .${ext}`, reqId)
  const key = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${ext}`
  const ttl = 10 * 60 * 1000
  const expiresAt = Date.now() + ttl
  sweepSignatures(Date.now())
  signatures.set(key, { expiresAt, name, size, ext, user: session.user })
  await audit(session.user, 'files.sign', key, null, { name, size })
  sendJson(res, 200, {
    driver: env.upload.driver,
    key,
    uploadUrl: `/api/files/upload/${key}`,
    method: 'PUT',
    expiresAt: new Date(expiresAt).toISOString(),
    maxBytes: env.upload.maxBytes,
    headers: { 'Content-Type': 'application/octet-stream' },
    meta: { name, size, ext },
  })
})

route('PUT', '/api/files/upload/:key', async ({ req, res, reqId, params, url }) => {
  const session = requireRole(await getSession(req))
  if (!params.key || !/^[a-z0-9-]+\.[a-z0-9]+$/i.test(params.key)) return sendError(res, 422, 'BAD_KEY', '上传 key 不合法', reqId)
  const sig = signatures.get(params.key)
  if (!sig) return sendError(res, 410, 'SIGNATURE_REQUIRED', '请先申请上传签名', reqId)
  if (sig.expiresAt < Date.now()) {
    signatures.delete(params.key)
    return sendError(res, 410, 'SIGNATURE_EXPIRED', '上传签名已过期，请重新申请', reqId)
  }
  const buf = await readBody(req, env.upload.maxBytes)
  if (!buf.length) return sendError(res, 422, 'EMPTY_FILE', '文件为空', reqId)
  if (sig.size && buf.length > sig.size) return sendError(res, 422, 'SIZE_MISMATCH', '文件大小超过签名声明', reqId)
  await mkdir(UPLOAD_DIR, { recursive: true })
  const name = text(url.searchParams.get('name') ?? sig.name ?? params.key, { field: '文件名', max: 200 })
  const category = text(url.searchParams.get('category') ?? '未分类', { field: '分类', max: 40 })
  signatures.delete(params.key)
  await writeFile(join(UPLOAD_DIR, params.key), buf)
  const { files } = await getStores()
  const item = await files.update((data) => {
    const existing = data.files.find((f) => f.storageKey === params.key)
    if (existing) {
      existing.sizeBytes = buf.length
      existing.size = humanSize(buf.length)
      return existing
    }
    const record = {
      id: `file_${Date.now()}_${randomBytes(3).toString('hex')}`,
      name,
      ext: extOf(name),
      size: humanSize(buf.length),
      sizeBytes: buf.length,
      category,
      storageKey: params.key,
      visibility: 'private',
      status: 'published',
      downloads: 0,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    }
    data.files.unshift(record)
    return record
  })
  await audit(session.user, 'files.upload', params.key, null, { id: item.id, size: buf.length })
  sendJson(res, 201, { id: item.id, key: params.key, size: item.size, url: `/api/files/download-by-id/${item.id}` })
})

route('GET', '/api/files', async ({ req, res, url }) => {
  const { files } = await getStores()
  const data = await files.read()
  const session = await getSession(req)
  // BE-05：后台要能看到 private / 回收站；公开只返回 published + public
  const adminScope = Boolean(session) && url.searchParams.get('scope') === 'admin'
  const list = data.files
    .filter((f) => (adminScope ? f.status !== 'deleted' : f.status === 'published' && f.visibility === 'public'))
    .map((f) => (f.status === 'trashed' ? { ...f } : { ...f, url: `/api/files/download-by-id/${f.id}` }))
  sendJson(res, 200, list)
})

route('POST', '/api/files/:id/visibility', async ({ req, res, reqId, params }) => {
  const session = requireRole(await getSession(req))
  const body = await readJson(req, 32 * 1024)
  const visibility = oneOf(body.visibility, ['public', 'private'], 'visibility')
  const { files } = await getStores()
  const item = await files.update((data) => {
    const f = data.files.find((x) => x.id === params.id)
    if (!f) throw Object.assign(new Error('文件不存在'), { status: 404, code: 'NOT_FOUND' })
    f.visibility = visibility
    return f
  })
  await audit(session.user, 'files.visibility', params.id, null, { visibility })
  sendJson(res, 200, { id: item.id, visibility: item.visibility })
})

route('DELETE', '/api/files/:id', async ({ req, res, reqId, params, url }) => {
  const session = requireRole(await getSession(req))
  const { files } = await getStores()
  const permanent = url.searchParams.get('permanent') === '1'
  if (permanent) {
    const data = await files.read()
    const target = data.files.find((f) => f.id === params.id)
    if (!target) return sendError(res, 404, 'NOT_FOUND', '文件不存在', reqId)
    await rm(join(UPLOAD_DIR, target.storageKey), { force: true })
    await files.update((d) => {
      d.files = d.files.filter((f) => f.id !== params.id)
      d.shares = d.shares.filter((s) => s.fileId !== params.id)
    })
    await audit(session.user, 'files.purge', params.id, null, null)
    return sendJson(res, 200, { id: params.id, purged: true })
  }
  const item = await files.update((data) => {
    const f = data.files.find((x) => x.id === params.id)
    if (!f) throw Object.assign(new Error('文件不存在'), { status: 404, code: 'NOT_FOUND' })
    f.status = 'trashed'
    f.deletedAt = new Date().toISOString()
    return f
  })
  await audit(session.user, 'files.trash', params.id, null, null)
  sendJson(res, 200, { id: item.id, status: item.status })
})

route('POST', '/api/files/:id/restore', async ({ req, res, reqId, params }) => {
  const session = requireRole(await getSession(req))
  const { files } = await getStores()
  const item = await files.update((data) => {
    const f = data.files.find((x) => x.id === params.id)
    if (!f) throw Object.assign(new Error('文件不存在'), { status: 404, code: 'NOT_FOUND' })
    f.status = 'published'
    delete f.deletedAt
    return f
  })
  await audit(session.user, 'files.restore', params.id, null, null)
  sendJson(res, 200, { id: item.id, status: item.status })
})

route('POST', '/api/files/share', async ({ req, res, reqId }) => {
  const session = requireRole(await getSession(req))
  const body = await readJson(req, 64 * 1024)
  const fileId = text(body.fileId, { field: 'fileId', min: 1, max: 80 })
  const password = body.password ? text(body.password, { field: '密码', min: 4, max: 32 }) : ''
  const expiresDays = integer(body.expiresDays ?? 0, { field: '有效期', min: 0, max: 3650 })
  const { files } = await getStores()
  const result = await files.update((data) => {
    const file = data.files.find((f) => f.id === fileId)
    if (!file) throw Object.assign(new Error('文件不存在'), { status: 404, code: 'NOT_FOUND' })
    const token = randomBytes(9).toString('base64url')
    const share = {
      id: `share_${Date.now()}`,
      fileId,
      name: file.name,
      token,
      passwordHash: password ? hashPassword(password) : null,
      expiresAt: expiresDays ? new Date(Date.now() + expiresDays * 86400000).toISOString() : null,
      visits: 0,
      createdAt: new Date().toISOString(),
    }
    data.shares.unshift(share)
    return share
  })
  await audit(session.user, 'files.share', fileId, null, { token: result.token })
  sendJson(res, 201, {
    id: result.id,
    token: result.token,
    url: `/api/files/download/${result.token}`,
    hasPassword: Boolean(result.passwordHash),
    expiresAt: result.expiresAt,
  })
})

route('GET', '/api/files/shares', async ({ req, res }) => {
  const session = await getSession(req)
  if (!session) return sendJson(res, 200, [])
  const { files } = await getStores()
  const data = await files.read()
  // 只暴露「是否设置密码」，哈希永远不出服务端
  sendJson(res, 200, data.shares.map(({ passwordHash, ...s }) => ({ ...s, hasPassword: Boolean(passwordHash) })))
})

route('DELETE', '/api/files/share/:token', async ({ req, res, params }) => {
  const session = requireRole(await getSession(req))
  const { files } = await getStores()
  await files.update((data) => {
    data.shares = data.shares.filter((s) => s.token !== params.token)
  })
  await audit(session.user, 'files.share.delete', params.token, null, null)
  sendJson(res, 200, { ok: true })
})

function streamFile(req, res, key, name) {
  const full = join(UPLOAD_DIR, key)
  if (!existsSync(full)) return sendError(res, 404, 'FILE_MISSING', '文件不存在或已清理', 'req_file')
  const mime = {
    pdf: 'application/pdf',
    md: 'text/markdown; charset=utf-8',
    txt: 'text/plain; charset=utf-8',
    csv: 'text/csv; charset=utf-8',
    html: 'text/html; charset=utf-8',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    avif: 'image/avif',
    svg: 'image/svg+xml',
    zip: 'application/zip',
  }[extOf(key)] ?? 'application/octet-stream'

  stat(full).then((s) => {
    const range = req.headers.range
    const headersBase = {
      'Content-Type': mime,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(name ?? key)}"`,
      'Cache-Control': 'private, max-age=600',
    }
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range)
      const start = m?.[1] ? Number(m[1]) : 0
      const end = m?.[2] ? Number(m[2]) : s.size - 1
      res.writeHead(206, { ...headersBase, 'Content-Range': `bytes ${start}-${end}/${s.size}`, 'Content-Length': end - start + 1 })
      createReadStream(full, { start, end }).pipe(res)
      return
    }
    res.writeHead(200, { ...headersBase, 'Content-Length': s.size })
    createReadStream(full).pipe(res)
  })
}

route('GET', '/api/files/download-by-id/:id', async ({ req, res, reqId, params }) => {
  const { files } = await getStores()
  const data = await files.read()
  const file = data.files.find((f) => f.id === params.id)
  if (!file || file.status === 'deleted' || file.status === 'trashed') return sendError(res, 404, 'NOT_FOUND', '文件不存在', reqId)
  if (file.visibility !== 'public') {
    const session = await getSession(req)
    if (!session) return sendError(res, 404, 'NOT_FOUND', '文件不存在', reqId)
  }
  await files.update((d) => {
    const f = d.files.find((x) => x.id === params.id)
    if (f) f.downloads = (f.downloads ?? 0) + 1
  })
  streamFile(req, res, file.storageKey, file.name)
})

route('GET', '/api/files/download/:token', async ({ req, res, reqId, params, url }) => {
  if (!rateLimit(`dl:${clientIp(req)}`, 30, 60 * 1000).ok) return sendError(res, 429, 'RATE_LIMITED', '下载过于频繁', reqId)
  const { files } = await getStores()
  const data = await files.read()
  const share = data.shares.find((s) => s.token === params.token)
  // 过期或不存在的链接返回同一个 404，不暴露文件是否存在
  if (!share || (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now())) return sendError(res, 404, 'NOT_FOUND', '链接不存在或已失效', reqId)
  if (share.passwordHash && !checkPassword(url.searchParams.get('password'), share.passwordHash)) {
    // BE-05：密码错误单独限流，避免 30/分 的下载限流被用来爆破
    if (!rateLimit(`share-pw:${clientIp(req)}`, 5, 10 * 60 * 1000).ok) return sendError(res, 429, 'RATE_LIMITED', '密码错误次数过多，请稍后再试', reqId)
    return sendError(res, 401, 'PASSWORD_REQUIRED', '需要访问密码', reqId)
  }
  const file = data.files.find((f) => f.id === share.fileId)
  if (!file || file.status === 'deleted') return sendError(res, 404, 'NOT_FOUND', '链接不存在或已失效', reqId)
  await files.update((d) => {
    const s = d.shares.find((x) => x.token === params.token)
    if (s) s.visits = (s.visits ?? 0) + 1
    const f = d.files.find((x) => x.id === share.fileId)
    if (f) f.downloads = (f.downloads ?? 0) + 1
  })
  streamFile(req, res, file.storageKey, file.name)
})
