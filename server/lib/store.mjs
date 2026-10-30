/**
 * 零依赖 JSON 持久化（fx.md B-01 的本地可运行替代）。
 *
 * 生产建议 PostgreSQL + Prisma；本仓库在没有数据库的环境下用「JSON 文件 + 原子写 + 串行队列」
 * 先让读写真正持久化：刷新、重启都不丢，接口与类型保持同构，后续换库只替换本文件。
 */
import { mkdir, readFile, rename, rm, writeFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { env } from './env.mjs'

const cache = new Map()

export class JsonStore {
  constructor(file, initial) {
    this.path = resolve(env.dataDir, file)
    this.initial = initial
    this.chain = Promise.resolve()
    this.version = 0
  }

  async #ensure() {
    await mkdir(dirname(this.path), { recursive: true })
  }

  async read() {
    if (cache.has(this.path)) return cache.get(this.path)
    await this.#ensure()
    let data
    if (existsSync(this.path)) {
      try {
        data = JSON.parse(await readFile(this.path, 'utf8'))
      } catch {
        data = structuredClone(this.initial)
      }
    } else {
      data = structuredClone(this.initial)
      await this.#write(data)
    }
    cache.set(this.path, data)
    return data
  }

  async #write(data) {
    const tmp = `${this.path}.${process.pid}.${Date.now()}.tmp`
    await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
    await rm(this.path, { force: true })
    await rename(tmp, this.path)
    this.version += 1
    cache.set(this.path, data)
  }

  /** 串行化读改写，避免并发请求丢更新 */
  update(mutator) {
    const run = this.chain.then(async () => {
      const data = await this.read()
      const result = await mutator(data)
      await this.#write(data)
      return result
    })
    this.chain = run.catch(() => {})
    return run
  }

  async write(data) {
    return this.update((current) => {
      for (const key of Object.keys(current)) delete current[key]
      Object.assign(current, data)
    })
  }

  async meta() {
    await this.#ensure()
    try {
      const s = await stat(this.path)
      return { size: s.size, updatedAt: s.mtime.toISOString() }
    } catch {
      return { size: 0, updatedAt: null }
    }
  }
}

/* -------------------------------- 单例存储 -------------------------------- */

let stores = null

export async function getStores() {
  if (stores) return stores
  const seed = JSON.parse(await readFile(resolve(env.seedDir, 'content.json'), 'utf8'))
  stores = {
    content: new JsonStore('content.json', seed),
    users: new JsonStore('users.json', { users: [] }),
    sessions: new JsonStore('sessions.json', { sessions: [] }),
    guestbook: new JsonStore('guestbook.json', { messages: [] }),
    files: new JsonStore('files.json', { files: [], shares: [] }),
    analytics: new JsonStore('analytics.json', { hits: [], errors: [] }),
    ai: new JsonStore('ai.json', { prompts: [], usage: [], sessions: [], cache: {}, feedback: [] }),
    jobs: new JsonStore('jobs.json', { jobs: [] }),
    audit: new JsonStore('audit.json', { logs: [] }),
  }
  return stores
}

/** 备份/恢复（B-10）：把全部 JSON 数据打包成一个快照文件 */
export async function backupSnapshot() {
  const s = await getStores()
  const snapshot = {}
  for (const [name, store] of Object.entries(s)) snapshot[name] = await store.read()
  return { createdAt: new Date().toISOString(), snapshot }
}

export async function restoreSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') throw Object.assign(new Error('快照格式不正确'), { status: 422, code: 'INVALID_SNAPSHOT' })
  const s = await getStores()
  for (const [name, data] of Object.entries(snapshot)) {
    if (!s[name] || !data || typeof data !== 'object') continue
    await s[name].write(data)
  }
}
