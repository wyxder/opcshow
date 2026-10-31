/**
 * 简历模块与版本的持久化（后台「简历管理」三个 Tab 的真源）。
 *
 * 解析任务完成后会把识别出的字段写成一个版本；模块编辑与版本恢复都落 resume.json。
 */
import { getStores } from './store.mjs'

const newId = () => `rv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

export async function getResumeState() {
  const { resume } = await getStores()
  return resume.read()
}

export async function saveModules(modules, actor) {
  const { resume } = await getStores()
  return resume.update((data) => {
    data.modules = (modules ?? []).map((m, i) => ({
      id: m.id ?? `m_${i + 1}`,
      title: String(m.title ?? `模块 ${i + 1}`),
      summary: String(m.summary ?? ''),
      items: Array.isArray(m.items) ? m.items.map(String) : [],
      enabled: m.enabled !== false,
      updatedAt: new Date().toISOString(),
    }))
    data.updatedBy = actor ?? null
    return data.modules
  })
}

export async function createVersion({ name, note, modules, source = 'manual', actor }) {
  const { resume } = await getStores()
  return resume.update((data) => {
    const version = {
      id: newId(),
      name: String(name || `版本 ${data.versions.length + 1}`),
      note: String(note ?? ''),
      source,
      actor: actor ?? null,
      createdAt: new Date().toISOString(),
      modules: structuredClone(modules ?? data.modules ?? []),
    }
    data.versions.unshift(version)
    data.versions = data.versions.slice(0, 50)
    return version
  })
}

export async function restoreVersion(id, actor) {
  const { resume } = await getStores()
  return resume.update((data) => {
    const version = data.versions.find((v) => v.id === id)
    if (!version) throw Object.assign(new Error('版本不存在'), { status: 404, code: 'NOT_FOUND' })
    data.modules = structuredClone(version.modules)
    data.updatedBy = actor ?? null
    return { modules: data.modules, restoredFrom: version.id }
  })
}

export async function deleteVersion(id) {
  const { resume } = await getStores()
  return resume.update((data) => {
    const before = data.versions.length
    data.versions = data.versions.filter((v) => v.id !== id)
    if (data.versions.length === before) throw Object.assign(new Error('版本不存在'), { status: 404, code: 'NOT_FOUND' })
    return { ok: true }
  })
}
