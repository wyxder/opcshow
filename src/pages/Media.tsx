import { ArrowUpRight, BarChart3, BookOpen, ExternalLink, Mail, PlayCircle, Sparkles, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHead, Reveal } from '@/components/ui/primitives'
import { followersToNumber, formatWan, mediaStats, platforms, totalFollowers, totalPosts } from '@/data/me'
import { figures, profile } from '@/data/site'
import { useSeo } from '@/lib/seo'

const series = [
  { name: 'FDE 前沿教程', count: figures.fdeTutorials, note: '工具测评与工作流拆解，小红书收藏最多的一栏。', color: 'rgb(var(--c-lime))' },
  { name: '项目复盘', count: 42, note: '每个项目一篇长文，写决策不写成绩。', color: 'rgb(var(--c-sky))' },
  { name: 'Agent 评测笔记', count: 31, note: '指标、Judge、A/B 盲测，读者多为同行。', color: 'rgb(var(--c-rose))' },
  { name: '生活切片', count: 18, note: '骑行、咖啡、胶片，用来平衡算法的密度。', color: 'rgb(var(--c-surface-2))' },
]

export default function Media() {
  const max = Math.max(...platforms.map((p) => followersToNumber(p.followers)))

  useSeo({
    title: '自媒体矩阵 · 晓叶',
    description: `${platforms.length} 个平台、${formatWan(totalFollowers)} 粉丝的运营数据与内容系列。`,
    path: '/me/media',
  })

  return (
    <div className="shell">
      <PageHead
        kicker="05 / ME · MEDIA MATRIX"
        title={`${platforms.length} 个平台，一个人运营`}
        right={
          <span className="font-mono text-[9.5px] text-ink/45">
            全网 {formatWan(totalFollowers)} 粉 · {totalPosts} 条原创
          </span>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {mediaStats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.05}>
            <div className={i === 0 ? 'rounded-2xl border-1.5 border-ink bg-ink p-4 text-paper' : 'rounded-2xl border-1.5 border-ink bg-cream p-4'}>
              <p className={`font-display text-[26px] font-extrabold leading-none ${i === 0 ? 'text-lime' : ''}`}>{s.value}</p>
              <p className={`mt-1.5 font-mono text-[9px] tracking-widest ${i === 0 ? 'text-paper/40' : 'text-ink/40'}`}>{s.label}</p>
              <p className={`mt-0.5 text-[9.5px] ${i === 0 ? 'text-paper/35' : 'text-ink/35'}`}>{s.note}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {/* 自媒体卡片：移动端一行 2 个，图标与数字同步缩小 */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {platforms.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.04}>
                {/* fx.md F4：有公开主页才是链接，没有就渲染成不可点的卡片，不留 href="#" */}
                <div
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-1.5 border-ink bg-cream p-2.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-hard sm:p-4"
                  {...(p.url ? {} : { role: 'group', 'aria-label': `${p.name} 站内展示` })}
                >
                  <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: p.color }} aria-hidden />
                  <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
                      {/* 平台真实图标：本地 SVG，不依赖外链 */}
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-1.5 border-ink bg-paper p-1 sm:h-10 sm:w-10 sm:rounded-xl sm:p-1.5">
                        <img
                          src={`/icons/platforms/${p.id}.svg`}
                          alt={`${p.name} 图标`}
                          width={26}
                          height={26}
                          className="size-[18px] object-contain sm:size-[26px]"
                          loading="lazy"
                          decoding="async"
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[11.5px] font-extrabold sm:text-[14px]">{p.name}</p>
                        <p className="truncate font-mono text-[8px] text-ink/40 sm:text-[9.5px]">{p.handle}</p>
                      </div>
                    </div>
                    {/* 窄屏只留百分比，把宽度让给平台名与 handle，避免被 ellipsis 吃掉 */}
                    <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-lime/40 px-1 py-0.5 font-mono text-[8px] text-ink/60 sm:px-1.5 sm:text-[9.5px]">
                      <TrendingUp size={8} />
                      <span className="sm:hidden">{p.growth.split(' / ')[0]}</span>
                      <span className="hidden sm:inline">{p.growth}</span>
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-end gap-1.5 sm:mt-3 sm:gap-2">
                    <p className="font-display text-[21px] font-extrabold leading-none sm:text-[30px]">{p.followers}</p>
                    <p className="pb-0.5 text-[8.5px] text-ink/40 sm:text-[10px]">粉丝 · {p.posts} 条内容</p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/8">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (followersToNumber(p.followers) / max) * 100)}%`, background: p.color }} />
                  </div>
                  <p className="mt-2 line-clamp-2 flex-1 text-[9.5px] leading-relaxed text-ink/50 sm:mt-2.5 sm:line-clamp-none sm:text-[10.5px]">{p.note}</p>
                  <div className="mt-2 flex items-center justify-between gap-1 border-t border-dashed border-ink/12 pt-2">
                    <span className="truncate font-mono text-[8px] text-ink/35 sm:text-[9px]">{p.focus}</span>
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex shrink-0 items-center gap-1 font-mono text-[8px] text-ink/45 transition hover:text-ink sm:text-[9px]"
                      >
                        主页 <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1 font-mono text-[8px] text-ink/30 sm:text-[9px]">
                        站内展示 <ArrowUpRight size={10} className="opacity-40" />
                      </span>
                    )}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border-1.5 border-ink bg-cream p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[15px] font-extrabold">
                <BarChart3 size={15} /> 内容系列
              </h2>
              <span className="font-mono text-[9px] text-ink/35">4 SERIES</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {series.map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="w-1.5 self-stretch rounded-full" style={{ background: s.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[12px] font-medium">{s.name}</p>
                      <span className="shrink-0 font-mono text-[9.5px] text-ink/40">{s.count} 篇</span>
                    </div>
                    <p className="mt-0.5 truncate text-[10.5px] text-ink/45">{s.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-3 lg:col-span-4">
          <div className="rounded-2xl border-1.5 border-ink bg-ink p-5 text-paper">
            <p className="font-mono text-[9px] tracking-[0.2em] text-lime">POSTING RHYTHM</p>
            <h3 className="mt-1.5 text-[15px] font-extrabold">近 12 周更新</h3>
            <div className="mt-3 grid grid-cols-12 gap-1">
              {Array.from({ length: 84 }).map((_, i) => {
                const level = (i * 7 + i * i) % 5
                return (
                  <span
                    key={i}
                    className="aspect-square rounded-[2px]"
                    style={{ background: level === 0 ? 'rgb(var(--c-surface) / 0.08)' : `rgb(var(--c-lime) / ${0.25 + level * 0.18})` }}
                  />
                )
              })}
            </div>
            <div className="mt-2.5 flex items-center justify-between font-mono text-[9px] text-paper/35">
              <span>12 WEEKS AGO</span>
              <span>NOW</span>
            </div>
            <p className="mt-3 border-t border-paper/15 pt-3 text-[10.5px] leading-relaxed text-paper/45">
              每周 2–3 条。比赛周会断更，赛后会补一篇复盘。
            </p>
          </div>

          <div className="rounded-2xl border-1.5 border-ink bg-lime p-5">
            <Sparkles size={16} />
            <h3 className="mt-2 text-[16px] font-extrabold">内容带来的东西</h3>
            <ul className="mt-2.5 space-y-1.5 text-[11.5px] text-ink/70">
              {['第一个开源 star', '3 次企业内训邀请', '5 个合作项目', '7 款付费产品的种子用户'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="h-1 w-1 rotate-45 bg-ink/60" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border-1.5 border-ink bg-cream p-5">
            <p className="font-mono text-[9px] tracking-[0.16em] text-ink/35">COLLAB</p>
            <p className="mt-1.5 text-[12.5px] font-medium">内容合作 / 技术分享 / 内训</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-ink/45">只接我真正用过的产品；线下分享西安、杭州可安排。</p>
            <a href={`mailto:${profile.email}`} className="mt-3 flex items-center justify-between rounded-xl border border-ink/20 px-3 py-2 text-[11px] transition hover:border-ink hover:bg-lime/40">
              <span className="flex items-center gap-1.5">
                <Mail size={11} /> {profile.email}
              </span>
              <ArrowUpRight size={11} />
            </a>
          </div>

          <Link to="/learn" className="flex items-center justify-between gap-2 rounded-2xl border-1.5 border-ink bg-cream p-4 text-[12px] font-medium transition hover:-translate-y-0.5 hover:shadow-hard-sm">
            <span className="flex items-center gap-1.5">
              <BookOpen size={13} /> 把内容整理成了知识库
            </span>
            <ArrowUpRight size={12} />
          </Link>
          <Link to="/life/moments" className="flex items-center justify-between gap-2 rounded-2xl border-1.5 border-ink bg-cream p-4 text-[12px] font-medium transition hover:-translate-y-0.5 hover:shadow-hard-sm">
            <span className="flex items-center gap-1.5">
              <PlayCircle size={13} /> 幕后日常在朋友圈
            </span>
            <ArrowUpRight size={12} />
          </Link>
        </aside>
      </div>
    </div>
  )
}
