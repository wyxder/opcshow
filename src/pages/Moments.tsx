import { AnimatePresence, motion } from 'framer-motion'
import { Camera, ExternalLink, Heart, ImageOff, MapPin, MessageCircle, Play, Send, Share2, Sparkles, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { PageHead } from '@/components/ui/primitives'
import { SmartImage } from '@/components/SmartImage'
import { useToast } from '@/components/ui/Toast'
import { moments as seedMoments, type Moment } from '@/data/life'
import { lookupMedia } from '@/data/media'
import { cn, readableInk, useLocalStorage } from '@/lib/utils'
import { STORAGE_KEYS, isRecordOf, isStringArray } from '@/lib/storage'
import { useSeo } from '@/lib/seo'
import { serverConfig } from '@/services/config'
import { contents } from '@/services/content'

const isCommentRecord = isRecordOf<string[]>((v) => isStringArray(v))

/** 后台发布的图文 / 视频资源以 URL（http(s) 或站内 / 路径）形式写入；预置数据仍是资源 label。
 *  后台脏数据里 label 可能缺失，先挡一道，避免 s.startsWith 抛错。 */
const isUrl = (s: unknown): s is string => typeof s === 'string' && (/^https?:\/\//i.test(s) || s.startsWith('/'))
const asText = (v: unknown, fallback = '') => (typeof v === 'string' && v.trim() ? v.trim() : fallback)
const MEDIA_KINDS = ['photo', 'note', 'code', 'video'] as const
type MediaItem = Moment['media'][number]

/** 视频直链（mp4 / webm / mov…）可直接 <video> 播放；其余按「视频页链接」渲染成可点卡片 */
const isPlayableVideo = (url: string) =>
  /\.(mp4|webm|ogg|ogv|mov|m4v)(?:[?#]|$)/i.test(url) || url.startsWith('data:video/') || url.startsWith('blob:')

/** 占位卡上只显示文件名，避免把一长串 URL 铺在动态里 */
function shortLabel(label: string) {
  const clean = label.split(/[?#]/)[0]
  const name = clean.split('/').pop() || clean
  return name.length > 30 ? `${name.slice(0, 27)}…` : name
}

/** 服务端返回的 media 字段形状不受控（可能是字符串、null、缺 label / kind），统一规整 */
function normalizeMedia(raw: unknown): MediaItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .filter((x) => typeof x.label === 'string' && x.label.trim())
    .map((x) => ({
      label: (x.label as string).trim(),
      kind: (MEDIA_KINDS as readonly unknown[]).includes(x.kind) ? (x.kind as MediaItem['kind']) : 'photo',
      ...(typeof x.poster === 'string' && x.poster.trim() ? { poster: x.poster.trim() } : {}),
      ...(typeof x.caption === 'string' && x.caption.trim() ? { caption: x.caption.trim() } : {}),
    }))
}

/** 服务端返回的动态字段不完整（没有 time / tags / comments / accent），统一规整成前端 Moment 形状，避免渲染崩溃 */
type RawMoment = {
  id?: string
  time?: unknown
  date?: unknown
  text?: unknown
  place?: unknown
  likes?: unknown
  comments?: unknown
  accent?: unknown
  media?: unknown
  tags?: unknown
  tag?: unknown
  status?: unknown
}

/** RawMoment 字段全可选，所以预置的 Moment 也能直接传进来做二次规整 */
function normalizeMoment(m: RawMoment): Moment {
  const tags = Array.isArray(m.tags) ? m.tags.filter((t): t is string => typeof t === 'string' && !!t.trim()) : []
  const comments = Array.isArray(m.comments)
    ? m.comments.filter(
        (c): c is { user: string; text: string } =>
          !!c && typeof c === 'object' && typeof (c as { user?: unknown }).user === 'string' && typeof (c as { text?: unknown }).text === 'string',
      )
    : []
  return {
    id: asText(m.id, 'moment-untitled'),
    time: asText(m.time) || asText(m.date),
    text: asText(m.text),
    place: asText(m.place) || undefined,
    likes: typeof m.likes === 'number' && Number.isFinite(m.likes) ? m.likes : 0,
    comments,
    accent: asText(m.accent, 'rgb(var(--c-lime))'),
    media: normalizeMedia(m.media),
    tags: tags.length ? tags : [asText(m.tag, '生活')],
    status: asText(m.status) || undefined,
  }
}

export default function Moments() {
  const [liked, setLiked] = useLocalStorage<string[]>(STORAGE_KEYS.momentsLiked, [], isStringArray)
  const [comments, setComments] = useLocalStorage<Record<string, { user: string; text: string }[]>>(
    STORAGE_KEYS.momentsComments,
    {},
    isCommentRecord as never,
  )
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({})
  const [openComment, setOpenComment] = useState<string | null>(null)
  const [serverMoments, setServerMoments] = useState<Moment[]>([])
  const [preview, setPreview] = useState<{ src: string; caption?: string } | null>(null)
  const { show, node } = useToast()

  useSeo({
    title: '朋友圈 · 晓叶',
    description: '项目的坑、比赛的现场、路上的风景，还有那些不适合放进简历的废话。',
    path: '/life/moments',
  })

  // 接服务端时，把后台发布的动态（含图文 / 视频）并入朋友圈流；公开接口只回 published。
  // 发布入口已统一收口到后台「内容管理 → 动态」，前台不再放发布框。
  useEffect(() => {
    if (!serverConfig.enabled) return
    let alive = true
    contents
      .list('moments')
      .then((list) => {
        if (!alive) return
        setServerMoments((list as unknown as RawMoment[]).filter((m) => m.status === 'published').map(normalizeMoment))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // 渲染前再规整一遍：服务端返回、预置数据、以及浏览器缓存里残留的旧形状都补齐字段。
  // 后台发布的动态没有 accent / comments / tags，直接读会让 readableInk(undefined) 抛错，
  // 把整个朋友圈打成错误卡片；这里保证每一条进渲染的都是完整 Moment。
  // 服务端已存了预置动态时按 id 去重（后台版本优先），避免 AnimatePresence 重复 key。
  const feed = [...serverMoments, ...seedMoments]
    .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
    .map(normalizeMoment)
  const hotTags = ['深夜 coding', '黑客松', 'debug 日常', '骑行', '开源', '分享']
  /** 站内登记的真实图片 / 后台发布的 URL 资源都算「有配图」 */
  const withPhoto = feed.filter((m) => m.media.some((x) => isUrl(x.label) || lookupMedia(x.label))).length

  const share = async () => {
    const url = location.href
    try {
      await navigator.clipboard.writeText(url)
      show('链接已复制到剪贴板')
    } catch {
      // 非安全上下文 / 权限被拒：选中文本栏而不是报错
      show(`复制这个地址：${url}`)
    }
  }

  // 图片灯箱：Esc / 点击背景关闭
  useEffect(() => {
    if (!preview) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPreview(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [preview])

  const addComment = (id: string) => {
    const text = commentDraft[id]?.trim()
    if (!text) return
    setComments((c) => ({ ...c, [id]: [...(c[id] ?? []), { user: '你', text }] }))
    setCommentDraft((d) => ({ ...d, [id]: '' }))
  }

  return (
    <div className="shell">
      <PageHead
        kicker="04 / LIFE · MOMENTS"
        title="碎碎念与深夜复盘"
        right={
          <div className="flex items-center gap-2 font-mono text-[9px] text-ink/40">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-coral" />
            {serverConfig.enabled ? 'LIVE' : '本机'} · {feed.length} 条 · {withPhoto} 条有真实配图
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* 资料卡：从右侧移到左侧，桌面端常驻贴顶 */}
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border-1.5 border-ink bg-cream">
            {/* 封面是定位元素，默认会盖住后面 -mt-6 的头像；显式压到下层 */}
            <div className="relative z-0 h-24 bg-gradient-to-br from-lime via-sky to-rose">
              <div className="absolute inset-0 halftone opacity-20" />
            </div>
            <div className="relative z-10 px-4 pb-4">
              <div className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full border-1.5 border-ink bg-cream font-display text-lg font-extrabold">魏</div>
              <p className="mt-1.5 text-[13px] font-bold">晓叶</p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink/45">白天写 Agent，晚上剪视频。朋友圈是我的公开笔记本。</p>
              <div className="mt-3 grid grid-cols-3 gap-1 border-t border-dashed border-ink/15 pt-3 text-center">
                {[
                  ['动态', feed.length],
                  ['照片', '2,403'],
                  ['好友', '86'],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <p className="font-display text-[14px] font-extrabold">{v}</p>
                    <p className="font-mono text-[9.5px] text-ink/35">{k}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-1.5 border-ink bg-cream p-4">
            <p className="font-mono text-[9px] tracking-[0.16em] text-ink/35">HOT TAGS</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {hotTags.map((t) => (
                <span key={t} className="rounded-full border border-ink/15 bg-paper px-2 py-0.5 text-[10px] text-ink/55">
                  # {t}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border-1.5 border-ink bg-ink p-4 text-paper">
            <p className="font-mono text-[9px] tracking-[0.16em] text-lime">VISITORS</p>
            <div className="mt-2.5 flex -space-x-2">
              {['羊', '陈', '哲', 'L', 'K'].map((v, i) => (
                <div
                  key={v}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-1.5 border-ink text-[10px] font-bold text-ink"
                  style={{ background: ['rgb(var(--c-rose))', 'rgb(var(--c-sky))', 'rgb(var(--c-lime))', 'rgb(var(--c-surface-2))', 'rgb(var(--c-grape))'][i] }}
                >
                  {v}
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-paper/50">最近来过的朋友。留言墙那边也能看到他们。</p>
          </div>
        </aside>

        <div>
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {feed.map((m, i) => {
                const isLiked = liked.includes(m.id)
                const allComments = [...(Array.isArray(m.comments) ? m.comments : []), ...(comments[m.id] ?? [])]
                return (
                  <motion.article
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="relative overflow-hidden rounded-2xl border-1.5 border-ink bg-cream p-4 sm:p-5"
                  >
                    <span className="absolute right-3 top-3 font-display text-[30px] font-extrabold leading-none text-ink/[0.06]">
                      {String(feed.length - i).padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border-1.5 border-ink font-display text-[13px] font-extrabold" style={{ background: m.accent, color: readableInk(m.accent) }}>
                        魏
                      </div>
                      <div className="leading-tight">
                        <p className="text-[12.5px] font-bold">晓叶</p>
                        <p className="flex items-center gap-1.5 font-mono text-[9px] text-ink/40">
                          {m.time}
                          {m.place && (
                            <>
                              <span className="h-0.5 w-0.5 rounded-full bg-ink/30" />
                              <MapPin size={8} /> {m.place}
                            </>
                          )}
                        </p>
                      </div>
                      <span className="ml-auto mr-8 rounded-full border border-ink/15 px-2 py-0.5 font-mono text-[9.5px] text-ink/40">
                        {m.tags[0]}
                      </span>
                    </div>

                    <p className="mt-3 whitespace-pre-line text-[13px] leading-[1.85] text-ink/80">{m.text}</p>

                    {m.media.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.media.map((md, k) => (
                          <div
                            key={`${md.label}-${k}`}
                            className="relative h-[124px] w-[calc(50%-4px)] max-w-[168px] overflow-hidden rounded-xl border border-ink/15 bg-paper sm:w-[168px]"
                          >
                            <MomentMedia
                              md={md}
                              accent={m.accent}
                              onPreview={isUrl(md.label) && md.kind !== 'video' ? () => setPreview({ src: md.label, caption: md.caption }) : undefined}
                            />
                            {!isUrl(md.label) && (
                              <span className="absolute left-2 top-2 rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[8.5px] text-paper/80">
                                {md.kind === 'photo' ? '配图待传' : md.kind === 'video' ? '视频待传' : md.kind}
                              </span>
                            )}
                            {md.caption && isUrl(md.label) && (
                              <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink/70 to-transparent px-2 pb-1 pt-3 font-mono text-[9px] text-paper/90">
                                {md.caption}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-4 border-t border-dashed border-ink/12 pt-2.5">
                      <button
                        onClick={() => setLiked((l) => (l.includes(m.id) ? l.filter((x) => x !== m.id) : [...l, m.id]))}
                        className={cn('flex items-center gap-1.5 text-[10.5px] transition', isLiked ? 'text-coral' : 'text-ink/40 hover:text-ink')}
                      >
                        <Heart size={13} className={isLiked ? 'fill-coral' : ''} /> {m.likes + (isLiked ? 1 : 0)}
                      </button>
                      <button
                        onClick={() => setOpenComment(openComment === m.id ? null : m.id)}
                        className="flex items-center gap-1.5 text-[10.5px] text-ink/40 transition hover:text-ink"
                      >
                        <MessageCircle size={13} /> {allComments.length || '评论'}
                      </button>
                      <button onClick={share} className="ml-auto text-ink/30 transition hover:text-ink" aria-label="复制本页链接">
                        <Share2 size={13} />
                      </button>
                    </div>

                    {allComments.length > 0 && (
                      <div className="mt-2.5 space-y-1 rounded-xl bg-paper px-3 py-2">
                        {allComments.map((c, k) => (
                          <p key={k} className="text-[11px] leading-relaxed">
                            <span className={cn('font-semibold', c.user === '你' ? 'text-blue' : 'text-ink/70')}>{c.user}</span>
                            <span className="text-ink/30">：</span>
                            <span className="text-ink/60">{c.text}</span>
                          </p>
                        ))}
                      </div>
                    )}

                    <AnimatePresence>
                      {openComment === m.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              value={commentDraft[m.id] ?? ''}
                              onChange={(e) => setCommentDraft((d) => ({ ...d, [m.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && addComment(m.id)}
                              placeholder="说点什么…"
                              className="flex-1 rounded-lg border border-ink/15 bg-paper px-2.5 py-1.5 text-[11px] outline-none focus:border-ink"
                            />
                            <button onClick={() => addComment(m.id)} className="rounded-lg border-1.5 border-ink bg-lime px-2.5 py-1.5" aria-label="发送评论">
                              <Send size={11} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
            className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/85 p-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="图片预览"
          >
            <button className="absolute right-5 top-5 rounded-full border border-paper/30 p-2 text-paper/80 transition hover:bg-paper/10" aria-label="关闭预览" onClick={() => setPreview(null)}>
              <X size={18} />
            </button>
            <img
              src={preview.src}
              alt={preview.caption || '动态配图'}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[86vh] max-w-full rounded-xl border border-paper/20 object-contain shadow-2xl"
            />
            {preview.caption && <p className="absolute bottom-6 rounded-full bg-ink/70 px-3 py-1 text-[11px] text-paper/80">{preview.caption}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {node}
    </div>
  )
}

/**
 * 媒体加载失败时的占位卡：同色系渐变 + 文件名 + 简短说明，绝不显示浏览器破图 alt 文本或纯黑块。
 * 有 poster 时以封面作底图（加载失败自动隐藏），有 href 时提供「打开原链接」出口。
 */
function MediaFallback({
  icon,
  label,
  hint,
  accent,
  href,
  poster,
}: {
  icon: ReactNode
  label: string
  hint: string
  accent: string
  href?: string
  poster?: string
}) {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden px-2 text-center"
      style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 38%, transparent), rgb(var(--c-surface)) 78%)` }}
    >
      {poster && (
        <img
          src={poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
      <div className="absolute inset-0 halftone opacity-25" />
      <div className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-ink/15 bg-cream/85 text-ink/60">{icon}</div>
      <span className="relative max-w-full truncate font-mono text-[9.5px] font-semibold text-ink/70">{label}</span>
      <span className="relative font-mono text-[8.5px] text-ink/45">{hint}</span>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="relative mt-0.5 inline-flex items-center gap-0.5 rounded-full border border-ink/20 bg-cream/80 px-1.5 py-0.5 font-mono text-[8.5px] text-ink/60 transition hover:bg-lime"
        >
          打开 <ExternalLink size={8} />
        </a>
      )}
    </div>
  )
}

/**
 * 动态媒体渲染：
 * - 后台发布的 URL 图片 → <img>，失败回落到占位卡；点击可放大预览
 * - 后台发布的视频直链（mp4/webm/mov…）→ <video controls poster>，失败回落到带封面的链接卡
 * - 后台发布的「视频页地址」（B 站 / 小红书等）→ 直接渲染成可点开的视频卡片，不再塞进 <video> 变黑块
 * - 预置数据的 label → SmartImage + 同色系图形兜底
 */
function MomentMedia({ md, accent, onPreview }: { md: MediaItem; accent: string; onPreview?: () => void }) {
  const [failed, setFailed] = useState(false)
  const url = isUrl(md.label)
  const label = shortLabel(md.label)

  if (!url) {
    const asset = lookupMedia(md.label)
    return (
      <SmartImage
        asset={asset}
        className="h-full w-full"
        fallback={
          <div
            className="relative flex h-full w-full items-end overflow-hidden"
            style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 33%, transparent), rgb(var(--c-surface)) 70%)` }}
          >
            <div className="absolute inset-0 halftone opacity-30" />
            <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border border-ink/20 bg-cream/80">
              {md.kind === 'photo' ? <Camera size={11} /> : <Sparkles size={11} />}
            </div>
            <span className="relative m-2 rounded border border-ink/15 bg-cream/90 px-1.5 py-0.5 font-mono text-[9.5px] text-ink/55">{md.label}</span>
          </div>
        }
      />
    )
  }

  if (md.kind === 'video') {
    const playable = isPlayableVideo(md.label)
    if (!playable || failed) {
      return (
        <MediaFallback
          icon={<Play size={13} className="ml-0.5" />}
          label={label}
          hint={failed ? '视频暂时无法播放' : '点击打开视频'}
          accent={accent}
          href={md.label}
          poster={isUrl(md.poster) ? md.poster : undefined}
        />
      )
    }
    return (
      <video
        src={md.label}
        poster={isUrl(md.poster) ? md.poster : undefined}
        controls
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
        style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 28%, transparent), rgb(var(--c-ink)) 90%)` }}
      />
    )
  }

  if (failed) {
    return (
      <MediaFallback
        icon={<ImageOff size={13} />}
        label={label}
        hint="图片暂时无法加载"
        accent={accent}
        href={md.label}
      />
    )
  }

  return (
    <img
      src={md.label}
      alt={md.caption || `动态配图 ${label}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      onClick={onPreview}
      className={cn('h-full w-full object-cover', onPreview && 'cursor-zoom-in transition duration-300 hover:scale-[1.04]')}
    />
  )
}
