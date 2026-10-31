import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  ImagePlus,
  Images,
  MapPin,
  Star,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Reveal } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/Toast'
import { formatBytes } from '@/lib/image'
import { cn, newId, useMediaQuery } from '@/lib/utils'
import { QuotaFullError } from '@/lib/storage'
import {
  ALBUM_BUDGET,
  ALBUM_TAGS,
  MAX_PHOTOS,
  albumBytes,
  createPhoto,
  loadAlbum,
  saveAlbum,
  sortAlbum,
  type AlbumTag,
  type LovePhoto,
} from '@/services/loveAlbum'

/** 拍立得的小角度倾斜：轮着取，比随机稳定，也不会撞出同一列齐刷刷歪 */
const TILTS = [-1.4, 0.9, -0.7, 1.3, 0.4, -1.1]

type Job = { id: string; name: string; state: 'busy' | 'done' | 'error'; message?: string }

const today = () => new Date().toISOString().slice(0, 10)

const extOf = (src: string) => (src.startsWith('data:image/webp') ? 'webp' : src.startsWith('data:image/png') ? 'png' : 'jpg')

export default function LoveAlbum() {
  const [photos, setPhotos] = useState<LovePhoto[]>(loadAlbum)
  const [jobs, setJobs] = useState<Job[]>([])
  const [dragging, setDragging] = useState(false)
  const [filter, setFilter] = useState<string>('全部')
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [draft, setDraft] = useState({ caption: '', place: '' })
  const [meta, setMeta] = useState<{ tag: AlbumTag; date: string }>({ tag: '合影', date: today() })
  /** 触屏设备没有 hover，卡片上的操作按钮要常驻，不能靠悬停才出现 */
  const hasHover = useMediaQuery('(hover: hover) and (pointer: fine)')
  const { show, node } = useToast()

  const pickRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  /** 异步上传链路里要读最新值，不能闭包住第一次渲染的数组 */
  const photosRef = useRef(photos)
  const metaRef = useRef(meta)
  photosRef.current = photos
  metaRef.current = meta

  const used = albumBytes(photos)
  const usedPct = Math.min(100, Math.round((used / ALBUM_BUDGET) * 100))
  const busy = jobs.filter((j) => j.state === 'busy').length

  /** 落盘成功才更新界面：写失败（配额满）时列表保持原样，不出现「看得见存不住」的假状态 */
  const commit = useCallback(
    (next: LovePhoto[], message?: string) => {
      try {
        saveAlbum(next)
        photosRef.current = next
        setPhotos(next)
        if (message) show(message)
        return true
      } catch (err) {
        show(err instanceof QuotaFullError ? err.message : `保存失败：${(err as Error).message}`, { error: true })
        return false
      }
    },
    [show],
  )

  const handleFiles = useCallback(
    async (incoming: File[]) => {
      const images = incoming.filter((f) => f.type.startsWith('image/'))
      if (images.length < incoming.length) show(`${incoming.length - images.length} 个非图片文件已跳过`, { error: true })
      if (!images.length) return
      const room = MAX_PHOTOS - photosRef.current.length
      if (room <= 0) {
        show(`相册最多 ${MAX_PHOTOS} 张，先删几张再传`, { error: true })
        return
      }
      const batch = images.slice(0, room)
      if (batch.length < images.length) show(`只收下了前 ${room} 张，剩下的等删掉旧照片再传`)
      for (const file of batch) {
        const jobId = newId('job')
        setJobs((list) => [...list, { id: jobId, name: file.name || '剪贴板图片', state: 'busy' }])
        try {
          const photo = await createPhoto(file, { tag: metaRef.current.tag, date: metaRef.current.date })
          if (!commit(sortAlbum([photo, ...photosRef.current]))) {
            setJobs((list) => list.map((j) => (j.id === jobId ? { ...j, state: 'error', message: '保存失败' } : j)))
            continue
          }
          // 当前筛选可能把新照片藏起来，传完就回到「全部」，不让用户对着空墙发懵
          setFilter('全部')
          setJobs((list) => list.map((j) => (j.id === jobId ? { ...j, state: 'done' } : j)))
          window.setTimeout(() => setJobs((list) => list.filter((j) => j.id !== jobId)), 1500)
        } catch (err) {
          setJobs((list) => list.map((j) => (j.id === jobId ? { ...j, state: 'error', message: (err as Error).message } : j)))
          window.setTimeout(() => setJobs((list) => list.filter((j) => j.id !== jobId)), 6000)
        }
      }
    },
    [commit, show],
  )

  // 桌面端 Ctrl/Cmd+V 直接贴图，省掉「先存桌面再选文件」这一步
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? [])
      if (!files.some((f) => f.type.startsWith('image/'))) return
      e.preventDefault()
      void handleFiles(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleFiles])

  const years = useMemo(() => Array.from(new Set(photos.map((p) => p.date.slice(0, 4)))).sort().reverse(), [photos])

  const shown = useMemo(() => {
    const list =
      filter === '全部'
        ? photos
        : filter.endsWith('年')
          ? photos.filter((p) => p.date.startsWith(`${filter.slice(0, 4)}-`))
          : photos.filter((p) => p.tag === filter)
    return sortAlbum(list)
  }, [photos, filter])

  const index = shown.findIndex((p) => p.id === openId)
  const current = index >= 0 ? shown[index] : null

  const open = (p: LovePhoto) => {
    setOpenId(p.id)
    setConfirmDel(null)
    setDraft({ caption: p.caption, place: p.place })
  }

  /** 上一张 / 下一张：到头就绕回去 */
  const go = (delta: number) => {
    if (!shown.length) return
    const at = shown.findIndex((p) => p.id === openId)
    const next = shown[(at + delta + shown.length) % shown.length]
    open(next)
  }

  useEffect(() => {
    if (!openId) return
    const onKey = (e: KeyboardEvent) => {
      // 正在输入说明时，左/右归光标管，不抢去翻照片
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // go 只读 shown / openId，这两个变了重新挂监听
  }, [openId, shown])

  const saveDraft = () => {
    if (!current) return
    const ok = commit(
      photosRef.current.map((p) => (p.id === current.id ? { ...p, caption: draft.caption.trim().slice(0, 60), place: draft.place.trim().slice(0, 20) } : p)),
    )
    if (ok) show('这张的说明更新好了')
  }

  const toggleCover = (id: string) => {
    const was = photosRef.current.find((p) => p.id === id)?.cover
    commit(sortAlbum(photosRef.current.map((p) => ({ ...p, cover: p.id === id ? !was : false }))), was ? '已取消封面' : '已设为封面，置顶显示')
  }

  const remove = (id: string) => {
    const ok = commit(photosRef.current.filter((p) => p.id !== id), '照片已删除')
    if (ok && id === openId) setOpenId(null)
    if (id === openId) setConfirmDel(null)
  }

  return (
    <section className="mb-6" aria-labelledby="album-title">
      <div className="rounded-2xl border-1.5 border-ink bg-cream p-4 sm:p-5">
        {/* 头部：标题 + 计数 + 本机占用 */}
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border-1.5 border-ink bg-rose/60">
              <Images size={17} />
            </span>
            <div>
              <h2 id="album-title" className="text-[15px] font-extrabold leading-none">
                时光相册
              </h2>
              <p className="mt-1 font-mono text-[9px] tracking-[0.16em] text-ink/40">
                MEMORY ALBUM · {photos.length} / {MAX_PHOTOS} 张 · 本机保存
              </p>
            </div>
          </div>
          <div className="min-w-[168px] flex-1 sm:max-w-[240px]">
            <div className="flex items-center justify-between font-mono text-[9px] text-ink/40">
              <span>本机占用</span>
              <span className={cn(usedPct > 85 && 'text-coral')}>
                {formatBytes(used)} / {formatBytes(ALBUM_BUDGET)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
              <div className={cn('h-full rounded-full', usedPct > 85 ? 'bg-coral' : 'bg-lime')} style={{ width: `${Math.max(usedPct, 2)}%` }} />
            </div>
          </div>
        </div>

        {/* 拖拽 / 选择 / 拍照 */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void handleFiles(Array.from(e.dataTransfer.files))
          }}
          className={cn(
            'mt-4 rounded-xl border-1.5 border-dashed px-4 py-5 text-center transition-colors',
            dragging ? 'border-ink bg-lime/40' : 'border-ink/25 bg-paper hover:border-ink/50',
          )}
        >
          <p className="font-mono text-[9px] tracking-[0.18em] text-ink/35">{dragging ? 'DROP IT HERE' : 'UPLOAD PHOTOS'}</p>
          <p className="mt-1.5 text-[13px] font-bold">
            {dragging ? '松手就贴上来' : '把照片拖进来，或者点下面的按钮'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-[11px] leading-relaxed text-ink/45">
            支持 JPG / PNG / WebP · 单张 ≤ 12MB · 自动压缩到长边 1440px · 桌面端还能直接 Ctrl+V 粘贴
          </p>

          {/* 上传前的一次性设置：这批归到哪个标签、算哪天 */}
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5">
            {ALBUM_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => setMeta((m) => ({ ...m, tag: t }))}
                aria-pressed={meta.tag === t}
                className={cn(
                  'rounded-full border-1.5 px-2.5 py-1 text-[10.5px] transition',
                  meta.tag === t ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-cream text-ink/55 hover:border-ink/50',
                )}
              >
                {t}
              </button>
            ))}
            <label className="ml-1 flex items-center gap-1.5 rounded-full border-1.5 border-ink/15 bg-cream px-2.5 py-1 text-[10.5px] text-ink/55">
              <CalendarDays size={11} />
              <input
                type="date"
                value={meta.date}
                max={today()}
                onChange={(e) => setMeta((m) => ({ ...m, date: e.target.value || today() }))}
                className="bg-transparent font-mono text-[10.5px] text-ink/70 outline-none"
                aria-label="这批照片的日期"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button onClick={() => pickRef.current?.click()} disabled={busy > 0} className="btn-ink !py-2 text-[12px] disabled:opacity-40">
              <ImagePlus size={13} /> 选择照片
            </button>
            <button onClick={() => camRef.current?.click()} disabled={busy > 0} className="btn !py-2 text-[12px] disabled:opacity-40">
              <Camera size={13} /> 拍照上传
            </button>
            {busy > 0 && <span className="font-mono text-[10px] text-ink/45">压缩中 {busy} 张…</span>}
          </div>

          <input
            ref={pickRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void handleFiles(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
          {/* capture 只在移动端生效：手机上直接唤起相机，桌面端退化成普通选图 */}
          <input
            ref={camRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void handleFiles(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
        </div>

        {/* 上传队列：逐张反馈成功 / 失败原因 */}
        <AnimatePresence initial={false}>
          {jobs.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              aria-live="polite"
              className="mt-3 space-y-1.5 overflow-hidden"
            >
              {jobs.map((j) => (
                <li
                  key={j.id}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px]',
                    j.state === 'error' ? 'border-coral/50 bg-coral/10 text-coral' : 'border-ink/12 bg-paper text-ink/55',
                  )}
                >
                  <span className="truncate font-mono text-[10px]">{j.name}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px]">
                    {j.state === 'busy' ? '压缩中…' : j.state === 'done' ? '已入册 ✓' : j.message}
                  </span>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        {/* 筛选：标签 + 年份 */}
        {photos.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            {['全部', ...ALBUM_TAGS].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-full border-1.5 px-2.5 py-1 text-[10.5px] transition',
                  filter === f ? 'border-ink bg-lime text-ink' : 'border-ink/15 bg-paper text-ink/45 hover:border-ink/45 hover:text-ink',
                )}
              >
                {f}
                {f !== '全部' && <span className="ml-1 font-mono text-[9px] opacity-55">{countOf(photos, f)}</span>}
              </button>
            ))}
            {years.length > 1 && (
              <>
                <span className="mx-1 h-4 w-px bg-ink/15" aria-hidden />
                {years.map((y) => (
                  <button
                    key={y}
                    onClick={() => setFilter(`${y}年`)}
                    className={cn(
                      'rounded-full border-1.5 px-2.5 py-1 font-mono text-[10.5px] transition',
                      filter === `${y}年` ? 'border-ink bg-lime text-ink' : 'border-ink/15 bg-paper text-ink/45 hover:border-ink/45 hover:text-ink',
                    )}
                  >
                    {y}
                    <span className="ml-1 text-[9px] opacity-55">{countOf(photos, `${y}年`)}</span>
                  </button>
                ))}
              </>
            )}
            <span className="ml-auto font-mono text-[9px] text-ink/35">显示 {shown.length} 张</span>
          </div>
        )}
      </div>

      {/* 照片墙 */}
      {shown.length === 0 ? (
        <div className="mt-4 rounded-2xl border-1.5 border-dashed border-ink/20 bg-cream/50 px-5 py-9 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-1.5 border-ink bg-sky/60">
            <ImagePlus size={19} />
          </span>
          <p className="mt-2.5 text-[13.5px] font-bold">{photos.length ? '这个筛选下还没有照片' : '相册还是空的'}</p>
          <p className="mx-auto mt-1 max-w-sm text-[11.5px] leading-relaxed text-ink/45">
            {photos.length ? '换个标签或年份看看。' : '把第一张合照贴上来 —— 异地 1,100 公里，能贴出来的都算见面。'}
          </p>
          <p className="mt-3 font-hand text-[17px] text-coral">照片只存在这台设备的浏览器里，清缓存会丢。</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i, 8) * 0.04} className="group relative">
              {/* 外层只负责倾斜，内层负责 hover 位移：避免内联 transform 被动画覆盖 */}
              <div className="transition-transform duration-300 group-hover:!rotate-0" style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)` }}>
                <span className="absolute -top-1.5 left-1/2 z-10 h-3 w-12 -translate-x-1/2 rotate-[-2deg] border border-ink/10 bg-sky/60 backdrop-blur-[1px]" aria-hidden />
                <figure className="relative overflow-hidden rounded-xl border-1.5 border-ink bg-cream p-2 shadow-hard-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-hard">
                  <button
                    onClick={() => open(p)}
                    aria-label={`查看照片：${p.caption || '未命名照片'}`}
                    className="relative block w-full overflow-hidden rounded-lg border border-ink/12"
                    style={{ aspectRatio: `${p.width || 4} / ${p.height || 3}` }}
                  >
                    <img
                      src={p.src}
                      alt={p.caption || `${p.date} 的合影`}
                      width={p.width}
                      height={p.height}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    />
                    <span className="absolute inset-0 bg-ink/0 transition-colors duration-300 group-hover:bg-ink/10" />
                    {p.cover && (
                      <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full border border-ink/20 bg-lime px-1.5 py-0.5 font-mono text-[8.5px] text-ink">
                        <Star size={8} className="fill-ink" /> 封面
                      </span>
                    )}
                    <span className="absolute right-1.5 top-1.5 rounded-full border border-ink/15 bg-cream/85 px-1.5 py-0.5 font-mono text-[8.5px] text-ink/55">
                      {p.tag}
                    </span>
                  </button>
                  <figcaption className="flex items-end gap-1.5 px-0.5 pb-0.5 pt-2">
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate font-hand text-[16px] leading-tight', p.caption ? 'text-ink/75' : 'text-ink/30')}>
                        {p.caption || '没写说明'}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 truncate font-mono text-[9px] text-ink/40">
                        {p.date}
                        {p.place && (
                          <>
                            <MapPin size={8} className="shrink-0" /> {p.place}
                          </>
                        )}
                      </p>
                    </div>
                    {/* 快捷操作：触屏没有 hover，所以不靠悬停才显示 */}
                    <div className={cn('flex shrink-0 gap-1 transition-opacity duration-200 focus-within:opacity-100', hasHover && 'opacity-0 group-hover:opacity-100')}>
                      <button
                        onClick={() => toggleCover(p.id)}
                        aria-label={p.cover ? '取消封面' : '设为封面'}
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg border-1.5 border-ink bg-cream/95 transition hover:bg-lime',
                          p.cover && 'bg-lime',
                        )}
                      >
                        <Star size={11} className={p.cover ? 'fill-ink' : ''} />
                      </button>
                      <button
                        onClick={() => (confirmDel === p.id ? remove(p.id) : setConfirmDel(p.id))}
                        aria-label={confirmDel === p.id ? '再点一次确认删除' : '删除这张照片'}
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg border-1.5 border-ink bg-cream/95 transition hover:bg-coral hover:text-cream',
                          confirmDel === p.id && 'bg-coral text-cream',
                        )}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </figcaption>
                </figure>
                {confirmDel === p.id && (
                  <p className="mt-1 text-center font-mono text-[9px] text-coral">再点一次删除这张</p>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      )}

      {/* 大图浏览 */}
      <Modal open={Boolean(current)} onClose={() => setOpenId(null)} bare className="max-w-4xl">
        {current && (
          <div className="p-4 sm:p-6">
            <div className="relative overflow-hidden rounded-xl border-1.5 border-ink bg-sand/60">
              <img
                src={current.src}
                alt={current.caption || `${current.date} 的合影`}
                className="mx-auto max-h-[46vh] w-full object-contain sm:max-h-[56vh]"
              />
              <span className="absolute bottom-2 right-2 rounded-full border border-ink/15 bg-cream/90 px-2 py-0.5 font-mono text-[9.5px] text-ink/55">
                {index + 1} / {shown.length}
              </span>
              {shown.length > 1 && (
                <>
                  <button
                    onClick={() => go(-1)}
                    aria-label="上一张"
                    className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-1.5 border-ink bg-cream/90 transition hover:bg-lime"
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <button
                    onClick={() => go(1)}
                    aria-label="下一张"
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-1.5 border-ink bg-cream/90 transition hover:bg-lime"
                  >
                    <ChevronRight size={17} />
                  </button>
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border-1.5 border-ink px-2.5 py-0.5 font-mono text-[9.5px]">{current.tag}</span>
              <span className="font-mono text-[10.5px] text-ink/45">{current.date}</span>
              {current.place && (
                <span className="flex items-center gap-1 font-mono text-[10.5px] text-ink/45">
                  <MapPin size={10} /> {current.place}
                </span>
              )}
              <span className="ml-auto font-mono text-[9.5px] text-ink/35">
                {current.width}×{current.height} · {formatBytes(current.bytes)} · {current.source === 'local' ? '本机' : '服务端'}
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px]">
              <input
                value={draft.caption}
                onChange={(e) => setDraft((d) => ({ ...d, caption: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && saveDraft()}
                maxLength={60}
                placeholder="给这张写一句说明…（60 字以内）"
                className="rounded-xl border border-ink/15 bg-paper px-3 py-2 text-[12.5px] outline-none placeholder:text-ink/35 focus:border-ink"
                aria-label="照片说明"
              />
              <input
                value={draft.place}
                onChange={(e) => setDraft((d) => ({ ...d, place: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && saveDraft()}
                maxLength={20}
                placeholder="地点（选填）"
                className="rounded-xl border border-ink/15 bg-paper px-3 py-2 text-[12.5px] outline-none placeholder:text-ink/35 focus:border-ink"
                aria-label="照片地点"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-ink/15 pt-3">
              <button onClick={saveDraft} className="btn-ink !py-1.5 text-[11.5px]">
                保存说明
              </button>
              <button onClick={() => toggleCover(current.id)} className="btn !py-1.5 text-[11.5px]">
                <Star size={12} className={current.cover ? 'fill-ink' : ''} /> {current.cover ? '取消封面' : '设为封面'}
              </button>
              <a
                href={current.src}
                download={`love-${current.date}-${index + 1}.${extOf(current.src)}`}
                className="btn !py-1.5 text-[11.5px]"
              >
                <Download size={12} /> 存回本机
              </a>
              <button
                onClick={() => (confirmDel === current.id ? remove(current.id) : setConfirmDel(current.id))}
                className={cn('btn ml-auto !py-1.5 text-[11.5px]', confirmDel === current.id && 'border-coral bg-coral text-cream')}
              >
                <Trash2 size={12} /> {confirmDel === current.id ? '确认删除' : '删除'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {node}
    </section>
  )
}

function countOf(list: LovePhoto[], filter: string) {
  if (filter.endsWith('年')) return list.filter((p) => p.date.startsWith(`${filter.slice(0, 4)}-`)).length
  return list.filter((p) => p.tag === filter).length
}
