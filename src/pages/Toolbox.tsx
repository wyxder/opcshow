import { ArrowUpRight, BookOpen, Box, Code2, Copy, ExternalLink, Flame, Palette, Search, Sparkles, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { PageHead, Reveal } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/Toast'
import { toolboxGroups, type ToolboxItem } from '@/data/work'
import { cn, useLocalStorage } from '@/lib/utils'
import { STORAGE_KEYS, isStringArray } from '@/lib/storage'
import { useSeo } from '@/lib/seo'

/** 每张卡片都带一个组图标，快速区分 Prompt / 代码 / 设计 / 在读 */
const groupIcons: Record<string, typeof Box> = {
  'Prompt 仓库': Sparkles,
  代码片段: Code2,
  设计资产: Palette,
  '在读 / 在听': BookOpen,
}

export default function Toolbox() {
  const [group, setGroup] = useState<string>('all')
  const [q, setQ] = useState('')
  const [onlyStar, setOnlyStar] = useState(false)
  /** F-05 详情弹窗：卡片点开就能看到完整正文 */
  const [detail, setDetail] = useState<(ToolboxItem & { group: string; color: string }) | null>(null)
  const [stars, setStars] = useLocalStorage<string[]>(STORAGE_KEYS.toolboxStars, ['p1', 'c1', 'd1'], isStringArray)
  const { show, node } = useToast()

  useSeo({
    title: '百宝箱 · 晓叶',
    description: '反复用到的 Prompt、代码片段、设计资产和输入源。',
    path: '/work/toolbox',
  })

  const all = toolboxGroups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title, color: g.color })))

  const list = useMemo(() => {
    const key = q.trim().toLowerCase()
    return all.filter((i) => {
      const gOk = group === 'all' || i.group === group
      const qOk = !key || (i.title + i.desc + i.tag).toLowerCase().includes(key)
      const sOk = !onlyStar || stars.includes(i.id)
      return gOk && qOk && sOk
    })
  }, [all, group, q, onlyStar, stars])

  const toggle = (id: string) => {
    setStars((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  /** 真复制到剪贴板：复制的是完整正文，不是标题摘要；非安全上下文下如实提示 */
  const take = async (item: Pick<ToolboxItem, 'title' | 'body'>) => {
    try {
      await navigator.clipboard.writeText(item.body)
      show(`「${item.title}」正文已复制`)
    } catch {
      show(`浏览器不允许写入剪贴板，可打开详情手动复制：${item.title}`)
    }
  }

  return (
    <div className="shell">
      <PageHead
        kicker="03 / WORK · TOOLBOX"
        title="我的百宝箱"
        right={
          <span className="font-mono text-[9.5px] text-ink/45">
            {all.length} 件藏品 · 已收藏 {stars.length}
          </span>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setGroup('all')}
            className={cn(
              'rounded-full border-1.5 px-3.5 py-1.5 text-[11.5px] transition',
              group === 'all' ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-cream text-ink/60 hover:border-ink/50',
            )}
          >
            全部 <span className="ml-1 font-mono text-[9px] text-lime">{all.length}</span>
          </button>
          {toolboxGroups.map((g) => (
            <button
              key={g.key}
              onClick={() => setGroup(g.title)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border-1.5 px-3.5 py-1.5 text-[11.5px] transition',
                group === g.title ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-cream text-ink/60 hover:border-ink/50',
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
              {g.title}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyStar((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border-1.5 px-3 py-1.5 text-[11px] transition',
              onlyStar ? 'border-ink bg-lime' : 'border-ink/15 bg-cream text-ink/55 hover:border-ink/40',
            )}
          >
            <Star size={11} className={onlyStar ? 'fill-ink' : ''} /> 只看收藏
          </button>
          <div className="flex items-center gap-2 rounded-full border-1.5 border-ink/15 bg-cream px-3 py-1.5 focus-within:border-ink">
            <Search size={13} className="text-ink/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索藏品"
              className="w-32 bg-transparent text-[11.5px] outline-none placeholder:text-ink/35"
            />
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center rounded-2xl border-1.5 border-dashed border-ink/25 bg-cream/50">
          <Box size={26} className="text-ink/20" />
          <p className="mt-2 font-hand text-2xl text-ink/40">这里空空的，换个筛选看看。</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
          {list.map((item, i) => {
            const GroupIcon = groupIcons[item.group] ?? Box
            return (
            <Reveal key={item.id} delay={i * 0.03}>
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-1.5 border-ink bg-cream p-2.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-hard sm:p-4">
                <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                  <div className="flex min-w-0 items-start gap-2 sm:gap-2.5">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-1.5 border-ink sm:h-9 sm:w-9 sm:rounded-xl"
                      style={{ background: `color-mix(in srgb, ${item.color} 42%, transparent)` }}
                      aria-hidden
                    >
                      <GroupIcon size={15} className="size-[13px] shrink-0 sm:size-[15px]" />
                    </span>
                    <div className="min-w-0">
                      <span className="flex items-center gap-1.5 font-mono text-[8px] tracking-wide text-ink/40 sm:gap-1.5 sm:text-[9px] sm:tracking-wide">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ background: item.color }} />
                        <span className="truncate">{item.tag}</span>
                      </span>
                      <button onClick={() => setDetail(item)} className="mt-0.5 block text-left sm:mt-1">
                        <span className="line-clamp-2 text-[11.5px] font-bold leading-snug hover:underline sm:text-[14px]">{item.title}</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {item.hot && (
                      <span className="hidden items-center gap-0.5 rounded-full bg-coral/15 px-1.5 py-0.5 font-mono text-[9px] text-coral sm:flex">
                        <Flame size={8} /> HOT
                      </span>
                    )}
                    <button onClick={() => toggle(item.id)} aria-label="收藏" className="p-0.5">
                      <Star size={14} className={cn('transition', stars.includes(item.id) ? 'fill-ink text-ink' : 'text-ink/25 hover:text-ink/60')} />
                    </button>
                  </div>
                </div>

                <p className="mt-1.5 line-clamp-3 flex-1 text-[10px] leading-relaxed text-ink/50 sm:mt-2.5 sm:line-clamp-none sm:text-[11.5px]">
                  {item.desc}
                </p>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-dashed border-ink/12 pt-2 sm:mt-3 sm:pt-2.5">
                  <span className="font-mono text-[8px] text-ink/35 sm:text-[9px]">
                    {item.stars} 人收藏 · {item.updated}
                  </span>
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <button
                      onClick={() => setDetail(item)}
                      className="rounded-full border border-ink/20 px-1.5 py-0.5 text-[9px] transition hover:border-ink hover:bg-lime sm:px-2 sm:py-1 sm:text-[9.5px]"
                    >
                      详情
                    </button>
                    <button
                      onClick={() => take(item)}
                      className="flex items-center gap-1 rounded-full border border-ink/20 px-1.5 py-0.5 text-[9px] transition hover:border-ink hover:bg-lime sm:px-2 sm:py-1 sm:text-[9.5px]"
                    >
                      <Copy size={10} /> 取用
                    </button>
                  </div>
                </div>
              </div>
            </Reveal>
            )
          })}
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border-1.5 border-ink bg-ink p-5 text-paper">
          <p className="font-mono text-[9px] tracking-[0.2em] text-lime">HOW I CURATE</p>
          <h3 className="mt-2 text-[17px] font-extrabold">进这个盒子的标准</h3>
          <ul className="mt-3 space-y-2 text-[11.5px] text-paper/60">
            {['至少在自己的项目里用过两次', '能直接复制，不需要再读一遍文档', '失效日期写清楚，过期就删'].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rotate-45 bg-lime" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative overflow-hidden rounded-2xl border-1.5 border-ink bg-lime p-5">
          <div className="absolute -right-6 -top-6 font-display text-[80px] font-extrabold leading-none text-ink/10">TOOL</div>
          <p className="relative font-mono text-[9px] tracking-[0.2em] text-ink/45">WANT MORE?</p>
          <h3 className="relative mt-2 text-[17px] font-extrabold">想要某个 Prompt 的完整版？</h3>
          <p className="relative mt-2 text-[11.5px] leading-relaxed text-ink/65">留言告诉我你卡在哪，我会把对应的模板整理出来，放进这个盒子。</p>
          <Link to="/me/guestbook" className="relative mt-4 inline-flex items-center gap-1.5 rounded-full border-1.5 border-ink bg-cream px-3.5 py-2 text-[11.5px] font-medium transition hover:-translate-y-0.5 hover:shadow-hard-sm">
            去留言 <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title ?? ''} kicker={`TOOLBOX · ${detail?.group ?? ''}`}>
        {detail && (
          <div className="px-4 py-4">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] text-ink/40">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm" style={{ background: detail.color }} />
                {detail.tag}
              </span>
              <span>·</span>
              <span>更新 {detail.updated}</span>
              <span>·</span>
              <span>{detail.license}</span>
            </div>
            <pre className="mt-3 max-h-[52vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border-1.5 border-ink bg-ink px-4 py-3 font-mono text-[11.5px] leading-relaxed text-paper/85 no-scrollbar">
              <code>{detail.body}</code>
            </pre>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => take(detail)}
                className="flex items-center gap-1.5 rounded-full border-1.5 border-ink bg-lime px-3.5 py-1.5 text-[11.5px] font-medium transition hover:-translate-y-0.5 hover:shadow-hard-sm"
              >
                <Copy size={11} /> 复制正文
              </button>
              {detail.link && (
                <a
                  href={detail.link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1.5 rounded-full border-1.5 border-ink px-3.5 py-1.5 text-[11.5px] transition hover:-translate-y-0.5 hover:shadow-hard-sm"
                >
                  <ExternalLink size={11} /> 打开原文
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>

      {node}
    </div>
  )
}
