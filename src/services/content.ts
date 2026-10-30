/**
 * 内容仓储（fx.md B1 / B3）。
 *
 * 现在所有内容的真实来源还是 src/data/*.ts —— 这一点不掩饰：
 * 后台的「发布 / 下架 / 草稿」在没有服务端之前不可能真的写进任何数据库。
 * 这里先把**读接口**定型：返回类型和现有数据完全同构，
 * 接上 GET /api/* 之后，页面只需要把 `contents` 的 import 换掉，不用改渲染。
 *
 * 写接口（upsert / 状态机 / 乐观锁 version）在未接入时统一抛 NotSupportedError，
 * 由 UI 明确提示「演示模式：不会真的保存」。
 */
import { articles } from '@/data/articles'
import { moments, playlist, trips } from '@/data/life'
import { friends } from '@/data/me'
import { projects } from '@/data/projects'
import { awards, education, research, skillGroups, stats } from '@/data/site'
import { resourceFiles, toolboxGroups } from '@/data/work'
import { serverConfig } from './config'
import { apiJson, apiJsonSafe, NotSupportedError } from './http'

export type ContentDomain =
  | 'articles'
  | 'projects'
  | 'moments'
  | 'trips'
  | 'tracks'
  | 'friends'
  | 'awards'
  | 'skills'
  | 'resources'

export type PublishStatus = 'draft' | 'pending' | 'published' | 'hidden'

export interface ContentRepository {
  origin: 'local' | 'server'
  /** 读：返回与各数据模块同构的数组，页面无感切换 */
  list: <K extends ContentDomain>(domain: K) => Promise<DomainData[K]>
  /** 写（B3）：未接入服务端时抛 NotSupportedError */
  upsert: (domain: ContentDomain, payload: unknown, version?: number) => Promise<unknown>
  /** 状态机（B3）：草稿 → 待审 → 已发布 → 已隐藏 */
  setStatus: (domain: ContentDomain, id: string, status: PublishStatus) => Promise<unknown>
}

export type DomainData = {
  articles: typeof articles
  projects: typeof projects
  moments: typeof moments
  trips: typeof trips
  tracks: typeof playlist
  friends: typeof friends
  awards: typeof awards
  skills: typeof skillGroups
  resources: typeof resourceFiles
}

const localSnapshot: DomainData = {
  articles,
  projects,
  moments,
  trips,
  tracks: playlist,
  friends,
  awards,
  skills: skillGroups,
  resources: resourceFiles,
}

export const localContent: ContentRepository = {
  origin: 'local',
  async list(domain) {
    return localSnapshot[domain]
  },
  async upsert() {
    throw new NotSupportedError('内容写入')
  },
  async setStatus() {
    throw new NotSupportedError('发布状态变更')
  },
}

export const remoteContent: ContentRepository = {
  origin: 'server',
  async list<K extends ContentDomain>(domain: K): Promise<DomainData[K]> {
    const data = await apiJsonSafe<DomainData[K]>(`/api/content/${domain}`)
    // 接口挂了也不能让页面空掉：回落本地快照
    return data ?? (localSnapshot[domain] as DomainData[K])
  },
  upsert: (domain, payload, version) =>
    apiJson(`/api/content/${domain}`, { method: 'PUT', body: JSON.stringify({ payload, version }) }),
  setStatus: (domain, id, status) =>
    apiJson(`/api/content/${domain}/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
}

/** 服务端未配置时直接用本地快照，页面永远拿得到数据 */
export const contents: ContentRepository = serverConfig.enabled ? remoteContent : localContent

/** 给后台「模块开关」页用的静态概览（B1 接入后换成 /api/content/meta） */
export const contentMeta = { education, research, stats, toolboxGroups }
