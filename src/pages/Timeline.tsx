import { ArrowUpRight, CalendarDays, Flag, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead } from '@/components/ui/primitives'
import { growthTimeline } from '@/data/me'
import { cn } from '@/lib/utils'
import { useSeo } from '@/lib/seo'

const tagColor: Record<string, string> = {
  学习: 'rgb(var(--c-sky))',
  项目: 'rgb(var(--c-lime))',
  竞赛: 'rgb(var(--c-coral))',
  内容: 'rgb(var(--c-grape))',
  生活: 'rgb(var(--c-rose))',
}

const tags = ['全部', '学习', '项目', '竞赛', '内容', '生活'] as const

export default function Timeline() {
  const [tag, setTag] = useState<string>('全部')
  const list = tag === '全部' ? growthTimeline : growthTimeline.filter((t) => t.tag === tag)

  useSeo({
    title: '成长时间轴 · 魏云潇',
    description: `2018 → 2026，${growthTimeline.length} 个节点：学习、项目、竞赛、内容与生活。`,
    path: '/me/timeline',
  })

  return (
    <div className="shell">
      <PageHead
        kicker="05 / ME · TIMELINE"
        title="2018 到 2026，一步步长出来"
        right={
          <span className="font-mono text-[9.5px] text-ink/45">
            8 年 · {growthTimeline.length} 个节点
          </span>
        }
      />

      <div className="mb-5 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={cn(
              'rounded-full border-1.5 px-3.5 py-1.5 text-[11.5px] transition',
              tag === t ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-cream text-ink/55 hover:border-ink/50',
            )}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto hidden items-center gap-1.5 font-mono text-[9px] text-ink/35 sm:flex">
          <Flag size={10} /> 共 {growthTimeline.length} 个节点
        </span>
      </div>

      <div className="relative">
        <div className="absolute bottom-0 left-[46px] top-2 w-px bg-gradient-to-b from-ink/30 via-ink/15 to-transparent sm:left-[76px]" />
        <div className="space-y-4">
          {list.map((n, i) => (
            <div key={n.id} className="relative grid grid-cols-[46px_minmax(0,1fr)] gap-3 sm:grid-cols-[76px_minmax(0,1fr)] sm:gap-5">
              <div className="pt-3 text-right">
                <p className="font-mono text-[10px] font-bold text-ink/60">{n.year}</p>
                <p className="font-mono text-[9.5px] text-ink/30">{n.date}</p>
              </div>

              <span
                className={cn(
                  'absolute left-[40px] top-[18px] h-[13px] w-[13px] rounded-full border-1.5 border-ink sm:left-[70px]',
                  n.highlight && 'ring-4 ring-coral/20',
                )}
                style={{ background: tagColor[n.tag] }}
              />

              <div
                className={cn(
                  'group rounded-2xl border-1.5 border-ink p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-hard-sm sm:p-5',
                  n.highlight ? 'bg-ink text-paper' : 'bg-cream',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 font-mono text-[9.5px] font-medium text-ink"
                      style={{ background: tagColor[n.tag] }}
                    >
                      {n.tag}
                    </span>
                    <span className={cn('font-mono text-[9px]', n.highlight ? 'text-paper/35' : 'text-ink/35')}>0{list.length - i}</span>
                  </div>
                  <span className={cn('flex items-center gap-1 font-mono text-[9px]', n.highlight ? 'text-paper/40' : 'text-ink/35')}>
                    <CalendarDays size={9} /> {n.date}
                  </span>
                </div>
                <h3 className="mt-2 text-[16px] font-extrabold leading-snug">
                  {n.title}
                  {n.highlight && <Sparkles size={13} className="ml-1.5 inline text-lime" />}
                </h3>
                <p className={cn('mt-0.5 font-mono text-[9.5px]', n.highlight ? 'text-lime/70' : 'text-coral/80')}>{n.org}</p>
                <p className={cn('mt-2 text-[12px] leading-relaxed', n.highlight ? 'text-paper/60' : 'text-ink/55')}>{n.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-1.5 border-ink bg-lime/40 p-5">
        <div>
          <p className="kicker">NEXT CHAPTER</p>
          <h3 className="mt-1.5 text-[18px] font-extrabold">下一站，希望是你的团队。</h3>
          <p className="mt-1 text-[11.5px] text-ink/60">简历在「工作」里，随时可以看。</p>
        </div>
        <Link to="/work/resume" className="btn-ink !py-2 !text-[12px]">
          查看简历 <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  )
}
