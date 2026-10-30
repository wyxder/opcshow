import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { type MediaAsset } from '@/data/media'

/**
 * 图片渲染统一入口（fx.md F1 / P4）。
 *
 * 规则：
 *   · 有登记的真实图片 → 走 <img loading="lazy" decoding="async" width height>，不抖布局；
 *   · 没有图片 / 图片加载失败 → 回落调用方给的兜底视觉（一般是 Plate 图形），不出现破图；
 *   · 预置示意图必须带角标，不能长得像真实照片。
 */
export function SmartImage({
  asset,
  fallback,
  className,
  imgClassName,
  eager = false,
}: {
  asset: MediaAsset | null
  fallback: ReactNode
  className?: string
  imgClassName?: string
  /** LCP 图（首屏那一张）用 eager 不排队，其它一律懒加载 */
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)

  if (!asset || failed) {
    return <>{fallback}</>
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <img
        src={asset.src}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailed(true)}
        className={cn('h-full w-full object-cover', imgClassName)}
      />
      {asset.source === 'preset' && (
        <span className="absolute right-1.5 top-1.5 rounded border border-ink/20 bg-cream/90 px-1.5 py-0.5 font-mono text-[9px] text-ink/60">
          示意配图
        </span>
      )}
    </div>
  )
}
