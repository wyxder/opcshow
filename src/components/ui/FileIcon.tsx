/**
 * FileIcon —— 按扩展名自动映射的文件图标（资源中心 / 后台共用）。
 *
 * 统一「文档轮廓 + 折角 + 墨色描边」的扁平风格（Paper Brutal），
 * 颜色与内部图形按类型差异化：docx / pdf / zip / fig / pptx / py /
 * csv / xlsx / md / 安装包 / 图片 / 文本 各不相同。
 * 未知扩展名回退为通用文件 + 扩展名文字，绝不伪装成其它类型。
 */

type GlyphKind =
  | 'word'
  | 'pdf'
  | 'archive'
  | 'fig'
  | 'slides'
  | 'code'
  | 'sheet'
  | 'markdown'
  | 'install'
  | 'text'
  | 'image'
  | 'generic'

const EXT_MAP: Record<string, { color: string; glyph: GlyphKind }> = {
  doc: { color: 'rgb(var(--c-blue))', glyph: 'word' },
  docx: { color: 'rgb(var(--c-blue))', glyph: 'word' },
  pdf: { color: 'rgb(var(--c-coral))', glyph: 'pdf' },
  zip: { color: 'rgb(var(--c-grape))', glyph: 'archive' },
  rar: { color: 'rgb(var(--c-grape))', glyph: 'archive' },
  '7z': { color: 'rgb(var(--c-grape))', glyph: 'archive' },
  tar: { color: 'rgb(var(--c-grape))', glyph: 'archive' },
  gz: { color: 'rgb(var(--c-grape))', glyph: 'archive' },
  fig: { color: 'rgb(var(--c-rose))', glyph: 'fig' },
  ppt: { color: 'rgb(var(--c-amber))', glyph: 'slides' },
  pptx: { color: 'rgb(var(--c-amber))', glyph: 'slides' },
  key: { color: 'rgb(var(--c-amber))', glyph: 'slides' },
  py: { color: 'rgb(var(--c-lime))', glyph: 'code' },
  js: { color: 'rgb(var(--c-sky))', glyph: 'code' },
  jsx: { color: 'rgb(var(--c-sky))', glyph: 'code' },
  ts: { color: 'rgb(var(--c-sky))', glyph: 'code' },
  tsx: { color: 'rgb(var(--c-sky))', glyph: 'code' },
  sh: { color: 'rgb(var(--c-sky))', glyph: 'code' },
  json: { color: 'rgb(var(--c-sky))', glyph: 'code' },
  csv: { color: 'rgb(var(--c-teal))', glyph: 'sheet' },
  xls: { color: 'rgb(var(--c-teal))', glyph: 'sheet' },
  xlsx: { color: 'rgb(var(--c-teal))', glyph: 'sheet' },
  md: { color: 'rgb(var(--c-blue))', glyph: 'markdown' },
  markdown: { color: 'rgb(var(--c-blue))', glyph: 'markdown' },
  exe: { color: 'rgb(var(--c-sky))', glyph: 'install' },
  msi: { color: 'rgb(var(--c-sky))', glyph: 'install' },
  dmg: { color: 'rgb(var(--c-sky))', glyph: 'install' },
  apk: { color: 'rgb(var(--c-sky))', glyph: 'install' },
  txt: { color: 'rgb(var(--c-surface-2))', glyph: 'text' },
  png: { color: 'rgb(var(--c-rose))', glyph: 'image' },
  jpg: { color: 'rgb(var(--c-rose))', glyph: 'image' },
  jpeg: { color: 'rgb(var(--c-rose))', glyph: 'image' },
  gif: { color: 'rgb(var(--c-rose))', glyph: 'image' },
  webp: { color: 'rgb(var(--c-rose))', glyph: 'image' },
  svg: { color: 'rgb(var(--c-rose))', glyph: 'image' },
  html: { color: 'rgb(var(--c-coral))', glyph: 'code' },
  htm: { color: 'rgb(var(--c-coral))', glyph: 'code' },
}

const norm = (ext: string) => ext.replace(/^\./, '').toLowerCase()

/** 列表色条 / 徽标复用：与图标同源的扩展名主色 */
export function fileExtColor(ext: string): string {
  return EXT_MAP[norm(ext)]?.color ?? 'rgb(var(--c-surface-2))'
}

