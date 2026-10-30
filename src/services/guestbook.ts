/**
 * 留言 / 弹幕服务（fx.md F5 / B4 / B5）。
 *
 * 一期（当前）：本地存储 + 明示「仅你可见」+ 前端节流去重；
 * 二期（接服务端）：POST /api/guestbook → 待审核 → 后台 ModerationPage 通过后才出现在墙上。
 * 两种实现共用同一个 repository 接口，页面代码不用改。
 */
import { danmakuSeeds } from '@/data/me'
import { STORAGE_KEYS, arrayOf, readStored, writeStored } from '@/lib/storage'
import { newId } from '@/lib/utils'
import { serverConfig } from './config'
import { apiJson, ApiError } from './http'

export type MessageSource = 'preset' | 'local' | 'remote'
export type ModerationStatus = 'pending' | 'published'

export type GuestMessage = {
  id: string
  user: string
  text: string
  color: string
  time: string
  /** 数据来源：预置种子 / 本机 / 服务端，UI 要如实标注（fx.md 执行要求 2） */
  source: MessageSource
  status?: ModerationStatus
  /** 服务端点赞数；预置与本机留言没有真实计数，UI 不展示假数字 */
  likes?: number
}

export type NewMessage = { user: string; text: string; color: string }

export interface GuestbookRepository {
  origin: MessageSource
  list: () => Promise<GuestMessage[]>
  create: (input: NewMessage) => Promise<GuestMessage>
  /** 访客删自己发的留言（服务端模式下只能删自己会话里的） */
  remove: (id: string) => Promise<void>
}

/* ------------------------------- 输入约束（B5） ------------------------------ */

const NAME_MAX = 12
const TEXT_MAX = 60
/** 同一文本 30s 内不允许重复提交；整体提交 3 次/分钟（前端侧，服务端还要再加 IP 限流） */
const DEDUPE_WINDOW_MS = 30_000
const RATE_LIMIT = { max: 3, windowMs: 60_000 }

const recentHashes = new Map<string, number>()
const submitStamps: number[] = []

export class AbuseBlockedError extends Error {}

function checkAbuse(text: string) {
  const now = Date.now()
  while (submitStamps.length && now - submitStamps[0] > RATE_LIMIT.windowMs) submitStamps.shift()
  if (submitStamps.length >= RATE_LIMIT.max) throw new AbuseBlockedError('发送太快了，歇 1 分钟再试')
  for (const [hash, at] of recentHashes) if (now - at > DEDUPE_WINDOW_MS) recentHashes.delete(hash)
  const hash = `${text.toLowerCase()}|${now - now % DEDUPE_WINDOW_MS}`
  if (recentHashes.has(hash)) throw new AbuseBlockedError('这条刚发过，换点新的再说')
  recentHashes.set(hash, now)
  submitStamps.push(now)
}

export function sanitizeMessage(input: NewMessage) {
  const user = input.user.trim().slice(0, NAME_MAX)
  const text = input.text.trim().slice(0, TEXT_MAX)
  if (!user || !text) throw new AbuseBlockedError('名字和内容都写一点吧')
  return { user, text, color: input.color }
}

/* ------------------------------ 本地适配层（一期） --------------------------- */

const isMsgArray = arrayOf<GuestMessage>((m) => typeof m.id === 'string' && typeof m.text === 'string' && typeof m.user === 'string')

export const localGuestbook: GuestbookRepository = {
  origin: 'local',
  async list() {
    const mine = readStored<GuestMessage[]>(STORAGE_KEYS.guestbook, [], isMsgArray)
    const seeds: GuestMessage[] = danmakuSeeds.map((d) => ({ id: d.id, user: d.user, text: d.text, color: d.color, time: '来访', source: 'preset' }))
    // 种子弹幕与真实留言按时间归并（fx.md F5 二期也要这条排序规则）
    return [...mine, ...seeds]
  },
  async create(input) {
    const clean = sanitizeMessage(input)
    checkAbuse(clean.text)
    const msg: GuestMessage = { ...clean, id: newId('m'), time: new Date().toLocaleDateString('zh-CN'), source: 'local' }
    const mine = readStored<GuestMessage[]>(STORAGE_KEYS.guestbook, [], isMsgArray)
    writeStored(STORAGE_KEYS.guestbook, [msg, ...mine])
    return msg
  },
  async remove(id) {
    const mine = readStored<GuestMessage[]>(STORAGE_KEYS.guestbook, [], isMsgArray)
    writeStored(STORAGE_KEYS.guestbook, mine.filter((m) => m.id !== id))
  },
}

/* ------------------------------ 远端适配层（二期） --------------------------- */

type ServerMessage = {
  id: string
  user: string
  text: string
  color: string
  createdAt: string
  likes?: number
  status?: ModerationStatus
  flagged?: boolean
}

