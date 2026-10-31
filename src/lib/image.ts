/**
 * 图片读取与压缩（前台上传链路的统一入口）。
 *
 * 相册落在 localStorage（配额约 5MB），手机一张原图就能到 6MB+，
 * 所以压缩不是可选优化而是必经步骤：长边 1440 → 优先 WebP → 超标再降质量与尺寸。
 * 全程只在浏览器里做，不把任何二进制发出去。
 */

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
/** 原图体积上限：超过它连解码都很慢，直接拒收而不是硬压 */
export const MAX_SOURCE_BYTES = 12 * 1024 * 1024
/** 压缩目标体积（base64 落盘后的实际字节数） */
export const TARGET_BYTES = 320 * 1024

const MAX_EDGE = 1440
const MIN_EDGE = 640
/** 质量 → 尺寸的降级顺序：先压质量，质量到底再缩尺寸 */
const QUALITY_STEPS = [0.82, 0.7, 0.6, 0.52]

export type ProcessedImage = {
  src: string
  /** 原始宽高：卡片用它算 aspect-ratio，图片加载时不抖布局（fx.md P4） */
  width: number
  height: number
  bytes: number
}

/** 用户能看懂的拒收原因，页面直接把 message 显示出来 */
export class ImageRejectedError extends Error {}

let mimeCache: string | null = null

/** Safari / 旧浏览器不支持 canvas 出 WebP，探一次就缓存结果 */
function outMime() {
  if (mimeCache) return mimeCache
  try {
    const probe = document.createElement('canvas')
    probe.width = 1
    probe.height = 1
    mimeCache = probe.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg'
  } catch {
    mimeCache = 'image/jpeg'
  }
  return mimeCache
}

/** base64 data URL → 真实落盘字节数（去掉头部，3 字符 ≈ 2 字节） */
export function dataUrlBytes(dataUrl: string) {
  return Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75)
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function validateImage(file: File) {
  const name = file.name || '这张图'
  if (!file.type.startsWith('image/') && !IMAGE_TYPES.includes(file.type)) throw new ImageRejectedError(`${name} 不是图片，只收 JPG / PNG / WebP`)
  if (!file.size) throw new ImageRejectedError(`${name} 是空文件`)
  if (file.size > MAX_SOURCE_BYTES) throw new ImageRejectedError(`${name} 超过 ${formatBytes(MAX_SOURCE_BYTES)}，先裁小一点再传`)
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  // createImageBitmap 默认按 EXIF 转正方向，手机竖拍的照片不会躺倒
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file)
      return { source: bmp, width: bmp.width, height: bmp.height }
    } catch {
      /* 少数 HEIC / 特殊格式走下面的 <img> 兜底 */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new ImageRejectedError('这张图解不开，换个 JPG / PNG 试试'))
      img.src = url
    })
    return { source: img, width: img.naturalWidth, height: img.naturalHeight }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function paint(source: CanvasImageSource, w: number, h: number, quality: number) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImageRejectedError('当前浏览器不支持画布压缩，换个浏览器再传')
  // JPEG 没有透明通道，先铺白底，否则 PNG 透明区会变黑块
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, w, h)
  return canvas.toDataURL(outMime(), quality)
}

/** 校验 → 解码 → 等比压缩，返回可直接入库的记录字段 */
export async function compressImage(file: File): Promise<ProcessedImage> {
  validateImage(file)
  const { source, width, height } = await decode(file)
  if (!width || !height) throw new ImageRejectedError('这张图的尺寸读不出来，换一张试试')

  const minScale = Math.min(1, MIN_EDGE / Math.max(width, height))
  let scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  let src = ''
  for (let i = 0; i < QUALITY_STEPS.length + 2; i += 1) {
    const quality = QUALITY_STEPS[Math.min(i, QUALITY_STEPS.length - 1)]
    src = paint(source, Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)), quality)
    if (dataUrlBytes(src) <= TARGET_BYTES) break
    // 质量已经压到底还是太大：再缩一档尺寸重来
    if (i >= QUALITY_STEPS.length - 1) scale = Math.max(minScale, scale * 0.78)
  }
  return { src, width, height, bytes: dataUrlBytes(src) }
}
