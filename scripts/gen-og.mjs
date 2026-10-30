/**
 * 生成 public/og-cover.png（fx.md S1 / S2）。
 *
 * 为什么手写 PNG：不引入任何新依赖，构建期就能产出真实可分享的图片，
 * 避免「og:image 指向不存在的文件」这种分享卡空白的低级问题。
 * 带中文排版的动态文章 OG 图属于 fx.md B8（服务端 satori + @resvg），
 * 接入后这里只保留站点级的默认封面。
 *
 * 用法：node scripts/gen-og.mjs
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** 极简 RGBA PNG 编码器：够画一张静态封面 */
function encodePng(width, height, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* --------------------------------- 画布 ---------------------------------- */

const W = 1200
const H = 630
const px = new Uint8Array(W * H * 4)

const PAPER = [244, 240, 230]
const SURFACE = [251, 248, 241]
const INK = [20, 20, 15]
const LIME = [201, 241, 88]
const CORAL = [255, 90, 43]
const MUTED = [210, 203, 186]

function set(x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= W || y >= H) return
  const i = (y * W + x) * 4
  px[i] = r
  px[i + 1] = g
  px[i + 2] = b
  px[i + 3] = a
}

function rect(x0, y0, w, h, color, a = 255) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, color, a)
}

function ring(x0, y0, w, h, color, t = 3) {
  rect(x0, y0, w, t, color)
  rect(x0, y0 + h - t, w, t, color)
  rect(x0, y0, t, h, color)
  rect(x0 + w - t, y0, t, h, color)
}

function line(x0, y0, x1, y1, color, t = 6) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps)
    const y = Math.round(y0 + ((y1 - y0) * i) / steps)
    rect(x - t / 2, y - t / 2, t, t, color)
  }
}

/* -------------------------------- 画面构成 -------------------------------- */
// 1. 纸底 + 细网格（对应站内 01 纸感主题的纹理语言）
rect(0, 0, W, H, PAPER)
for (let y = 0; y < H; y += 28) for (let x = 0; x < W; x += 28) set(x, y, MUTED, 90)

// 2. 左侧主强调块 + 硬投影语言
rect(64, 64, 300, 300, LIME)
rect(364, 92, 24, 272, INK)
rect(92, 364, 272, 24, INK)

// 3. 用三条粗线段拼出 W 的字形（品牌标识，不含文字排印）
line(110, 130, 175, 300, INK, 26)
line(175, 300, 240, 180, INK, 26)
line(240, 180, 305, 300, INK, 26)
line(305, 300, 355, 140, INK, 26)

// 4. 右侧信息栏：卡片描边 + 数据条
ring(430, 96, 690, 200, INK, 4)
rect(454, 120, 220, 16, INK)
rect(454, 152, 540, 10, [180, 175, 160])
rect(454, 176, 430, 10, [180, 175, 160])
rect(454, 224, 120, 34, CORAL)
rect(596, 224, 120, 34, SURFACE)
ring(596, 224, 120, 34, INK, 3)
rect(738, 224, 120, 34, SURFACE)
ring(738, 224, 120, 34, INK, 3)

// 5. 底部：指标条 + 半调点阵
for (let i = 0; i < 26; i++) rect(430 + i * 27, 330, 16, 16 + (i % 5) * 14, i % 4 === 0 ? LIME : INK, i % 4 === 0 ? 255 : 200)
for (let y = 400; y < 560; y += 10) for (let x = 64; x < 1136; x += 10) set(x, y, INK, 26)

// 6. 外描边
ring(0, 0, W, H, INK, 8)

const png = encodePng(W, H, px)
mkdirSync(join(root, 'public'), { recursive: true })
writeFileSync(join(root, 'public', 'og-cover.png'), png)
console.log(`[gen-og] public/og-cover.png ✓（${W}×${H}，${(png.length / 1024).toFixed(1)} KB）`)