/** 扩展名归属的图形族，供调用方做额外区分（如回收站、待上传态） */
export function fileExtGlyph(ext: string): GlyphKind {
  return EXT_MAP[norm(ext)]?.glyph ?? 'generic'
}

function Glyph({ kind, ext }: { kind: GlyphKind; ext: string }) {
  const stroke = { stroke: '#fff', strokeWidth: 2.6, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  switch (kind) {
    case 'word':
      return <polyline points="15,25 19,39 24,29 29,39 33,25" {...stroke} />
    case 'pdf':
      return (
        <text x="24" y="36" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#fff" fontFamily="inherit">
          PDF
        </text>
      )
    case 'archive':
      return (
        <g>
          <rect x="13" y="24" width="22" height="4" fill="#fff" />
          <rect x="20" y="28" width="8" height="9" rx="1" {...stroke} strokeWidth={2.2} />
        </g>
      )
    case 'fig':
      return (
        <g>
          <path d="M18 27v11M18 38a5 5 0 1 0 5-5h-5Zm11-11H18" {...stroke} strokeWidth={2.2} />
          <circle cx="29" cy="27" r="4.5" {...stroke} strokeWidth={2.2} />
        </g>
      )
    case 'slides':
      return (
        <g fill="#fff">
          <rect x="15" y="33" width="4.5" height="6" rx="1" />
          <rect x="22" y="27" width="4.5" height="12" rx="1" />
          <rect x="29" y="23" width="4.5" height="16" rx="1" />
        </g>
      )
    case 'code':
      return (
        <g>
          <polyline points="20,25 14,32 20,39" {...stroke} />
          <polyline points="28,25 34,32 28,39" {...stroke} />
        </g>
      )
    case 'sheet':
      return (
        <g>
          <rect x="14" y="24" width="20" height="15" rx="1.5" {...stroke} strokeWidth={2.2} />
          <path d="M14 29.5h20M14 34.5h20M21 24v15M28 24v15" stroke="#fff" strokeWidth={1.6} fill="none" />
        </g>
      )
    case 'markdown':
      return (
        <g>
          <path d="M13 38V26l5.5 6 5.5-6v12" {...stroke} strokeWidth={2.4} />
          <path d="M31 25v9m0 0 3-3.5m-3 3.5-3-3.5" {...stroke} strokeWidth={2.4} />
        </g>
      )
    case 'install':
      return (
        <g>
          <path d="M24 23v11m0 0 4.5-5m-4.5 5-4.5-5" {...stroke} />
          <path d="M14 38.5h20" {...stroke} />
        </g>
      )
    case 'text':
      return <path d="M15 26h18M15 31.5h18M15 37h12" {...stroke} strokeWidth={2.2} />
    case 'image':
      return (
        <g>
          <circle cx="20" cy="27.5" r="2.6" fill="#fff" />
          <path d="M14 39l7-7.5 5 5 4-4 4 6.5" {...stroke} strokeWidth={2.2} />
        </g>
      )
    default: {
      const label = norm(ext).slice(0, 4).toUpperCase()
      if (!label) return null
      return (
        <text x="24" y="36" textAnchor="middle" fontSize={label.length > 3 ? 7 : 8.5} fontWeight="800" fill="#fff" fontFamily="inherit">
          {label}
        </text>
      )
    }
  }
}

export default function FileIcon({ ext, size = 40, className }: { ext: string; size?: number; className?: string }) {
  const entry = EXT_MAP[norm(ext)]
  const color = entry?.color ?? 'rgb(var(--c-surface-2))'
  const glyph = entry?.glyph ?? 'generic'
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`${norm(ext).toUpperCase() || '文件'} 图标`}
      style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}
    >
      {/* 文档主体：折角 + 墨色描边，与站内硬边风格一致 */}
      <path
        d="M10 4h18l12 12v26a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        fill={color}
        stroke="rgb(var(--c-ink))"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M28 4l12 12H30a2 2 0 0 1-2-2V4Z" fill="rgb(var(--c-bg))" stroke="rgb(var(--c-ink))" strokeWidth="2.5" strokeLinejoin="round" />
      <Glyph kind={glyph} ext={ext} />
    </svg>
  )
}
