/**
 * 数据自洽 + 代码卫生门禁（fx.md R3 / R4 / R6 / F4 的回归拦截）。
 * 用法：node scripts/check-data.mjs   （npm run check:data）
 *
 * 检查项：
 *   1. articles.index（标题级索引）与 articles（正文）的元信息完全一致 —— 防止两份来源漂移；
 *   2. 分类计数与派生值一致；
 *   3. 前台 src/ 里不再出现 href="#" 死链；
 *   4. localStorage key 只能在 src/lib/storage.ts 里出现字面量；
 *   5. id 生成不再使用 Date.now()（统一 newId()）。
 */
import esbuild from 'esbuild'
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const { build } = esbuild

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const srcDir = join(root, 'src')
const tmp = join(root, 'node_modules', '.check-data')

let problems = 0
const fail = (msg) => {
  problems++
  console.error(`✗ ${msg}`)
}
const pass = (msg) => console.log(`✓ ${msg}`)

/* ------------------------------- 1. 数据一致性 ------------------------------ */
rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp, { recursive: true })
writeFileSync(
  join(tmp, 'entry.mts'),
  `export { articles, articleCategories as categoriesFromBodies } from '${join(srcDir, 'data', 'articles.ts').replace(/\\/g, '/')}'\n`
    + `export { articleMeta, articleCategories as categoriesFromIndex, totalArticles } from '${join(srcDir, 'data', 'articles.index.ts').replace(/\\/g, '/')}'\n`,
  'utf8',
)
await build({ entryPoints: [join(tmp, 'entry.mts')], bundle: true, format: 'esm', platform: 'node', outfile: join(tmp, 'entry.mjs'), logLevel: 'silent' })
const data = await import(pathToFileURL(join(tmp, 'entry.mjs')).href + '?t=' + Date.now())
rmSync(tmp, { recursive: true, force: true })

const { articles, articleMeta, categoriesFromBodies, categoriesFromIndex, totalArticles } = data
if (articles.length !== articleMeta.length) fail(`文章数量不一致：正文 ${articles.length} 篇 / 索引 ${articleMeta.length} 篇`)
for (const a of articles) {
  const m = articleMeta.find((x) => x.id === a.id)
  if (!m) {
    fail(`索引缺少文章 ${a.id}`)
    continue
  }
  for (const key of ['title', 'subtitle', 'category', 'date', 'readMin', 'views']) {
    if (m[key] !== a[key]) fail(`${a.id} 的 ${key} 在索引与正文中不一致（${String(m[key])} ≠ ${String(a[key])}）`)
  }
}
if (!problems) pass(`文章索引与正文元信息一致（${articles.length} 篇）`)

for (const c of categoriesFromBodies.filter((x) => x.key !== 'all')) {
  const real = articles.filter((a) => a.category === c.key).length
  if (c.count !== real) fail(`分类「${c.key}」计数 ${c.count} ≠ 派生值 ${real}`)
}
for (const c of categoriesFromIndex) {
  const twin = categoriesFromBodies.find((x) => x.key === c.key)
  if (!twin) fail(`索引里有分类「${c.key}」，正文里没有`)
  else if (twin.count !== c.count) fail(`分类「${c.key}」索引计数 ${c.count} ≠ 正文计数 ${twin.count}`)
}
if (totalArticles !== articles.length) fail(`totalArticles ${totalArticles} ≠ ${articles.length}`)
pass('分类计数为派生值，索引与正文一致（R3 / D2）')

/* ------------------------------- 2. 代码卫生 ------------------------------- */
const tsFiles = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(ts|tsx)$/.test(name)) tsFiles.push(p)
  }
}
walk(srcDir)

let deadLinks = 0
let rawKeys = 0
let dateIds = 0
for (const file of tsFiles) {
  const raw = readFileSync(file, 'utf8')
  const rel = relative(root, file).replace(/\\/g, '/')
  // 先剔掉注释，否则「不留 href="#"」这类说明文字会被误报
  const text = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  for (const _ of text.matchAll(/href="#"|to="#"/g)) {
    fail(`${rel} 仍有死链 href="#"（F4）`)
    deadLinks++
  }
  if (rel !== 'src/lib/storage.ts') {
    for (const m of text.matchAll(/(?:localStorage\.(?:getItem|setItem|removeItem)|useLocalStorage)\(\s*['"`](wyx[^'"`]*)['"`]/g)) {
      fail(`${rel} 直接读写了存储 key「${m[1]}」，请改用 STORAGE_KEYS（R4）`)
      rawKeys++
    }
  }
  for (const m of text.matchAll(/\bid:\s*[`'"][^`'"]*\$\{Date\.now\(\)\}/g)) {
    fail(`${rel} 用 Date.now() 生成 id，请改用 newId()（R6）`)
    dateIds++
  }
}
/* F-15：后台种子里的粉丝口径必须来自 figures / platforms 派生，不能手写 */
const adminData = readFileSync(join(srcDir, 'admin', 'data.ts'), 'utf8')
const hardcodedFollowers = adminData.match(/\d+(?:\.\d+)?w\s*(?:粉|粉丝)/g) ?? []
for (const hit of hardcodedFollowers) fail(`src/admin/data.ts 手写粉丝口径「${hit}」，请改用 formatWan(totalFollowers)（F-15）`)
const hardcodedBadge = readFileSync(join(srcDir, 'admin', 'AdminShell.tsx'), 'utf8').match(/badge\s*:\s*\d+/g) ?? []
for (const hit of hardcodedBadge) fail(`src/admin/AdminShell.tsx 写死 badge（${hit}），应从 countPending/listPending 派生（F-15）`)
if (!hardcodedFollowers.length && !hardcodedBadge.length) pass('后台数字为派生值，badge 不写死（F-15）')

if (!deadLinks) pass('前台没有 href="#" 死链（F4）')
if (!rawKeys) pass('localStorage key 全部收敛到 STORAGE_KEYS（R4）')
if (!dateIds) pass('id 生成统一走 newId()（R6）')

if (problems) {
  console.error(`\n[check-data] ${problems} 项需要修复`)
  process.exit(1)
}
console.log('\n[check-data] 全部通过')
