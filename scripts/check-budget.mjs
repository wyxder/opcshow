/**
 * 包体预算门禁（fx.md F-12）。
 * 用法：node scripts/check-budget.mjs   （npm run check:budget，需先 npm run build）
 *
 * 预算：
 *   · 入口 JS（dist/assets/index-*.js）gzip ≤ 50 kB
 *   · 首屏 CSS（dist/assets/index-*.css）gzip ≤ 20 kB
 *   · 单页 chunk（非 vendor）gzip ≤ 50 kB
 *
 * vendor 白名单（react / motion / icons）不设限：它们被所有页面共享，不随页面数量增长。
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(root, 'dist', 'assets')

let problems = 0
const fail = (msg) => {
  problems++
  console.error(`✗ ${msg}`)
}
const pass = (msg) => console.log(`✓ ${msg}`)

let files
try {
  files = readdirSync(dist).filter((n) => /\.(js|css)$/.test(n))
} catch {
  console.error('✗ 找不到 dist/assets，请先运行 npm run build')
  process.exit(1)
}

/** 与 vite 构建日志的 gzip 列同一口径：压缩后字节数 */
const gz = (file) => gzipSync(readFileSync(join(dist, file))).length
const kb = (n) => `${(n / 1000).toFixed(2)} kB`

const entry = files.find((n) => /^index-.*\.js$/.test(n))
const css = files.find((n) => /^index-.*\.css$/.test(n))

if (!entry) fail('dist/assets 里没有入口 index-*.js')
else {
  const size = gz(entry)
  if (size > 50 * 1000) fail(`入口 ${entry} gzip ${kb(size)} > 50 kB 预算`)
  else pass(`入口 ${entry} gzip ${kb(size)} ≤ 50 kB`)
}

if (css) {
  const size = gz(css)
  if (size > 20 * 1000) fail(`首屏 CSS ${css} gzip ${kb(size)} > 20 kB 预算`)
  else pass(`首屏 CSS ${css} gzip ${kb(size)} ≤ 20 kB`)
}

const VENDOR = /^(react|motion|icons|vendor)-/
let oversized = 0
for (const file of files.filter((n) => n.endsWith('.js') && !/^index-/.test(n) && !VENDOR.test(n))) {
  const size = gz(file)
  if (size > 50 * 1000) {
    fail(`页面 chunk ${file} gzip ${kb(size)} > 50 kB 预算`)
    oversized++
  }
}
if (!oversized) pass('页面 chunk 均 ≤ 50 kB（vendor 不计）')

if (problems) {
  console.error(`\n[check-budget] ${problems} 项超出预算`)
  process.exit(1)
}
console.log('\n[check-budget] 全部在预算内')
