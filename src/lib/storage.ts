/**
 * 本地存储的唯一入口（fx.md R4）。
 *
 * 之前 9 个 key 散落在各页面里、且没有 schema 版本：一旦数据结构调整，
 * 老访客的 localStorage 会把新代码打挂。这里做三件事：
 *   1. 所有 key 集中成 STORAGE_KEYS，带上 @v1 版本后缀；
 *   2. 读取时做一次「旧 key → 新 key」迁移，老数据不丢；
 *   3. 读取时做形状校验，校验失败回落种子，不把脏数据喂给组件。
 */

export const STORAGE_VERSION = 'v1'

const namespaced = (name: string) => `wyx:${name}@${STORAGE_VERSION}`

/** 站内所有 localStorage key。新增存储只改这里，禁止在页面里写字符串字面量。 */
export const STORAGE_KEYS = {
  theme: namespaced('theme'),
  guestbook: namespaced('guestbook'),
  guestbookLikes: namespaced('guestbook-likes'),
  momentsExtra: namespaced('moments-extra'),
  /** 恋爱记录相册（图片压缩后的 base64，见 services/loveAlbum） */
  loveAlbum: namespaced('love-album'),
  momentsLiked: namespaced('moments-liked'),
  momentsComments: namespaced('moments-comments'),
  toolboxStars: namespaced('toolbox-stars'),
  fileStars: namespaced('file-stars'),
  musicFav: namespaced('music-fav'),
  /** 埋点本地样本（B7 的降级实现，无 Cookie，只统计本机会话） */
  analytics: namespaced('analytics'),
  /** 文章阅读位置（F-06） */
  readingPos: namespaced('reading-pos'),
  /** ⌘K 最近搜索（F-11） */
  recentSearch: namespaced('recent-search'),
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

/** 版本化之前用过的旧 key，读不到新 key 时迁移一次。 */
const LEGACY_KEYS: Partial<Record<StorageKey, string>> = {
  [STORAGE_KEYS.theme]: 'wyx:theme',
  [STORAGE_KEYS.guestbook]: 'wyx-guestbook',
  [STORAGE_KEYS.guestbookLikes]: 'wyx-guestbook-likes',
  [STORAGE_KEYS.momentsExtra]: 'wyx-moments-extra',
  [STORAGE_KEYS.momentsLiked]: 'wyx-moments-liked',
  [STORAGE_KEYS.momentsComments]: 'wyx-moments-comments',
  [STORAGE_KEYS.toolboxStars]: 'wyx-toolbox-stars',
  [STORAGE_KEYS.fileStars]: 'wyx-file-stars',
  [STORAGE_KEYS.musicFav]: 'wyx-music-fav',
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    // 隐私模式 / 被禁用的第三方存储：读写全部静默降级为内存态
    return null
  }
}

/* --------------------------------- validators ------------------------------ */

export type Validator<T> = (value: unknown) => value is T

export const isStringArray: Validator<string[]> = (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

export const arrayOf =
  <T>(pred: (item: T) => boolean): Validator<T[]> =>
  (v): v is T[] =>
    Array.isArray(v) && v.every((item) => !!item && typeof item === 'object' && pred(item as T))

export const isRecordOf =
  <T>(pred: (item: T) => boolean): Validator<Record<string, T>> =>
  (v): v is Record<string, T> =>
    !!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v as Record<string, unknown>).every((x) => !!x && pred(x as T))

export const isRecordOfStringArray: Validator<Record<string, string[]>> = isRecordOf<string[]>((v) => isStringArray(v))

/** 字符串 → 数字 → 布尔都当成「原始值记录」，用于埋点样本这类宽松结构 */
export const isPlainRecord: Validator<Record<string, unknown>> = (v): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

/* -----------------------------------读写 ----------------------------------- */

export function readStored<T>(key: StorageKey, fallback: T, validate?: Validator<T>): T {
  const store = safeStorage()
  if (!store) return fallback
  try {
    let raw = store.getItem(key)
    if (raw === null) {
      // 迁移：老 key 有值就搬到带版本的新 key
      const legacyKey = LEGACY_KEYS[key]
      const legacy = legacyKey ? store.getItem(legacyKey) : null
      if (legacy !== null) {
        store.setItem(key, legacy)
        store.removeItem(legacyKey!)
        raw = legacy
      }
      if (raw === null) return fallback
    }
    if (key === STORAGE_KEYS.theme) return raw as unknown as T
    const parsed: unknown = JSON.parse(raw)
    if (validate && !validate(parsed)) return fallback
    return parsed as T
  } catch {
    return fallback
  }
}

export function writeStored<T>(key: StorageKey, value: T) {
  const store = safeStorage()
  if (!store) return
  try {
    store.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  } catch {
    /* 配额满 / 被禁用：本次会话内存态照常工作 */
  }
}

export function removeStored(key: StorageKey) {
  try {
    safeStorage()?.removeItem(key)
  } catch {
    /* ignore */
  }
}

/** 写满配额 / 存储被禁用：调用方需要把它当成一次失败告诉用户，而不是静默丢掉数据 */
export class QuotaFullError extends Error {}

/**
 * 与 writeStored 的唯一区别：失败会抛。
 * 只给「丢了就等于白干」的写入用（相册图片这种大对象），普通偏好设置继续走 writeStored。
 */
export function writeStoredStrict<T>(key: StorageKey, value: T) {
  const store = safeStorage()
  if (!store) throw new QuotaFullError('浏览器存储不可用（可能是隐私模式），这次上传只留在当前页面')
  try {
    store.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  } catch {
    throw new QuotaFullError('本机相册空间已满，先删几张再传')
  }
}
