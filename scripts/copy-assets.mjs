/** 一次性资产搬运：把仓库里的简历原件复制到 public/files（F6）。 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const out = join(root, 'public', 'files')
mkdirSync(out, { recursive: true })

const source = join(root, 'AI全栈开发-晓叶-研2.docx')
if (!existsSync(source)) {
  console.error('[copy-assets] 找不到简历原件：AI全栈开发-晓叶-研2.docx')
  process.exit(1)
}
copyFileSync(source, join(out, 'wyx-resume-2026.docx'))
console.log('[copy-assets] public/files/wyx-resume-2026.docx ✓')
