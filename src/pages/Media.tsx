import { ArrowUpRight, BarChart3, BookOpen, Mail, PlayCircle, Sparkles, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageIntro, Reveal, Sticker } from '@/components/ui/primitives'
import { mediaStats, platforms } from '@/data/me'
import { profile } from '@/data/site'

const series = [
  { name: 'FDE 前沿教程', count: 89, note: '工具测评与工作流拆解，小红书收藏最多的一栏。', color: '#C9F158' },
  { name: '项目复盘', count: 42, note: '每个项目一篇长文，写决策不写成绩。', color: '#BFD8FF' },
  { name: 'Agent 评测笔记', count: 31, note: '指标、Judge、A/B 盲测，读者多为同行。', color: '#FFB3C7' },
  { name: '生活切片', count: 18, note: '骑行、咖啡、胶片，用来平衡算法的密度。', color: '#E6DDC9' },
]

export default function Media() {
  const max = Math.max(...platforms.map((p) => parseFloat(p.followers.replace(/[^\d.]/g, '')) * (p.followers.includes('w') ? 10000 : 1)))

  return (
    <div className="shell">
      <PageIntro
        kicker="05 / ME · MEDIA MATRIX"
        title={
          <>
            六个平台，
            <br />
            <span className="marker">一个人运营</span>
          </>
        }
        desc="从 2024 年底开始做 AI 内容，第一篇只有 200 播放。现在全网 3.4w 粉，89 篇 FDE 教程，累计浏览 15w+。"
        note="内容不是副业收入来源，是我保持输入的方式。"
        right={
          <div className="flex flex-wrap gap-2">
            <Sticker rotate={-4} color="#C9F158">
              全网 3.4w 粉
            </Sticker>
            <Sticker rotate={5}>355 条原创</Sticker>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {mediaStats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.05}>
            <div className={i === 0 ? 'rounded-2xl border-1.5 border-ink bg-ink p-4 text-paper' : 'rounded-2xl border-1.5 border-ink bg-cream p-4'}>
              <p className={`font-display text-[26px] font-extrabold leading-none ${i === 0 ? 'text-lime' : ''}`}>{s.value}</p>
              <p className={`mt-1.5 font-mono text-[9px] tracking-widest ${i === 0 ? 'text-paper/40' : 'text-ink/40'}`}>{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="grid gap-3 sm:grid-cols-2">
            {platforms.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.04}>
                <a
                  href="#"
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-1.5 border-ink bg-cream p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-hard"
                >
                  <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: p.color }} />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[14px] font-extrabold">{p.name}</p>
                      <p className="font-mono text-[9.5px] text-ink/40">{p.handle}</p>
                    </div>
                    <span className="flex items-center gap-0.5 rounded-full bg-lime/40 px-1.5 py-0.5 font-mono text-[9.5px] text-ink/60">
                      <TrendingUp size={8} /> {p.growth}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <p className="font-display text-[30px] font-extrabold leading-none">{p.followers}</p>
                    <p className="pb-0.5 text-[10px] text-ink/40">粉丝 · {p.posts} 条内容</p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/8">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (parseFloat(p.followers.replace(/[^\d.]/g, '')) * (p.followers.includes('w') ? 10000 : 1) / max) * 100)}%`, background: p.color }} />
                  </div>
                  <p className="mt-2.5 text-[10.5px] leading-relaxed text-ink/50">{p.note}</p>
                  <div className="mt-2 flex items-center justify-between border-t border-dashed border-ink/12 pt-2">
                    <span className="font-mono text-[9px] text-ink/35">{p.focus}</span>
                    <ArrowUpRight size={12} className="text-ink/25 transition group-hover:text-ink" />
                  </div>
                </a>
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
                    style={{ background: level === 0 ? 'rgba(251,248,241,0.08)' : `rgba(201,241,88,${0.25 + level * 0.18})` }}
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
