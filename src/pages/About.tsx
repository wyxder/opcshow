import { ArrowUpRight, Coffee, Heart, Mail, MapPin, MessageCircle, Sparkles, Target, User } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { PageHead } from '@/components/ui/primitives'
import { aboutCards, mediaStats } from '@/data/me'
import { profile, skillGroups } from '@/data/site'
import { useSeo } from '@/lib/seo'

export default function About() {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const active = aboutCards.find((c) => c.key === openKey)

  useSeo({
    title: '自我介绍 · 晓叶',
    description: '四张卡片认识我：我是谁、在做什么、怎么工作、一点私货。',
    path: '/me',
  })

  return (
    <div className="shell">
      <PageHead
        kicker="05 / ME · SELF INTRO"
        title="关于我，四张卡片"
        right={
          <span className="font-mono text-[9.5px] text-ink/45">24 岁 · 重庆万州 · 西安研二</span>
        }
      />

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {/* ID card */}
          <div className="relative overflow-hidden rounded-[26px] border-1.5 border-ink bg-cream shadow-hard">
            <div className="relative bg-ink px-6 py-5 text-paper">
              <div className="absolute inset-0 halftone opacity-[0.18]" />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-1.5 border-paper/60 bg-lime text-ink">
                    <div className="absolute inset-0 halftone opacity-25" />
                    <span className="relative font-display text-2xl font-extrabold">魏</span>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.24em] text-lime">PERSONAL ID / 2026</p>
                    <h1 className="mt-1 text-[28px] font-extrabold leading-none">晓叶</h1>
                    <p className="mt-1 font-mono text-[9.5px] tracking-[0.18em] text-paper/45">WEI YUNXIAO · AI FULLSTACK</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-paper/50">状态</p>
                  <p className="mt-0.5 flex items-center justify-end gap-1.5 text-[12px] font-medium text-lime">
                    <span className="h-1.5 w-1.5 animate-blink rounded-full bg-lime" /> 可实习
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-5 px-6 py-5 sm:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="kicker">SELF DESCRIPTION</p>
                {profile.bio.map((b) => (
                  <p key={b} className="mt-2.5 text-[13px] leading-[1.9] text-ink-soft">
                    {b}
                  </p>
                ))}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {profile.keywords.map((k) => (
                    <span key={k} className="rounded-full border border-ink/15 bg-paper px-2.5 py-1 font-mono text-[9.5px] text-ink/55">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-2 border-t border-dashed border-ink/15 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                {[
                  { icon: MapPin, k: '坐标', v: '西安 · 陕西科技大学' },
                  { icon: User, k: '身份', v: '信息与通信工程 · 研二' },
                  { icon: Target, k: '方向', v: 'AI 全栈 / 智能体开发' },
                  { icon: Coffee, k: '副业', v: 'AI 内容创作者 · 2.3w 粉' },
                ].map((row) => (
                  <div key={row.k} className="flex items-start gap-2">
                    <row.icon size={12} className="mt-0.5 shrink-0 text-ink/35" />
                    <div>
                      <p className="font-mono text-[9.5px] tracking-widest text-ink/35">{row.k}</p>
                      <p className="text-[11.5px] text-ink/70">{row.v}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-1.5 pt-1">
                  <a href={`mailto:${profile.email}`} className="flex h-7 items-center gap-1 rounded-full border border-ink/20 px-2 text-[10px] transition hover:bg-lime">
                    <Mail size={10} /> 邮件
                  </a>
                  <span className="flex h-7 items-center gap-1 rounded-full border border-ink/20 px-2 font-mono text-[10px] text-ink/60">
                    <MessageCircle size={10} /> {profile.wechat}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* four cards */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {aboutCards.map((c, i) => {
              const CardIcon = [User, Sparkles, Target, Coffee][i % 4]
              return (
                <button
                  key={c.key}
                  onClick={() => setOpenKey(c.key)}
                  className="group relative overflow-hidden rounded-2xl border-1.5 border-ink bg-cream p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-hard"
                >
                  <span className="absolute right-3 top-3 font-mono text-[9px] text-ink/25">0{i + 1}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border-1.5 border-ink bg-lime/60">
                    <CardIcon size={14} />
                  </span>
                  <h3 className="mt-3 text-[16px] font-extrabold">{c.title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink/50">{c.lines[0]}</p>
                  <span className="mt-3 flex items-center gap-1 font-mono text-[9px] tracking-widest text-ink/35 group-hover:text-ink">
                    展开 <ArrowUpRight size={11} />
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 rounded-2xl border-1.5 border-ink bg-lime/40 p-5">
            <p className="kicker">WHAT I WANT NEXT</p>
            <h3 className="mt-2 text-[18px] font-extrabold leading-snug">
              想在 2026 年春天，
              <br />
              进一个有真实用户的 AI 团队。
            </h3>
            <p className="mt-2 max-w-lg text-[12px] leading-relaxed text-ink/65">
              做 Agent 的工程化、评测体系或者全栈产品都可以。希望团队会看数据，也愿意为了一个 badcase 停下来把它修干净。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`mailto:${profile.email}`} className="btn-ink !py-2 !text-[12px]">
                发简历给你 <ArrowUpRight size={13} />
              </a>
              <Link to="/me/media" className="btn !py-2 !text-[12px]">
                看看我的内容
              </Link>
            </div>
          </div>
        </div>

        <aside className="space-y-3 lg:col-span-4">
          <div className="rounded-2xl border-1.5 border-ink bg-cream p-5">
            <p className="kicker">SIX SKILL SETS</p>
            <div className="mt-3 space-y-2.5">
              {skillGroups.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="w-[76px] shrink-0 text-[11px] font-medium">{s.title}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full rounded-full bg-ink" style={{ width: `${s.level}%` }} />
                  </div>
                  <span className="w-6 text-right font-mono text-[9px] text-ink/35">{s.level}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border-1.5 border-ink bg-ink p-5 text-paper">
            <p className="font-mono text-[9px] tracking-[0.2em] text-lime">SELF MEDIA</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {mediaStats.map((s) => (
                <div key={s.label} className="rounded-xl border border-paper/15 px-2.5 py-2">
                  <p className="font-display text-[17px] font-extrabold leading-none">{s.value}</p>
                  <p className="mt-1 font-mono text-[9px] text-paper/40">{s.label}</p>
                </div>
              ))}
            </div>
            <Link to="/me/media" className="mt-3 flex items-center justify-between rounded-xl border border-paper/20 px-3 py-2 text-[11px] transition hover:border-lime hover:text-lime">
              查看矩阵详情 <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="rounded-2xl border-1.5 border-ink bg-cream p-5">
            <p className="kicker">NOW</p>
            <ul className="mt-2.5 space-y-2 text-[11.5px] text-ink/60">
              {[
                '在把 RSI 自进化写成可回滚的闭环',
                '重读《Building LLM Apps》第 3 章',
                '学 Three.js 的骨骼动画',
                '每周骑行 40km',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rotate-45 bg-lime" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border-1.5 border-ink bg-rose/40 p-5">
            <Heart size={16} />
            <p className="mt-2 font-hand text-[21px] leading-snug text-ink/75">「先做人，再做产品，最后才是做 AI。」</p>
            <p className="mt-2 font-mono text-[9px] text-ink/40">— 我写在笔记本第一页的话</p>
          </div>
        </aside>
      </div>

      <Modal open={!!active} onClose={() => setOpenKey(null)} title={active?.title} kicker="ABOUT ME · DETAIL">
        <div className="px-6 py-5">
          <div className="space-y-2.5">
            {active?.lines.map((l) => (
              <p key={l} className="flex gap-2.5 text-[13px] leading-relaxed text-ink/70">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                {l}
              </p>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-dashed border-ink/15 pt-4">
            <a href={`mailto:${profile.email}`} className="btn-ink !py-2 !text-[12px]">
              邮件聊聊
            </a>
          </div>
        </div>
      </Modal>
    </div>
  )
}
