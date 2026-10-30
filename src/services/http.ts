import { serverConfig } from './config'

/** 统一的接口错误：UI 只需要区分「网络/服务不可用」和「业务失败」两类。 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** 未接服务端时抛这个，调用方据此回落本地实现，UI 标注「预置 / 本机」。 */
export class NotSupportedError extends Error {
  constructor(feature: string) {
    super(`${feature} 需要服务端能力，当前为纯前端演示模式`)
    this.name = 'NotSupportedError'
  }
}

export function isNotSupported(err: unknown): err is NotSupportedError {
  return err instanceof NotSupportedError
}

type FetchInit = RequestInit & { timeoutMs?: number }

/**
 * 带超时的 JSON 请求。没有配置 baseUrl 时直接抛 NotSupportedError，
 * 保证「未接后端」是一个可预判的分支，而不是一个 fetch 失败。
 */
export async function apiJson<T>(path: string, init: FetchInit = {}): Promise<T> {
  if (!serverConfig.enabled) throw new NotSupportedError(path)
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), init.timeoutMs ?? serverConfig.requestTimeoutMs)
  try {
    const res = await fetch(`${serverConfig.baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    })
    if (!res.ok) throw new ApiError(`${path} → HTTP ${res.status}`, res.status)
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    if ((err as Error)?.name === 'AbortError') throw new ApiError(`${path} 请求超时`)
    throw new ApiError(`${path} 网络不可用：${(err as Error)?.message ?? 'unknown'}`)
  } finally {
    window.clearTimeout(timer)
  }
}

/** B2：刷新页面时不因为「拿不到会话」把站点打死，所以失败一律返回 null */
export async function apiJsonSafe<T>(path: string, init: FetchInit = {}): Promise<T | null> {
  try {
    return await apiJson<T>(path, init)
  } catch {
    return null
  }
}