const fmtTime = (iso?: string) => {
  if (!iso) return '刚刚'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '曾经' : d.toLocaleDateString('zh-CN')
}

const toMessage = (m: ServerMessage): GuestMessage => ({
  id: m.id,
  user: m.user,
  text: m.text,
  color: m.color || 'lime',
  time: fmtTime(m.createdAt),
  source: 'remote',
  status: m.status,
  likes: m.likes ?? 0,
})

export const remoteGuestbook: GuestbookRepository = {
  origin: 'remote',
  async list() {
    const data = await apiJson<{ items: ServerMessage[] }>(`${serverConfig.guestbookPath}?status=published`)
    return data.items.map(toMessage)
  },
  async create(input) {
    const clean = sanitizeMessage(input)
    checkAbuse(clean.text)
    // 服务端返回待审状态：先只在自己屏幕上出现，审核通过后进公共墙（B-04）
    const created = await apiJson<{ id: string; status: ModerationStatus; flagged: boolean }>(serverConfig.guestbookPath, {
      method: 'POST',
      body: JSON.stringify(clean),
    })
    return { ...clean, id: created.id, time: '刚刚', source: 'remote', status: created.status, likes: 0 }
  },
  async remove(id) {
    await apiJson(`${serverConfig.guestbookPath}/${id}`, { method: 'DELETE' })
  },
}

/**
 * 审核队列（B-04 / F-07）：
 * · 服务端模式 → GET /api/guestbook?scope=admin（需登录），读真实 pending；
 * · 本地模式 → 把「我发的留言」当成待审项，后台 ModerationPage 也能看到真实数据。
 */
export async function listPending(): Promise<GuestMessage[]> {
  if (serverConfig.enabled) {
    try {
      const data = await apiJson<{ items: ServerMessage[] }>(`${serverConfig.guestbookPath}?scope=admin&status=all&limit=100`)
      return data.items.filter((m) => m.status === 'pending').map(toMessage)
    } catch {
      return []
    }
  }
  const mine = readStored<GuestMessage[]>(STORAGE_KEYS.guestbook, [], isMsgArray)
  return mine.filter((m) => m.source === 'local')
}

/** 待审数量：后台 badge 用这个，不再写死 1 */
export async function countPending(): Promise<number> {
  if (serverConfig.enabled) {
    try {
      const data = await apiJson<{ count: number }>(`${serverConfig.guestbookPath}/pending/count`)
      return data.count
    } catch {
      return 0
    }
  }
  return (await listPending()).length
}

export async function approvePending(id: string) {
  if (serverConfig.enabled) {
    await apiJson(`${serverConfig.guestbookPath}/${id}/approve`, { method: 'POST' })
    return
  }
  const mine = readStored<GuestMessage[]>(STORAGE_KEYS.guestbook, [], isMsgArray)
  writeStored(
    STORAGE_KEYS.guestbook,
    mine.map((m) => (m.id === id ? { ...m, status: 'published' as ModerationStatus } : m)),
  )
}

export async function rejectPending(id: string) {
  if (serverConfig.enabled) {
    await apiJson(`${serverConfig.guestbookPath}/${id}/reject`, { method: 'POST' })
    return
  }
  const mine = readStored<GuestMessage[]>(STORAGE_KEYS.guestbook, [], isMsgArray)
  writeStored(STORAGE_KEYS.guestbook, mine.filter((m) => m.id !== id))
}

/** 点赞按 message id 落库（服务端按 ipHash 去重）；未接服务端返回 null，由页面回落本机 */
export async function toggleLike(id: string): Promise<{ likes: number; liked: boolean } | null> {
  if (!serverConfig.enabled) return null
  try {
    return await apiJson<{ likes: number; liked: boolean }>(`${serverConfig.guestbookPath}/${id}/like`, { method: 'POST' })
  } catch {
    return null
  }
}

/** 举报：3 次后服务端自动打回 pending */
export async function reportMessage(id: string): Promise<boolean> {
  if (!serverConfig.enabled) return false
  try {
    await apiJson(`${serverConfig.guestbookPath}/${id}/report`, { method: 'POST' })
    return true
  } catch {
    return false
  }
}

/* --------------------------------- 对外门面 -------------------------------- */

/** 服务端不可用时自动落回本地，绝不因为断网把留言页打挂 */
export const guestbook: GuestbookRepository = serverConfig.enabled
  ? {
      origin: 'remote',
      list: () => remoteGuestbook.list().catch(() => localGuestbook.list()),
      create: (input) => remoteGuestbook.create(input).catch((err) => (err instanceof ApiError ? localGuestbook.create(input) : Promise.reject(err))),
      remove: (id) => remoteGuestbook.remove(id).catch(() => localGuestbook.remove(id)),
    }
  : localGuestbook
