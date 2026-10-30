/**
 * 图片资源清单（fx.md F1）。
 *
 * 站内目前没有任何真实照片 —— 这是事实，不用 CSS 图形去假装成照片。
 * 这里定义的是「图片一旦补齐，页面怎么用它」的契约：
 *
 *   1. 把文件放进 public/images/（一期）或换成 OSS/CDN 地址（二期，需要 B6 直传签名）；
 *   2. 在这里登记一条 MediaAsset，key 用数据里已有的 label（如 'opc-talk.jpg'）；
 *   3. 页面通过 lookupMedia() 取到就走真实 <img>，取不到就回落 Plate 图形 —— 不用改组件。
 *
 * source 字段是诚实性的关键：'real' = 本人真实照片；'preset' = 示意图，UI 会打角标。
 */
export type MediaAsset = {
  src: string
  alt: string
  width: number
  height: number
  kind: 'photo' | 'diagram' | 'cover'
  source: 'real' | 'preset'
  /** F-08：多分辨率候选，形如 '/images/a-640.avif 640w, /images/a-1280.avif 1280w' */
  srcSet?: string
  /** F-08：配合 srcSet 的布局宽度提示，形如 '(max-width: 640px) 100vw, 480px' */
  sizes?: string
  /** 图片来源说明，用于 alt 之外的补充标注 */
  note?: string
}

/**
 * 空清单 = 全站走 Plate 图形兜底。登记后立刻切换成真实图片。
 *
 * F-08 现状：仓库里还没有本人真实照片，所以这里保持为空 —— 不用示意图冒充。
 * 补齐时需要：public/images/<label>-{640,1280}.{avif,webp} + 一份 LQIP 占位色；
 * 每张登记后务必填 alt / width / height / srcSet / sizes，避免布局抖动。
 */
export const mediaCatalog: Record<string, MediaAsset> = {}

/** 前台/后台统一使用的「待接入」说明，避免各处自己写一遍 */
export const mediaNotice = '真实照片尚未接入：将照片放进 public/images/ 并在 data/media.ts 登记后自动生效'

export function lookupMedia(label?: string): MediaAsset | null {
  if (!label) return null
  return mediaCatalog[label] ?? null
}

/** 供后台 FilesAdminPage 展示「还差哪些图」 */
export const missingMediaLabels = (labels: string[]) => labels.filter((l) => !mediaCatalog[l])
