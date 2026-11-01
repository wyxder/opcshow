import { Download, FolderOpen, LayoutGrid, List, Lock, Search, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FileIcon from '@/components/ui/FileIcon'
import { PageHead } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/Toast'
import { resourceFiles, type ResourceFile } from '@/data/work'
import { cn, useLocalStorage } from '@/lib/utils'
import { STORAGE_KEYS, isStringArray } from '@/lib/storage'
import { useSeo } from '@/lib/seo'
import { resolveDownload, listFiles } from '@/services/files'
import { serverConfig } from '@/services/config'

const categories = ['全部', '简历与作品集', '课程与讲义', '数据集', '模板', '源码'] as const

/** 下载入口：有真实文件给 <a download>，没有就诚实标「待上传」而不是演一个进度 */
function DownloadLink({ f, row }: { f: ResourceFile; row?: boolean }) {
  const state = resolveDownload(f)
  if (state.ok) {
    return (
      <a
        href={state.href}
        download={f.name}
        className={cn(
          'flex shrink-0 items-center gap-1 rounded-full border border-ink/20 bg-paper transition hover:border-ink hover:bg-lime',
          row ? 'px-2 py-0.5 text-[9px]' : 'px-1.5 py-0.5 text-[9px] sm:px-2 sm:py-1 sm:text-[9.5px]',
        )}
        title={`下载 ${f.name}（${f.size}）`}
      >
        <Download size={10} /> 下载
      </a>
    )
  }
  return (
    <span
      className={cn(
        'flex cursor-not-allowed shrink-0 items-center gap-1 rounded-full border border-dashed border-ink/25 px-1.5 py-0.5 text-[9px] text-ink/35 sm:px-2 sm:py-1 sm:text-[9.5px]',
        row && 'px-2 py-0.5 text-[9px]',
      )}
      title={f.pending ?? '文件待上传'}
    >
      <Lock size={10} /> 待上传
    </span>
  )
}

export default function Files() {
  const [cat, setCat] = useState<string>('全部')
  const [q, setQ] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sort, setSort] = useState<'new' | 'hot' | 'name'>('new')
  const [stars, setStars] = useLocalStorage<string[]>(STORAGE_KEYS.fileStars, ['f1', 'f4'], isStringArray)
  const { node } = useToast()

  // FE-07：服务端公开文件合并进资源中心，角标标明来源
  const [serverFiles, setServerFiles] = useState<ResourceFile[]>([])
  useEffect(() => {
    if (!serverConfig.enabled) return
    let alive = true
    listFiles('public').then((list) => {
      if (!alive) return
      // 保留真实扩展名与分类：图标由 FileIcon 自动映射，未知类型也不伪装成 md
      setServerFiles(
        list
          .filter((f) => f.url)
          .map((f) => ({
            id: f.id,
            name: f.name,
            ext: (f.ext || '').toLowerCase(),
            size: f.size,
            date: f.date,
            category: f.category || '未分类',
            desc: '服务端公开文件',
            downloads: f.downloads,
            url: f.url,
          })),
      )
    })
    return () => {
      alive = false
    }
  }, [])

  const allFiles = useMemo(() => [...serverFiles, ...resourceFiles], [serverFiles])
  const downloadable = allFiles.filter((f) => f.url).length
  const online = downloadable

  useSeo({
    title: '资源中心 · 晓叶',
    description: `简历、课件、数据集、模板和源码。${downloadable} 个文件可直接下载，其余标注待上传原因。`,
    path: '/work/files',
  })

  const list = useMemo(() => {
    const key = q.trim().toLowerCase()
    const filtered = allFiles.filter((f) => {
      const cOk = cat === '全部' || f.category === cat
      const qOk = !key || (f.name + f.desc + f.category).toLowerCase().includes(key)
      return cOk && qOk
    })
    return [...filtered].sort((a, b) => {
      if (sort === 'hot') return b.downloads - a.downloads
      if (sort === 'name') return a.name.localeCompare(b.name, 'zh')
      return b.date.localeCompare(a.date)
    })
  }, [allFiles, cat, q, sort])

  const toggleStar = (id: string) => setStars((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <div className="shell">
      <PageHead
        kicker="03 / WORK · RESOURCES"
        title="文件资源中心"
        right={
          <span className="font-mono text-[9.5px] text-ink/45">
            {allFiles.length} 个文件 · {online} 可下载 · 已收藏 {stars.length}
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                'rounded-full border-1.5 px-3 py-1.5 text-[11px] transition',
                cat === c ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-cream text-ink/55 hover:border-ink/50',
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border-1.5 border-ink/15 bg-cream px-3 py-1.5 focus-within:border-ink">
            <Search size={12} className="text-ink/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索文件名"
              className="w-32 bg-transparent text-[11px] outline-none placeholder:text-ink/35"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-full border-1.5 border-ink/15 bg-cream px-2.5 py-1.5 font-mono text-[10px] text-ink/60 outline-none"
          >
            <option value="new">最新</option>
            <option value="hot">最热</option>
            <option value="name">名称</option>
          </select>
          <div className="flex overflow-hidden rounded-full border-1.5 border-ink/15">
            {[
              ['grid', LayoutGrid],
              ['list', List],
            ].map(([k, Icon]) => {
              const I = Icon as typeof LayoutGrid
              return (
                <button
                  key={k as string}
                  onClick={() => setView(k as 'grid' | 'list')}
                  className={cn('px-2.5 py-1.5 transition', view === k ? 'bg-ink text-paper' : 'bg-cream text-ink/45')}
                  aria-label={k as string}
                >
                  <I size={12} />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="flex h-52 flex-col items-center justify-center rounded-2xl border-1.5 border-dashed border-ink/25">
          <FolderOpen size={24} className="text-ink/20" />
          <p className="mt-2 font-hand text-2xl text-ink/40">没有匹配的文件。</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
          {list.map((f) => (
            <div key={f.id} className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-1.5 border-ink bg-cream transition-all duration-300 hover:-translate-y-1 hover:shadow-hard">
              <div className="flex items-start gap-2 p-2.5 sm:gap-3 sm:p-4">
                <FileIcon ext={f.ext} size={34} className="shrink-0 transition-transform duration-300 group-hover:-rotate-3 sm:size-[42px]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="line-clamp-3 text-[11px] font-bold leading-snug sm:line-clamp-none sm:text-[12.5px]">{f.name}</h3>
                    <button onClick={() => toggleStar(f.id)} aria-label="收藏文件" className="shrink-0 p-0.5">
                      <Star size={13} className={cn(stars.includes(f.id) ? 'fill-ink text-ink' : 'text-ink/20 hover:text-ink/50')} />
                    </button>
                  </div>
                  <p className="mt-0.5 font-mono text-[8px] leading-snug text-ink/35 sm:text-[9px]">
                    {f.ext.toUpperCase()} · {f.size} · {f.date}
                  </p>
                </div>
              </div>
              <p className="mb-2 line-clamp-2 px-2.5 text-[10px] leading-relaxed text-ink/50 sm:mb-0 sm:px-4 sm:text-[11px]">{f.desc}</p>
              {f.pending && (
                <p className="mx-2.5 mt-1.5 flex items-start gap-1.5 rounded-lg bg-paper px-2 py-1.5 text-[9px] leading-relaxed text-ink/45 sm:mx-4 sm:mt-2 sm:text-[10px]">
                  <Lock size={10} className="mt-[2px] shrink-0" /> {f.pending}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between gap-1.5 border-t border-ink/10 px-2.5 py-2 sm:px-4 sm:py-2.5">
                <span className="min-w-0 flex-1 font-mono text-[8px] leading-snug text-ink/35 sm:text-[9px]">{f.downloads} 次下载 · {f.category}</span>
                <DownloadLink f={f} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border-1.5 border-ink bg-cream">
          <div className="hidden grid-cols-[1fr_120px_100px_110px_90px] gap-3 border-b border-ink/12 bg-paper px-4 py-2 font-mono text-[9px] tracking-widest text-ink/40 sm:grid">
            <span>名称</span>
            <span>分类</span>
            <span>大小</span>
            <span>更新时间</span>
            <span className="text-right">操作</span>
          </div>
          {list.map((f) => (
            <div
              key={f.id}
              className="flex flex-col gap-1 border-b border-ink/8 px-4 py-2.5 transition hover:bg-lime/20 last:border-0 sm:grid sm:grid-cols-[1fr_120px_100px_110px_90px] sm:items-center sm:gap-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileIcon ext={f.ext} size={16} className="shrink-0" />
                <span className="truncate text-[12px] font-medium">{f.name}</span>
                <span className="font-mono text-[9.5px] text-ink/30">{f.ext.toUpperCase()}</span>
              </div>
              <span className="truncate text-[10.5px] text-ink/45">{f.category}</span>
              <span className="font-mono text-[10px] text-ink/45">{f.size}</span>
              <span className="font-mono text-[10px] text-ink/45">{f.date}</span>
              <span className="flex items-center justify-end gap-1.5">
                <button onClick={() => toggleStar(f.id)} aria-label="收藏" className="p-0.5">
                  <Star size={12} className={cn(stars.includes(f.id) ? 'fill-ink text-ink' : 'text-ink/20')} />
                </button>
                <DownloadLink f={f} row />
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 rounded-xl border border-dashed border-ink/20 bg-cream/60 px-4 py-3 text-[11px] leading-relaxed text-ink/45">
        注：站内所有资料均为个人整理，部分数据已脱敏。引用请在评论区或邮件告知一声。需要更多原始素材（评测集、脚本、设计稿）可以来
        <Link to="/me/guestbook" className="mx-1 font-medium text-ink underline">
          留言
        </Link>
        找我。
      </p>

      {node}
    </div>
  )
}
