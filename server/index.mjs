/**
 * WYX.SPACE API 入口（零依赖 Node，fx.md 第 4 节的最小可运行实现）。
 *
 * 启动：npm run api
 * 默认 127.0.0.1:8787；开发时把前端 VITE_API_BASE 指向 http://127.0.0.1:8787
 * 生产建议反向代理到 /api，并开启 HTTPS（Cookie 自动 Secure）。
 */
import { createServer } from 'node:http'
import { env, assertSecureConfig } from './lib/env.mjs'
import { applyCors, setCommonHeaders, sendError, checkOrigin, errorOf, logEvent, requestId } from './lib/http.mjs'
import { match } from './lib/router.mjs'
import { ensureUsers, getSession, audit } from './lib/auth.mjs'
import { getIndex } from './ai/indexer.mjs'

import './routes/auth.mjs'
import './routes/content.mjs'
import './routes/guestbook.mjs'
import './routes/files.mjs'
import './routes/analytics.mjs'
import './routes/ai.mjs'
import './routes/system.mjs'
import './routes/settings.mjs'

const bootAt = Date.now()

const server = createServer(async (req, res) => {
  const reqId = requestId()
  const started = Date.now()
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  setCommonHeaders(res, req)
  applyCors(req, res)
  res.setHeader('X-Request-Id', reqId)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  if (!checkOrigin(req)) {
    logEvent('warn', 'security.origin.rejected', { reqId, origin: req.headers.origin, path: url.pathname })
    return sendError(res, 403, 'ORIGIN_FORBIDDEN', '来源不被允许', reqId)
  }

  const hit = match(req.method ?? 'GET', url.pathname)
  if (!hit) {
    return sendError(res, 404, 'NOT_FOUND', `没有这个接口：${req.method} ${url.pathname}`, reqId)
  }

  try {
    const session = await getSession(req).catch(() => null)
    await hit.handler({ req, res, url, reqId, params: hit.params, session })
    logEvent('info', 'http.request', { reqId, method: req.method, path: url.pathname, status: res.statusCode, ms: Date.now() - started })
  } catch (err) {
    const mapped = errorOf(err)
    logEvent('error', 'http.error', { reqId, method: req.method, path: url.pathname, ...mapped, stack: err?.stack?.split('\n').slice(0, 4).join(' | ') })
    if (!res.headersSent) sendError(res, mapped.status, mapped.code, mapped.message, reqId, { details: err?.details })
    else res.end()
  }
})

async function boot() {
  // BE-01：缺口令 / 仍用示例口令时直接拒绝启动
  assertSecureConfig()
  await ensureUsers()
  await getIndex()
  server.listen(env.port, env.host, () => {
    logEvent('info', 'server.start', {
      url: `http://${env.host}:${env.port}`,
      dataDir: env.dataDir,
      cors: env.corsOrigins,
      model: env.ai.apiKey ? 'configured' : 'retrieval-only',
      bootMs: Date.now() - bootAt,
    })
  })
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    logEvent('info', 'server.stop', { signal })
    audit('system', 'server.stop', 'process', null, { signal }).finally(() => server.close(() => process.exit(0)))
  })
}

boot().catch((err) => {
  console.error('boot failed', err)
  process.exit(1)
})
