/**
 * AI 网关路由（fx.md A-01 ~ A-11）。
 *
 * POST /api/ai/chat           SSE 或 JSON；无密钥时走站内检索摘录（不冒充模型）
 * POST /api/ai/feedback       👍/👎 + 失败原因
 * GET  /api/ai/usage         真实用量（admin）
 * GET  /api/ai/prompts       Prompt 版本
 * PUT  /api/ai/prompts/:id   编辑并升版本
 * POST /api/ai/prompts/:id/rollback 回滚到上一版
 * GET  /api/ai/models        模型配置（不含密钥）
 * POST /api/ai/models        新增模型（仅记录 provider/model，密钥走环境变量）
 * POST /api/ai/reindex       重建索引
 * GET  /api/ai/eval          评测报告
 * GET  /api/ai/sessions/:id  会话恢复
 * GET  /api/ai/health        网关健康
 */
import { route } from '../lib/router.mjs'
import { sendJson, sendError, readJson, rateLimit, ipHash, logEvent } from '../lib/http.mjs'
import { getStores } from '../lib/store.mjs'
import { getSession, requireRole, audit, ROLE_ADMIN } from '../lib/auth.mjs'
import { text, oneOf, arrayOf } from '../lib/validate.mjs'
import { env, hasModelKey } from '../lib/env.mjs'
import { getIndex, invalidate, stats } from '../ai/indexer.mjs'
import { retrieve, verifyReferences, extractiveAnswer, estimateTokens, trim } from '../ai/rag.mjs'
import { DEFAULT_PROMPTS, GUARDRAILS, activePrompt, buildMessages, buildSiteFacts } from '../ai/prompts.mjs'
import { detectInjection, filterOutput, INJECTION_REFUSAL } from '../ai/safety.mjs'
import { modelAvailable, streamModel } from '../ai/gateway.mjs'
import { cacheKey, checkQuota, checkBudget, consumeQuota, recordUsage, getUsageSummary, costOf } from '../ai/usage.mjs'
import { pushHit, deviceFromUA } from '../lib/hits.mjs'

async function ensureAiSeed() {
  const { ai } = await getStores()
  await ai.update((data) => {
    if (!data.prompts.length) data.prompts = DEFAULT_PROMPTS.map((p) => ({ ...p, history: [] }))
    if (!data.models) {
      data.models = [
        { id: 'm_env', name: '环境变量模型', provider: env.ai.baseUrl || '未配置', model: env.ai.model, enabled: hasModelKey(), isDefault: true, source: 'env' },
      ]
    }
  })
  return ai
}

/* ---------------------------------- chat ---------------------------------- */

const parseContext = (raw) => {
  if (!raw) return null
  if (typeof raw === 'string') return { articleTitle: raw }
  if (typeof raw === 'object') {
    return {
      articleId: raw.articleId ? String(raw.articleId) : null,
      articleTitle: raw.articleTitle ? String(raw.articleTitle) : null,
      sectionId: raw.sectionId ? String(raw.sectionId) : null,
      sectionTitle: raw.sectionTitle ? String(raw.sectionTitle) : null,
    }
  }
  return null
}

