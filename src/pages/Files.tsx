import { CloudUpload, Download, FileArchive, FileCode2, FileSpreadsheet, FileText, FolderOpen, LayoutGrid, List, Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageIntro, Sticker } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/Toast'
import { resourceFiles, type ResourceFile } from '@/data/work'
import { cn, useLocalStorage } from '@/lib/utils'

const extMeta: Record<ResourceFile['ext'], { color: string; icon: typeof FileText; label: string }> = {
  pdf: { color: '#FF5A2B', icon: FileText, label: 'PDF' },
  md: { color: '#3C5BFF', icon: FileText, label: 'MD' },
  zip: { color: '#7C5CFF', icon: FileArchive, label: 'ZIP' },
  fig: { color: '#FFB3C7', icon: LayoutGrid, label: 'FIG' },
  py: { color: '#C9F158', icon: FileCode2, label: 'PY' },
  pptx: { color: '#FF5A2B', icon: FileText, label: 'PPT' },
  xlsx: { color: '#1D9E75', icon: FileSpreadsheet, label: 'XLS' },
}

const categories = ['全部', '简历与作品集', '课程与讲义', '数据集', '模板', '源码'] as const

export default function Files() {
  const [cat, setCat] = useState<string>('全部')
  const [q, setQ] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sort, setSort] = useState<'new' | 'hot' | 'name'>('new')
  const [drag, setDrag] = useState(false)
  const [stars, setStars] = useLocalStorage<string[]>('wyx-file-stars', ['f1', 'f4'])
  const { show, node } = useToast()

  const list = useMemo(() => {
    const key = q.trim().toLowerCase()
    const filtered = resourceFiles.filter((f) => {
      const cOk = cat === '全部' || f.category === cat
      const qOk = !key || (f.name + f.desc + f.category).toLowerCase().includes(key)
      return cOk && qOk
    })
    return [...filtered].sort((a, b) => {
      if (sort === 'hot') return b.downloads - a.downloads
      if (sort === 'name') return a.name.localeCompare(b.name, 'zh')
      return b.date.localeCompare(a.date)
    })
  }, [cat, q, sort])

  const toggleStar = (id: string) => setStars((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <div className="shell">
      <PageIntro
        kicker="03 / WORK · RESOURCES"
        title={
          <>
            文件
            <br />
            <span className="marker">资源中心</span>
          </>
        }
        desc="简历、课件、数据集、模板和源码，能下载的都放在这里。公开的都可以直接用，注明来源即可。"
        note="演示站点：下载按钮不会真的给你一个文件。"
        right={
          <div className="flex flex-wrap gap-2">
            <Sticker rotate={-4}>{resourceFiles.length} 个文件</Sticker>
            <Sticker rotate={5} color="#BFD8FF">
              已收藏 {stars.length}
            </Sticker>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_280px]">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            show('拖进来了！不过演示站点不会真的上传 :)')
          }}
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border-1.5 border-dashed px-5 py-6 text-center transition-colors',
            drag ? 'border-ink bg-lime/40' : 'border-ink/25 bg-cream/60',
          )}
        >
          <CloudUpload size={22} className="text-ink/35" />
          <p className="mt-2 text-[12.5px] font-medium">把文件拖到这里，或者点我上传</p>
          <p className="mt-1 font-mono text-[9.5px] tracking-wide text-ink/35">单文件 ≤ 20MB · 演示站点不会真的上传</p>
          <button onClick={() => show('选择文件窗口（演示）')} className="btn mt-3 !px-3.5 !py-1.5 !text-[11px]">
            选择文件
          </button>
          <div className="mt-3 flex flex-wrap justify-center gap-1">
            {['PDF', 'MD', 'ZIP', 'PY', 'CSV'].map((ext) => (
              <span key={ext} className="rounded border border-ink/15 bg-paper px-1.5 py-0.5 font-mono text-[9px] text-ink/45">
                {ext}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border-1.5 border-ink bg-ink p-4 text-paper">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[9px] tracking-[0.18em] text-lime">STORAGE</p>
            <span className="font-mono text-[9px] text-paper/40">63.4 / 128 MB</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper/15">
            <div className="h-full w-1/2 rounded-full bg-lime" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              ['公开', 8],
              ['私密', 1],
              ['归档', 0],
            ].map(([k, v]) => (
              <div key={k as string}>
                <p className="font-display text-[15px] font-extrabold">{v}</p>
                <p className="font-mono text-[9.5px] text-paper/40">{k}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((f) => {
            const meta = extMeta[f.ext]
            const Icon = meta.icon
            return (
              <div key={f.id} className="group relative overflow-hidden rounded-2xl border-1.5 border-ink bg-cream transition-all duration-300 hover:-translate-y-1 hover:shadow-hard">
                <div className="flex items-start gap-3 p-4">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-1.5 border-ink"
                    style={{ background: meta.color + '66' }}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="text-[12.5px] font-bold leading-snug">{f.name}</h3>
                      <button onClick={() => toggleStar(f.id)} aria-label="收藏文件" className="shrink-0 p-0.5">
                        <Star size={13} className={cn(stars.includes(f.id) ? 'fill-ink text-ink' : 'text-ink/20 hover:text-ink/50')} />
                      </button>
                    </div>
                    <p className="mt-0.5 font-mono text-[9px] text-ink/35">
                      {f.ext.toUpperCase()} · {f.size} · {f.date}
                    </p>
                  </div>
                </div>
                <p className="px-4 text-[11px] leading-relaxed text-ink/50">{f.desc}</p>
                <div className="mt-3 flex items-center justify-between border-t border-ink/10 px-4 py-2.5">
                  <span className="font-mono text-[9px] text-ink/35">{f.downloads} 次下载 · {f.category}</span>
                  <button
                    onClick={() => show(`「${f.name}」开始下载（演示）`)}
                    className="flex items-center gap-1 rounded-full border border-ink/20 bg-paper px-2 py-1 text-[9.5px] transition hover:border-ink hover:bg-lime"
                  >
                    <Download size={10} /> 下载
                  </button>
                </div>
              </div>
            )
          })}
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
          {list.map((f) => {
            const meta = extMeta[f.ext]
            return (
              <div
                key={f.id}
                className="flex flex-col gap-1 border-b border-ink/8 px-4 py-2.5 transition hover:bg-lime/20 last:border-0 sm:grid sm:grid-cols-[1fr_120px_100px_110px_90px] sm:items-center sm:gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="h-6 w-1 shrink-0 rounded" style={{ background: meta.color }} />
                  <span className="truncate text-[12px] font-medium">{f.name}</span>
                  <span className="font-mono text-[9.5px] text-ink/30">{meta.label}</span>
                </div>
                <span className="truncate text-[10.5px] text-ink/45">{f.category}</span>
                <span className="font-mono text-[10px] text-ink/45">{f.size}</span>
                <span className="font-mono text-[10px] text-ink/45">{f.date}</span>
                <span className="flex items-center justify-end gap-1.5">
                  <button onClick={() => toggleStar(f.id)} aria-label="收藏" className="p-0.5">
                    <Star size={12} className={cn(stars.includes(f.id) ? 'fill-ink text-ink' : 'text-ink/20')} />
                  </button>
                  <button
                    onClick={() => show(`「${f.name}」开始下载（演示）`)}
                    className="rounded-full border border-ink/20 px-2 py-0.5 text-[9px] hover:bg-lime"
                  >
                    下载
                  </button>
                </span>
              </div>
            )
          })}
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
