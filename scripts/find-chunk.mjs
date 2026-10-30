/** 检查文章正文被打进了哪个 chunk（fx.md P2 的验证脚本） */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dir = join(root, 'dist', 'assets')
const needles = process.argv[2] ? [process.argv[2]] : ['adaptive_chunk', 'effective_at', 'Farneback', 'KAMER']

const files = readdirSync(dir).filter((n) => n.endsWith('.js'))
for (const needle of needles) {
  const hits = files.filter((f) => readFileSync(join(dir, f), 'utf8').includes(needle))
  console.log(needle.padEnd(18), hits.length ? hits.join(', ') : '(none)')
}