function extractPaths(textValue) {
  return [...new Set((textValue.match(/\/learn\/[a-z0-9-]+#?[a-z0-9-]*/gi) ?? []))]
}

async function pickModel(aiData) {
  // AI-04：后台设为默认且启用的自定义模型优先，否则回落环境变量模型
  const custom = (aiData.models ?? []).find((m) => m.isDefault && m.enabled && m.source !== 'env')
  return custom?.model || env.ai.model
}

/** AI-01：缓存写入 + 最多 500 条的 LRU-ish 淘汰（之前只有读、没有写） */
async function rememberAnswer(key, payload) {
  const { ai } = await getStores()
  await ai.update((data) => {
    data.cache = data.cache ?? {}
    data.cache[key] = { ...payload, at: Date.now() }
    const entries = Object.entries(data.cache)
    if (entries.length > 500) {
      entries.sort((a, b) => (a[1].at ?? 0) - (b[1].at ?? 0))
      for (const [k] of entries.slice(0, entries.length - 500)) delete data.cache[k]
    }
  })
}

/** AI-08：站点事实从运行时内容统计，不再写死 6 篇 / 7 个项目 */
async function siteFactsNow() {
  const { content } = await getStores()
  const data = await content.read()
  const articleCount = (data.articles ?? []).filter((a) => a.status === 'published').length
  const projectCount = (data.projects ?? []).filter((p) => p.status === 'published').length
  return buildSiteFacts({ articleCount, projectCount })
}

async function recordChatUsage(req, { model, promptText, answer, latency, source, ok, upstream }) {
  const promptTokens = upstream?.promptTokens || estimateTokens(promptText)
  const completionTokens = upstream?.completionTokens || estimateTokens(answer)
  await recordUsage({ ip: ipHash(req), model, tokens: promptTokens + completionTokens, cost: costOf(promptTokens, completionTokens), latency, source, ok })
}

route('POST', '/api/ai/chat', async ({ req, res, reqId }) => {
  // AI-05 / BE-02：限流与配额统一用 IP 哈希，且不再被伪造 XFF 绕过
  const ip = ipHash(req)
  if (!rateLimit(`ai:${ip}`, 20, 60 * 1000).ok) return sendError(res, 429, 'RATE_LIMITED', '问得太快，稍等一下', reqId)
  const quota = await checkQuota(ip)
  if (!quota.ok) return sendError(res, 429, 'QUOTA_EXCEEDED', quota.reason === 'global' ? `站点今日 AI 额度已用完（${quota.globalLimit} 次）` : `今日额度已用完（${quota.limit} 次），明天再来`, reqId)

  const body = await readJson(req, 128 * 1024)
  const message = text(body.message ?? body.input, { field: '问题', min: 1, max: 800 })
  // AI-02：兼容字符串与结构化上下文（articleId / sectionId 参与检索加权）
  const ctxRaw = body.context ?? (body.articleId ? { articleId: body.articleId, sectionId: body.sectionId, articleTitle: body.articleTitle, sectionTitle: body.sectionTitle } : null)
  const context = parseContext(ctxRaw)
  const history = arrayOf(body.history ?? [], { field: 'history', max: 20 }).slice(-8)
  const stream = body.stream !== false
  const sessionId = body.sessionId ? text(body.sessionId, { field: 'sessionId', max: 64 }) : `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const ai = await ensureAiSeed()
  const aiData = await ai.read()
  const prompt = activePrompt(aiData.prompts, '全站对话')
  const index = await getIndex()
  const modelName = await pickModel(aiData)
  const budget = await checkBudget()
  const facts = await siteFactsNow()
  // 一条 AI 轮次写进埋点，数据看板的「AI 会话」不再恒为 0（BE-09）
  void pushHit({ path: '/ai', kind: 'ai', ipHash: ip, device: deviceFromUA(req.headers['user-agent']) })

  const injection = detectInjection(message)
  if (injection.flagged) {
    logEvent('warn', 'ai.injection.blocked', { reqId, ip, hits: injection.count })
    if (stream) return sendSse(res, [{ delta: INJECTION_REFUSAL }, { done: true, source: 'retrieval', references: [], degraded: false, sessionId, flagged: true }])
    return sendJson(res, 200, { answer: INJECTION_REFUSAL, source: 'retrieval', references: [], degraded: false, sessionId, flagged: true })
  }

  const key = cacheKey(message, context, prompt.version)
  const cached = aiData.cache?.[key]
  if (cached && Date.now() - cached.at < 6 * 3600 * 1000) {
    await consumeQuota(ip)
    if (stream) return sendSse(res, [{ delta: cached.answer }, { done: true, source: cached.source, references: cached.references, degraded: false, sessionId, cached: true }])
    return sendJson(res, 200, { answer: cached.answer, source: cached.source, references: cached.references, degraded: false, sessionId, cached: true })
  }

  const hits = retrieve(index, { message, context, topK: 5 })
  const messages = buildMessages({ prompt, guardrails: GUARDRAILS, context, hits, history, message, facts })
  const promptText = messages.map((m) => m.content).join(' ')
  const degradedSources = []
  if (!budget.ok) degradedSources.push('MONTHLY_BUDGET_EXCEEDED')
  const canModel = modelAvailable() && budget.ok

  const started = Date.now()
  const ac = new AbortController()
  req.on('close', () => {
    if (!res.writableEnded) ac.abort()
  })

  /* ------------------------------ SSE 模式 ------------------------------ */
  if (stream) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    const write = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)

    try {
      let answer = ''
      let source = 'retrieval'
      let upstreamUsage = null
      if (canModel) {
        source = 'model'
        try {
          let sent = ''
          const result = await streamModel(messages, {
            model: modelName,
            signal: ac.signal,
            onDelta: (_, full) => {
              const next = full.slice(sent.length)
              sent = full
              if (next) write({ delta: next })
            },
            // AI-11：重试前通知前端清空已收到的半截内容，避免截断/重复
            onReset: () => {
              sent = ''
              write({ reset: true })
            },
          })
          answer = result.text
          upstreamUsage = result.usage
        } catch (err) {
          logEvent('warn', 'ai.model.failed', { reqId, error: err.message })
          source = 'retrieval'
          const fallback = extractiveAnswer(hits)
          answer = filterOutput(fallback.text)
          write({ delta: answer })
          write({ done: true, source, references: fallback.references, degraded: true, sessionId, reason: 'MODEL_UNAVAILABLE' })
          await consumeQuota(ip)
          await recordChatUsage(req, { model: 'fallback', promptText, answer, latency: Date.now() - started, source: 'retrieval', ok: false })
          await rememberAnswer(key, { answer, source, references: fallback.references, degraded: true })
          await saveSession(sessionId, message, answer, source, fallback.references, ip)
          return res.end()
        }
      } else {
        const fallback = extractiveAnswer(hits)
        answer = filterOutput(fallback.text)
        write({ delta: answer })
        write({ done: true, source, references: fallback.references, degraded: !budget.ok, sessionId, budgetExceeded: !budget.ok })
        await consumeQuota(ip)
        await recordChatUsage(req, { model: 'retrieval', promptText, answer, latency: Date.now() - started, source, ok: true })
        await rememberAnswer(key, { answer, source, references: fallback.references, degraded: !budget.ok })
        await saveSession(sessionId, message, answer, source, fallback.references, ip)
        return res.end()
      }

      /* 有模型：先流式输出，结束再做引用校验 */
      answer = filterOutput(answer)
      const claimed = extractPaths(answer).map((path) => ({ path }))
      const verified = verifyReferences(index, claimed, 0.5)
      const references = verified.passed && verified.references.length ? verified.references : hits.slice(0, 3).map((h) => ({ docId: h.docId, section: h.subTitle, path: h.path, snippet: trim(h.text, 80) }))
      const degraded = !verified.passed
      write({ done: true, source, references, degraded, sessionId })
      await consumeQuota(ip)
      await recordChatUsage(req, { model: modelName, promptText, answer, latency: Date.now() - started, source, ok: true, upstream: upstreamUsage })
      await rememberAnswer(key, { answer, source, references, degraded })
      await saveSession(sessionId, message, answer, source, references, ip)
      return res.end()
    } catch (err) {
      logEvent('error', 'ai.stream.failed', { reqId, error: err.message })
      write({ error: '模型暂时不可用', code: 'MODEL_UNAVAILABLE' })
      return res.end()
    }
  }

  /* ------------------------------ JSON 模式 ------------------------------ */
  try {
    let answer = ''
    let source = 'retrieval'
    let degraded = false
    let upstreamUsage = null
    if (canModel) {
      source = 'model'
      const result = await streamModel(messages, { model: modelName, signal: ac.signal, onDelta: () => {} })
      answer = filterOutput(result.text)
      upstreamUsage = result.usage
    } else {
      const fallback = extractiveAnswer(hits)
      answer = filterOutput(fallback.text)
      const refs = fallback.references
      await consumeQuota(ip)
      await recordChatUsage(req, { model: 'retrieval', promptText, answer, latency: Date.now() - started, source, ok: true })
      await rememberAnswer(key, { answer, source, references: refs, degraded: !budget.ok })
      await saveSession(sessionId, message, answer, source, refs, ip)
      return sendJson(res, 200, { answer, source, references: refs, degraded: !budget.ok, sessionId, budgetExceeded: !budget.ok })
    }
    const claimed = extractPaths(answer).map((path) => ({ path }))
    const verified = verifyReferences(index, claimed, 0.5)
    const references = verified.passed && verified.references.length ? verified.references : hits.slice(0, 3).map((h) => ({ docId: h.docId, section: h.subTitle, path: h.path, snippet: trim(h.text, 80) }))
    degraded = !verified.passed
    await consumeQuota(ip)
    await recordChatUsage(req, { model: modelName, promptText, answer, latency: Date.now() - started, source, ok: true, upstream: upstreamUsage })
    await rememberAnswer(key, { answer, source, references, degraded })
    await saveSession(sessionId, message, answer, source, references, ip)
    sendJson(res, 200, { answer, source, references, degraded, sessionId })
  } catch (err) {
    logEvent('error', 'ai.json.failed', { reqId, error: err.message })
    sendError(res, 503, 'MODEL_UNAVAILABLE', '模型不可用，前端可落回预置问答', reqId)
  }
})

function sendSse(res, events) {
  // BE-11：缓存/注入分支也要带 X-Accel-Buffering，Nginx 后才不会整包缓冲
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
  for (const e of events) res.write(`data: ${JSON.stringify(e)}\n\n`)
  res.end()
}

async function saveSession(sessionId, userText, answer, source, references, ip) {
  const { ai } = await getStores()
  await ai.update((data) => {
    let s = data.sessions.find((x) => x.id === sessionId)
    if (!s) {
      s = { id: sessionId, createdAt: new Date().toISOString(), messages: [], ipHash: ip ?? null }
      data.sessions.unshift(s)
    }
    s.messages.push({ role: 'user', text: userText, ts: new Date().toISOString() })
    s.messages.push({ role: 'assistant', text: answer, source, references, ts: new Date().toISOString() })
    // AI-07：会话只保留最近 40 条，避免 ai.json 无上限增长
    s.messages = s.messages.slice(-40)
    s.updatedAt = new Date().toISOString()
    data.sessions = data.sessions.slice(0, 200)
  })
}

/* ------------------------------- 反馈 / 会话 ------------------------------- */

route('POST', '/api/ai/feedback', async ({ req, res, reqId }) => {
  const body = await readJson(req, 32 * 1024)
  const sessionId = text(body.sessionId, { field: 'sessionId', min: 1, max: 64 })
  const rating = oneOf(body.rating, ['up', 'down'], 'rating')
  const reason = body.reason ? text(body.reason, { field: 'reason', max: 200 }) : null
  const { ai } = await getStores()
  await ai.update((data) => {
    data.feedback.unshift({ id: `f_${Date.now()}`, sessionId, rating, reason, ts: new Date().toISOString() })
    data.feedback = data.feedback.slice(0, 1000)
  })
  sendJson(res, 201, { ok: true })
})

/** AI-07：后台可审阅反馈，并按 👎 回流到评测集 */
route('GET', '/api/ai/feedback', async ({ req, res }) => {
  requireRole(await getSession(req), ROLE_ADMIN)
  const { ai } = await getStores()
  const data = await ai.read()
  sendJson(res, 200, data.feedback.slice(0, 100))
})

route('GET', '/api/ai/sessions/:id', async ({ req, res, reqId, params, session: login }) => {
  const { ai } = await getStores()
  const data = await ai.read()
  const chat = data.sessions.find((s) => s.id === params.id)
  // 访客只能读同一出口 IP 发起的会话；后台角色可读全部，避免 NAT 共享 IP 时串读
  const privileged = Boolean(login && ['admin', 'editor'].includes(login.role))
  if (!chat || (!privileged && chat.ipHash && chat.ipHash !== ipHash(req))) return sendError(res, 404, 'NOT_FOUND', '会话不存在', reqId)
  sendJson(res, 200, chat)
})

/* --------------------------------- 用量/配置 -------------------------------- */

route('GET', '/api/ai/usage', async ({ req, res }) => {
  requireRole(await getSession(req), ROLE_ADMIN)
  sendJson(res, 200, await getUsageSummary())
})

route('GET', '/api/ai/models', async ({ req, res }) => {
  requireRole(await getSession(req))
  const ai = await ensureAiSeed()
  const data = await ai.read()
  sendJson(res, 200, { models: data.models, env: { baseUrl: env.ai.baseUrl || null, model: env.ai.model, hasKey: hasModelKey() } })
})

route('POST', '/api/ai/models', async ({ req, res }) => {
  const session = requireRole(await getSession(req), ROLE_ADMIN)
  const body = await readJson(req, 32 * 1024)
  const name = text(body.name, { field: '名称', min: 1, max: 60 })
  const provider = text(body.provider ?? '自定义', { field: '供应商', max: 40 })
  const model = text(body.model, { field: '模型 ID', min: 1, max: 80 })
  const ai = await ensureAiSeed()
  const item = await ai.update((data) => {
    const record = { id: `m_${Date.now()}`, name, provider, model, enabled: false, isDefault: false, source: 'custom', createdAt: new Date().toISOString() }
    data.models.push(record)
    return record
  })
  await audit(session.user, 'ai.model.create', item.id, null, { name, provider, model })
  sendJson(res, 201, item)
})

route('PATCH', '/api/ai/models/:id', async ({ req, res, reqId, params }) => {
  const session = requireRole(await getSession(req), ROLE_ADMIN)
  const body = await readJson(req, 8 * 1024)
  const ai = await ensureAiSeed()
  const item = await ai.update((data) => {
    const m = data.models.find((x) => x.id === params.id)
    if (!m) throw Object.assign(new Error('模型不存在'), { status: 404, code: 'NOT_FOUND' })
    if (typeof body.enabled === 'boolean') m.enabled = body.enabled
    if (body.isDefault === true) {
      data.models.forEach((x) => {
        x.isDefault = x.id === m.id
      })
      m.enabled = true
    } else if (body.isDefault === false && m.isDefault) {
      m.isDefault = false
    }
    return m
  })
  await audit(session.user, 'ai.model.update', params.id, null, { enabled: item.enabled, isDefault: item.isDefault })
  sendJson(res, 200, item)
})

route('DELETE', '/api/ai/models/:id', async ({ req, res, reqId, params }) => {
  const session = requireRole(await getSession(req), ROLE_ADMIN)
  const ai = await ensureAiSeed()
  const target = (await ai.read()).models.find((m) => m.id === params.id)
  if (!target) return sendError(res, 404, 'NOT_FOUND', '模型不存在', reqId)
  if (target.source === 'env') return sendError(res, 422, 'ENV_MODEL_READONLY', '环境变量模型不能删除，请改 .env', reqId)
  await ai.update((data) => {
    data.models = data.models.filter((m) => m.id !== params.id)
    if (target.isDefault) data.models.forEach((m) => (m.isDefault = false))
  })
  await audit(session.user, 'ai.model.delete', params.id, null, null)
  sendJson(res, 200, { ok: true })
})

/** AI-07：后台标记反馈已处理（审阅闭环） */
route('PATCH', '/api/ai/feedback/:id', async ({ req, res, reqId, params }) => {
  const session = requireRole(await getSession(req), ROLE_ADMIN)
  const body = await readJson(req, 8 * 1024)
  const ai = await getStores().then((s) => s.ai)
  const item = await ai.update((data) => {
    const f = data.feedback.find((x) => x.id === params.id)
    if (!f) throw Object.assign(new Error('反馈不存在'), { status: 404, code: 'NOT_FOUND' })
    f.reviewed = body.reviewed !== false
    f.reviewedAt = new Date().toISOString()
    return f
  })
  await audit(session.user, 'ai.feedback.review', params.id, null, { reviewed: item.reviewed })
  sendJson(res, 200, item)
})

route('DELETE', '/api/ai/prompts/:id', async ({ req, res, reqId, params }) => {
  const session = requireRole(await getSession(req), ['admin', 'editor'])
  const ai = await ensureAiSeed()
  const data = await ai.read()
  const target = data.prompts.find((p) => p.id === params.id)
  if (!target) return sendError(res, 404, 'NOT_FOUND', '提示词不存在', reqId)
  if (data.prompts.filter((p) => p.scene === target.scene).length <= 1) return sendError(res, 422, 'LAST_PROMPT', '该场景至少保留一条提示词', reqId)
  await ai.update((d) => {
    d.prompts = d.prompts.filter((p) => p.id !== params.id)
  })
  await audit(session.user, 'ai.prompt.delete', params.id, null, null)
  sendJson(res, 200, { ok: true })
})

route('GET', '/api/ai/prompts', async ({ req, res }) => {
  requireRole(await getSession(req))
  const ai = await ensureAiSeed()
  const data = await ai.read()
  sendJson(res, 200, data.prompts)
})

route('POST', '/api/ai/prompts', async ({ req, res, reqId }) => {
  const session = requireRole(await getSession(req), ['admin', 'editor'])
  const body = await readJson(req, 64 * 1024)
  const name = text(body.name, { field: '名称', min: 1, max: 80 })
  const scene = text(body.scene ?? '全站对话', { field: '场景', max: 40 })
  const bodyText = text(body.body, { field: '提示词正文', min: 1, max: 8000 })
  const ai = await ensureAiSeed()
  const item = await ai.update((data) => {
    const record = {
      id: `p_${Date.now()}`,
      name,
      scene,
      version: 1,
      active: body.active !== false,
      body: bodyText,
      updatedAt: new Date().toISOString(),
      history: [],
    }
    data.prompts.push(record)
    return record
  })
  await audit(session.user, 'ai.prompt.create', item.id, null, { scene })
  sendJson(res, 201, { id: item.id, version: item.version })
})

route('PUT', '/api/ai/prompts/:id', async ({ req, res, reqId, params }) => {
  const session = requireRole(await getSession(req), ['admin', 'editor'])
  const body = await readJson(req, 64 * 1024)
  const hasBody = typeof body.body === 'string' && body.body.trim().length > 0
  const hasActive = typeof body.active === 'boolean'
  if (!hasBody && !hasActive) return sendError(res, 422, 'EMPTY_PATCH', '没有可更新的字段', reqId)
  const ai = await ensureAiSeed()
  const item = await ai.update((data) => {
    const p = data.prompts.find((x) => x.id === params.id)
    if (!p) throw Object.assign(new Error('提示词不存在'), { status: 404, code: 'NOT_FOUND' })
    if (hasBody) {
      p.history = p.history ?? []
      p.history.unshift({ version: p.version, body: p.body, updatedAt: p.updatedAt })
      p.body = text(body.body, { field: '提示词正文', min: 1, max: 8000 })
      p.version = (p.version ?? 1) + 1
      p.updatedAt = new Date().toISOString()
    }
    if (body.name) p.name = text(body.name, { field: '名称', max: 80 })
    if (hasActive) p.active = body.active
    return p
  })
  await audit(session.user, 'ai.prompt.update', params.id, null, { version: item.version, active: item.active })
  sendJson(res, 200, { id: item.id, version: item.version, active: item.active, updatedAt: item.updatedAt })
})

route('POST', '/api/ai/prompts/:id/rollback', async ({ req, res, reqId, params }) => {
  const session = requireRole(await getSession(req), ['admin', 'editor'])
  const ai = await ensureAiSeed()
  const item = await ai.update((data) => {
    const p = data.prompts.find((x) => x.id === params.id)
    if (!p || !p.history?.length) throw Object.assign(new Error('没有可回滚的历史版本'), { status: 422, code: 'NO_HISTORY' })
    const prev = p.history.shift()
    p.history.unshift({ version: p.version, body: p.body, updatedAt: p.updatedAt })
    p.body = prev.body
    p.version = (p.version ?? 1) + 1
    p.updatedAt = new Date().toISOString()
    return p
  })
  await audit(session.user, 'ai.prompt.rollback', params.id, null, { version: item.version })
  sendJson(res, 200, { id: item.id, version: item.version })
})

route('POST', '/api/ai/reindex', async ({ req, res }) => {
  const session = requireRole(await getSession(req))
  invalidate()
  await getIndex()
  await audit(session.user, 'ai.reindex', 'index', null, null)
  sendJson(res, 200, await stats())
})

route('GET', '/api/ai/health', async ({ res }) => {
  const idx = await stats()
  sendJson(res, 200, {
    model: modelAvailable() ? 'configured' : 'not-configured',
    mode: modelAvailable() ? 'model' : 'retrieval',
    index: idx,
    promptScene: (await (await ensureAiSeed()).read()).prompts.filter((p) => p.active).map((p) => p.scene),
  })
})

route('GET', '/api/ai/eval', async ({ req, res, reqId }) => {
  requireRole(await getSession(req), ROLE_ADMIN)
  const { readFile } = await import('node:fs/promises')
  try {
    const raw = await readFile(new URL('eval-report.json', import.meta.url).href, 'utf8')
    sendJson(res, 200, JSON.parse(raw))
  } catch {
    sendError(res, 404, 'NO_REPORT', '还没有评测报告，先运行 npm run eval:ai', reqId)
  }
})
