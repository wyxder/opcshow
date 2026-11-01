import { ChevronDown, Clock, CalendarDays, Bot, Database, PenLine, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plate, Reveal } from '@/components/ui/primitives'
import { articleCategories, articleMeta } from '@/data/articles.index'
import { cn } from '@/lib/utils'
import { useSeo } from '@/lib/seo'

const categoryVisual: Record<string, { icon: typeof Database; color: string }> = {
  'RAG 工程化': { icon: Database, color: 'rgb(var(--c-blue))' },
  'Agent 评测': { icon: Bot, color: 'rgb(var(--c-grape))' },
  '工程手记': { icon: PenLine, color: 'rgb(var(--c-coral))' },
}

const coverMotifs = ['orbit', 'stack', 'bars', 'grid', 'wave', 'rings'] as const
const coverAccents = [
  'rgb(var(--c-blue))',
  'rgb(var(--c-grape))',
  'rgb(var(--c-coral))',
  'rgb(var(--c-lime))',
  'rgb(var(--c-sky))',
  'rgb(var(--c-rose))',
]

export default function Learn() {
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useSeo({
    title: '知识库 · 晓叶',
    description: `${articleMeta.length} 篇长文：RAG 工程化、Agent 评测、工程手记。`,
    path: '/learn',
  })

  const list = useMemo(() => {
    const key = q.trim().toLowerCase()
    return articleMeta.filter((a) => {
      const catOk = cat === 'all' || a.category === cat || a.tags.includes(cat)
      const qOk = !key || (a.title + a.abstract + a.tags.join('')).toLowerCase().includes(key)
      return catOk && qOk
    })
  }, [cat, q])

  const navGroups = useMemo(
    () =>
      articleCategories
        .filter((c) => c.key !== 'all')
        .map((c) => ({
          ...c,
          tags: Array.from(new Set(articleMeta.filter((a) => a.category === c.key).flatMap((a) => a.tags))).map((tag) => ({
            key: tag,
            label: tag,
            count: articleMeta.filter((a) => a.tags.includes(tag)).length,
          })),
        })),
    [],
  )

  const selected = cat !== 'all'
  const reset = () => {
    setCat('all')
    setQ('')
  }

  return (
    <div className="shell py-6 lg:py-8">
      <h1 className="sr-only">知识库</h1>

      {/* 搜索 */}
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索文章标题或标签..."
          aria-label="搜索文章标题或标签"
          className="h-12 w-full rounded-2xl border border-ink/10 bg-cream pl-12 pr-12 text-[14px] text-ink outline-none shadow-[0_1px_2px_rgba(20,20,15,0.04)] transition placeholder:text-ink/30 focus:border-ink/25 focus:ring-4 focus:ring-blue/10"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            aria-label="清空搜索"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink/35 transition hover:bg-ink/5 hover:text-ink"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-7">
        {/* 左栏：目录导航 */}
        <aside className="hidden lg:block">
          <div className="no-scrollbar sticky top-24 max-h-[calc(100vh-7rem)] space-y-3 overflow-y-auto pb-1">
            <nav
              aria-label="知识库目录"
              className="rounded-2xl border border-ink/10 bg-cream p-3 shadow-[0_1px_2px_rgba(20,20,15,0.04)]"
            >
            <p className="px-3 pb-2.5 pt-1 text-[12px] font-medium tracking-wide text-ink/40">目录导航</p>

            <button
              onClick={() => setCat('all')}
              aria-current={!selected ? 'page' : undefined}
              className={cn(
                'flex w-full items-center rounded-xl px-3 py-2.5 text-left text-[13px] transition',
                !selected ? 'bg-blue/10 font-medium text-ink' : 'text-ink/60 hover:bg-ink/[0.04] hover:text-ink',
              )}
            >
              全部文章
            </button>

            {navGroups.map((group) => {
              const visual = categoryVisual[group.key] ?? { icon: Database, color: 'rgb(var(--c-ink))' }
              const Icon = visual.icon
              const open = !collapsed[group.key]
              return (
                <div key={group.key} className="mt-0.5">
                  <button
                    onClick={() => setCollapsed((prev) => ({ ...prev, [group.key]: !prev[group.key] }))}
                    aria-expanded={open}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] text-ink/75 transition hover:bg-ink/[0.04] hover:text-ink"
                  >
                    <span
                      className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: `color-mix(in srgb, ${visual.color} 16%, transparent)`,
                        color: visual.color,
                      }}
                    >
                      <Icon size={14} />
                    </span>
                    <span className="flex-1">{group.label}</span>
                    <ChevronDown
                      size={14}
                      className={cn('shrink-0 text-ink/30 transition-transform duration-200', !open && '-rotate-90')}
                    />
                  </button>

                  <div
                    className={cn(
                      'grid transition-[grid-template-rows] duration-200 ease-out',
                      open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="space-y-0.5 py-0.5 pl-[38px] pr-1">
                        <button
                          onClick={() => setCat(group.key)}
                          aria-current={cat === group.key ? 'page' : undefined}
                          className={cn(
                            'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12px] transition',
                            cat === group.key
                              ? 'bg-blue/10 font-medium text-ink'
                              : 'text-ink/50 hover:bg-ink/[0.04] hover:text-ink',
                          )}
                        >
                          <span>全部 {group.label}</span>
                        </button>
                        {group.tags.map((tag) => (
                          <button
                            key={tag.key}
                            onClick={() => setCat(tag.key)}
                            aria-current={cat === tag.key ? 'page' : undefined}
                            className={cn(
                              'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12px] transition',
                              cat === tag.key
                                ? 'bg-blue/10 font-medium text-ink'
                                : 'text-ink/50 hover:bg-ink/[0.04] hover:text-ink',
                            )}
                          >
                            <span className="truncate">{tag.label}</span>
                            <span className="ml-2 shrink-0 tabular-nums text-[11px] text-ink/30">{tag.count}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </nav>
          </div>
        </aside>

        {/* 右栏：文章网格 */}
        <section>
          {/* 移动端分类 */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:hidden">
            <button
              onClick={() => setCat('all')}
              aria-current={!selected ? 'page' : undefined}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] transition',
                !selected ? 'border-blue/50 bg-blue/10 font-medium text-ink' : 'border-ink/10 bg-cream text-ink/55',
              )}
            >
              全部
            </button>
            {navGroups.map((group) => (
              <button
                key={group.key}
                onClick={() => setCat(group.key)}
                aria-current={cat === group.key ? 'page' : undefined}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] transition',
                  cat === group.key
                    ? 'border-blue/50 bg-blue/10 font-medium text-ink'
                    : 'border-ink/10 bg-cream text-ink/55',
                )}
              >
                {group.label}
              </button>
            ))}
          </div>

          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[13px] text-ink/50">
              共 <span className="font-semibold text-ink">{list.length}</span> 篇文章
              {q && <span className="ml-1.5 text-ink/35">· “{q.trim()}”</span>}
            </p>
            {(selected || q) && (
              <button onClick={reset} className="text-[12px] text-ink/40 transition hover:text-ink">
                清除筛选
              </button>
            )}
          </div>

          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink/20 bg-cream/60 px-6 py-20 text-center">
              <Search size={28} className="text-ink/20" />
              <p className="mt-4 text-[14px] font-medium text-ink/60">没有找到相关文章</p>
              <p className="mt-1 text-[12px] text-ink/40">换个关键词，或看看更早的笔记。</p>
              <button
                onClick={reset}
                className="mt-5 rounded-full border border-ink/15 bg-cream px-4 py-1.5 text-[12px] text-ink/70 transition hover:border-ink/40 hover:text-ink"
              >
                重置筛选
              </button>
            </div>
          ) : (
            // 移动端固定一行 2 个，卡片内边距与字号跟着收紧
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {list.map((a, i) => {
                const artIndex = articleMeta.findIndex((x) => x.id === a.id)
                return (
                  <Reveal key={a.id} delay={Math.min(i, 5) * 0.04} y={12} className="h-full">
                    <Link
                      to={`/learn/${a.id}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-cream shadow-[0_1px_2px_rgba(20,20,15,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_18px_40px_-26px_rgba(20,20,15,0.4)]"
                    >
                      <Plate
                        motif={coverMotifs[artIndex % coverMotifs.length]}
                        accent={coverAccents[artIndex % coverAccents.length]}
                        className="relative aspect-[16/9] w-full shrink-0 border-b border-ink/10 [&>svg]:transition-transform [&>svg]:duration-500 group-hover:[&>svg]:scale-[1.04]"
                      />

                      <div className="flex flex-1 flex-col p-2.5 sm:p-[18px]">
                        <span className="truncate text-[10px] font-medium text-ink/45 sm:text-[11.5px]">{a.category}</span>
                        <h2 className="mt-1 line-clamp-2 text-[12.5px] font-bold leading-snug transition-colors group-hover:text-blue sm:mt-1.5 sm:text-[15.5px]">
                          {a.title}
                        </h2>
                        <p className="mt-1.5 line-clamp-2 flex-1 text-[10.5px] leading-[1.65] text-ink/55 sm:mt-2 sm:line-clamp-3 sm:text-[12px] sm:leading-[1.7]">
                          {a.abstract}
                        </p>

                        <div className="mt-2 hidden flex-wrap gap-x-2 gap-y-1 text-[10.5px] text-ink/40 sm:mt-3 sm:flex">
                          {a.tags.map((t) => (
                            <span key={t}># {t}</span>
                          ))}
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-1 border-t border-ink/[0.08] pt-2 font-mono text-[9px] text-ink/40 sm:mt-3.5 sm:gap-2 sm:pt-3 sm:text-[10.5px]">
                          <span className="flex min-w-0 items-center gap-1 sm:gap-1.5">
                            <CalendarDays size={11} className="shrink-0 text-ink/30 sm:size-[12px]" />
                            <span className="truncate">{a.date}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                            <Clock size={11} className="text-ink/30 sm:size-[12px]" />
                            {a.readMin} 分钟
                          </span>
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
