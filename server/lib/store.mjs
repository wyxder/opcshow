/**
 * 零依赖 JSON 持久化（fx.md B-01 的本地可运行替代）。
 *
 * 生产建议 PostgreSQL + Prisma；本仓库在没有数据库的环境下用「JSON 文件 + 原子写 + 串行队列」
 * 先让读写真正持久化：刷新、重启都不丢，接口与类型保持同构，后续换库只替换本文件。
 */
import { mkdir, readFile, readdir, rename, rm, writeFile, stat } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
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
    // 唯一 tmp 名（pid + 时间 + 随机后缀），避免同毫秒并发写撞名
    const tmp = `${this.path}.${process.pid}.${Date.now()}.${randomBytes(4).toString('hex')}.tmp`
    await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
    try {
      await rename(tmp, this.path)
    } catch {
      // Windows 覆盖已存在文件可能失败。先用原子 rename 把旧副本挪到 .bak，
      // 再放新文件；任何一步失败都回滚，绝不先 rm 掉唯一有效数据文件。
      const bak = `${this.path}.bak`
      let moved = false
      try {
        await rename(this.path, bak)
        moved = true
      } catch { /* 旧文件可能还不存在 */ }
      try {
        await rename(tmp, this.path)
      } catch (err) {
        if (moved) await rename(bak, this.path).catch(() => {})
        await rm(tmp, { force: true }).catch(() => {})
        throw err
      }
      if (moved) await rm(bak, { force: true }).catch(() => {})
    }
    this.version += 1
    cache.set(this.path, data)
  }

  /** 串行化读改写：在深拷贝上执行，读者不会看到写一半的状态（BE-12） */
  update(mutator) {
    const run = this.chain.then(async () => {
      const current = await this.read()
      const draft = structuredClone(current)
      const result = await mutator(draft)
      await this.#write(draft)
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
    ai: new JsonStore('ai.json', { prompts: [], usage: [], sessions: [], cache: {}, feedback: [], quota: {}, models: [] }),
    jobs: new JsonStore('jobs.json', { jobs: [] }),
    audit: new JsonStore('audit.json', { logs: [] }),
    /** BE-14：个人资料 / 站点设置（后台资料页与 SEO 页的真源） */
    settings: new JsonStore('settings.json', { profile: null, site: null, updatedAt: null }),
    /** 简历模块与版本（后台「简历管理」三个 Tab 的真源） */
    resume: new JsonStore('resume.json', { modules: [], versions: [] }),
  }
  return stores
}

/** 备份/恢复（B-10）：全量快照；BE-06 不导出会话（避免 sid 哈希随备份外流） */
export async function backupSnapshot() {
  const s = await getStores()
  const snapshot = {}
  for (const [name, store] of Object.entries(s)) {
    if (name === 'sessions') continue
    snapshot[name] = await store.read()
  }
  return { createdAt: new Date().toISOString(), snapshot }
}

/** 启动清理：进程在 writeFile 阶段被中断会留下 0 字节 tmp，这里统一回收 */
export async function cleanupTmpFiles() {
  const dir = resolve(env.dataDir)
  if (!existsSync(dir)) return 0
  let removed = 0
  for (const name of await readdir(dir)) {
    if (!name.endsWith('.tmp')) continue
    try {
      await rm(resolve(dir, name), { force: true })
      removed += 1
    } catch { /* ignore */ }
  }
  return removed
}

/** 恢复快照前先做结构校验，避免把账号清空导致永久锁死 */
export async function restoreSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') throw Object.assign(new Error('快照格式不正确'), { status: 422, code: 'INVALID_SNAPSHOT' })
  const users = snapshot.users?.users
  const content = snapshot.content
  if (!Array.isArray(users) || !users.length || !content || typeof content !== 'object' || !Array.isArray(content.articles)) {
    throw Object.assign(new Error('快照缺少有效的 users / content 数据，已拒绝恢复'), { status: 422, code: 'INVALID_SNAPSHOT' })
  }
  const s = await getStores()
  // 先在内存里校验所有条目可序列化，再逐个落盘，减少半途失败的不一致面
  for (const [name, data] of Object.entries(snapshot)) {
    if (!s[name] || !data || typeof data !== 'object') continue
    JSON.stringify(data)
  }
  for (const [name, data] of Object.entries(snapshot)) {
    if (!s[name] || !data || typeof data !== 'object') continue
    await s[name].write(data)
  }
}
