/**
 * 主题令牌对比度门禁（fx.md T4）。
 *
 * 遍历 src/index.css 里 5 套主题的令牌，按 WCAG 2.1 相对亮度算正文对比度：
 *   ink / bg            必须 ≥ 4.5
 *   ink-soft / surface  必须 ≥ 4.5
 *   ink-mute / surface  必须 ≥ 3.0（辅助小字，放宽一档）
 *   on-accent / lime    必须 ≥ 3.0（大号强调文字）
 * 新增第 6 套主题时这里会直接拦住了，不用再靠人工实测。
 *
 * 用法：node scripts/contrast-check.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const css = readFileSync(join(root, 'src', 'index.css'), 'utf8')

const THEMES = ['paper', 'lab', 'swiss', 'terminal', 'pop']

function channel(v) {
  const n = Number(v) / 255
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
}

function luminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function ratio(fg, bg) {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
  return (l1 + 0.05) / (l2 + 0.05)
}

function tokensOf(theme) {
  const open = theme === 'paper' ? css.indexOf("[data-theme='paper']") : css.indexOf(`[data-theme='${theme}']`)
  if (open < 0) return null
  const body = css.slice(open, css.indexOf('\n  }', open))
  const map = {}
  for (const m of body.matchAll(/--(c-[a-z0-9-]+):\s*([\d\s]+);/g)) {
    map[m[1]] = m[2].trim().split(/\s+/).map(Number)
  }
  return map
}

const RULES = [
  { pair: ['c-ink', 'c-bg'], min: 4.5, label: '正文 / 页面底' },
  { pair: ['c-ink-soft', 'c-surface'], min: 4.5, label: '次级正文 / 卡片面' },
  { pair: ['c-ink-mute', 'c-surface'], min: 3.0, label: '弱化小字 / 卡片面' },
  { pair: ['c-on-accent', 'c-lime'], min: 3.0, label: '主强调块上的字' },
  { pair: ['c-ink', 'c-surface'], min: 4.5, label: '正文 / 卡片面' },
]

let failed = 0
const lines = []
for (const theme of THEMES) {
  const t = tokensOf(theme)
  if (!t) {
    console.error(`✗ 主题 ${theme} 在 index.css 里找不到令牌块`)
    failed++
    continue
  }
  for (const rule of RULES) {
    const [fgKey, bgKey] = rule.pair
    if (!t[fgKey] || !t[bgKey]) {
      lines.push(`✗ ${theme}：缺少令牌 --${fgKey} / --${bgKey}`)
      failed++
      continue
    }
    const value = ratio(t[fgKey], t[bgKey])
    const ok = value >= rule.min
    if (!ok) failed++
    lines.push(`${ok ? '✓' : '✗'} ${theme.padEnd(9)} ${rule.label.padEnd(16)} ${value.toFixed(2)}:1 (≥ ${rule.min})`)
  }
}

console.log(lines.join('\n'))
if (failed) {
  console.error(`\n[contrast] ${failed} 项未达标`)
  process.exit(1)
}
console.log(`\n[contrast] ${THEMES.length} 套主题 × ${RULES.length} 条规则全部通过`)
