/**
 * 生成服务端内容快照（fx.md B-01）。
 *
 * 把 src/data/*.ts 打包成一份 JSON，作为 server 的初始种子：
 *   · 与前端类型同构，接口返回后页面无需改渲染
 *   · 统一补齐 status / version 字段，供发布状态机使用
 * 运行：node scripts/gen-content-snapshot.mjs（npm run gen:content）
 */
import esbuild from 'esbuild'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const { build } = esbuild
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const srcDir = join(root, 'src', 'data')
const tmp = join(root, 'node_modules', '.gen-content')

const entry = [
  `export { articles } from '${join(srcDir, 'articles.ts').replace(/\\/g, '/')}'`,
  `export { moments, playlist, trips } from '${join(srcDir, 'life.ts').replace(/\\/g, '/')}'`,
  `export { friends, growthTimeline } from '${join(srcDir, 'me.ts').replace(/\\/g, '/')}'`,
  `export { projects } from '${join(srcDir, 'projects.ts').replace(/\\/g, '/')}'`,
  `export { awards, education, research, skillGroups, stats, profile, siteMeta } from '${join(srcDir, 'site.ts').replace(/\\/g, '/')}'`,
  `export { resourceFiles, toolboxGroups } from '${join(srcDir, 'work.ts').replace(/\\/g, '/')}'`,
].join('\n')

rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp, { recursive: true })
writeFileSync(join(tmp, 'entry.mts'), entry, 'utf8')

await build({
  entryPoints: [join(tmp, 'entry.mts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: join(tmp, 'entry.mjs'),
  logLevel: 'silent',
})

const data = await import(pathToFileURL(join(tmp, 'entry.mjs')).href + '?t=' + Date.now())
rmSync(tmp, { recursive: true, force: true })

/** 补齐 id / status / version，保证每个可发布条目都能被状态机管理 */
const normalize = (domain, list) =>
  (list ?? []).map((item, i) => ({
    ...item,
    id: item.id ?? `${domain}-${i + 1}`,
    status: item.status ?? 'published',
    version: item.version ?? 1,
  }))

const snapshot = {
  generatedAt: new Date().toISOString(),
  articles: normalize('articles', data.articles),
  projects: normalize('projects', data.projects),
  moments: normalize('moments', data.moments),
  trips: normalize('trips', data.trips),
  tracks: normalize('tracks', data.playlist),
  friends: normalize('friends', data.friends),
  awards: normalize('awards', data.awards),
  skills: normalize('skills', data.skillGroups),
  resources: normalize('resources', data.resourceFiles),
  toolboxGroups: data.toolboxGroups ?? [],
  education: data.education ?? [],
  research: data.research ?? [],
  stats: data.stats ?? null,
  growthTimeline: data.growthTimeline ?? [],
  profile: data.profile ?? null,
  siteMeta: data.siteMeta ?? null,
}

const outDir = join(root, 'server', 'seed')
mkdirSync(outDir, { recursive: true })
const outFile = join(outDir, 'content.json')
writeFileSync(outFile, JSON.stringify(snapshot, null, 2), 'utf8')

console.log(`[gen-content] ${outFile}`)
for (const key of ['articles', 'projects', 'moments', 'trips', 'tracks', 'friends', 'awards', 'skills', 'resources']) {
  console.log(`  · ${key}: ${snapshot[key].length}`)
}
