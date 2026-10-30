/**
 * 模型网关（fx.md A-01 / A-02）。
 *
 * OpenAI 兼容：POST {AI_BASE_URL}/chat/completions，stream=true。
 * · 密钥只在服务端 env，前端零密钥
 * · 首 token 超时（默认 8s）→ 中断并重试 1 次
 * · 上游 5xx / 网络错误 → 重试 1 次，仍失败抛 MODEL_UNAVAILABLE（前端落回预置）
 * · 逐行解析 `data:`，把 delta 透传给路由层
 */
import { env, hasModelKey } from '../lib/env.mjs'

export const modelAvailable = hasModelKey

export async function streamModel(messages, { onDelta, signal, model }) {
  if (!hasModelKey()) throw Object.assign(new Error('未配置模型密钥'), { status: 503, code: 'MODEL_UNAVAILABLE' })

  let attempt = 0
  let lastError = null
  while (attempt < 2) {
    attempt += 1
    try {
      return await once(messages, { onDelta, signal, model })
    } catch (err) {
      lastError = err
      if (err?.name === 'AbortError' || signal?.aborted) throw err
    }
  }
  throw Object.assign(new Error(`模型不可用：${lastError?.message ?? 'unknown'}`), { status: 503, code: 'MODEL_UNAVAILABLE' })
}

async function once(messages, { onDelta, signal, model }) {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  const timeout = setTimeout(() => controller.abort(), env.ai.timeoutMs)
  let firstTokenTimer = setTimeout(() => controller.abort(), env.ai.firstTokenMs)

  try {
    const res = await fetch(`${env.ai.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.ai.apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: model || env.ai.model,
        messages,
        stream: true,
        max_tokens: env.ai.maxOutputTokens,
        temperature: 0.3,
      }),
    })
    if (!res.ok || !res.body) throw Object.assign(new Error(`上游 HTTP ${res.status}`), { status: 502, code: 'UPSTREAM_ERROR' })

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let text = ''
    let promptTokens = 0
    let completionTokens = 0

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const json = JSON.parse(payload)
          const delta = json.choices?.[0]?.delta?.content ?? ''
          if (json.usage) {
            promptTokens = json.usage.prompt_tokens ?? promptTokens
            completionTokens = json.usage.completion_tokens ?? completionTokens
          }
          if (delta) {
            if (firstTokenTimer) {
              clearTimeout(firstTokenTimer)
              firstTokenTimer = null
            }
            text += delta
            onDelta(delta, text)
          }
        } catch {
          /* 半包，等下一个 chunk */
        }
      }
    }
    return { text, usage: { promptTokens: promptTokens || 0, completionTokens: completionTokens || 0 } }
  } finally {
    clearTimeout(timeout)
    if (firstTokenTimer) clearTimeout(firstTokenTimer)
    signal?.removeEventListener('abort', onAbort)
  }
}
