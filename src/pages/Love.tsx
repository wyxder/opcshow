import { CalendarHeart, Coffee, Gift, Heart, MapPin, Music, Plane, Sun } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageIntro, Reveal, Sticker } from '@/components/ui/primitives'
import { loveMeta, loveRecords, loveStats } from '@/data/life'
import { cn, daysBetween } from '@/lib/utils'

const iconMap = {
  heart: Heart,
  coffee: Coffee,
  plane: Plane,
  gift: Gift,
  sun: Sun,
  music: Music,
}

const types = ['全部', '起点', '日常', '旅行', '惊喜', '成长'] as const

export default function Love() {
  const [type, setType] = useState<string>('全部')
  const days = daysBetween(loveMeta.startDate)

  const list = useMemo(() => (type === '全部' ? loveRecords : loveRecords.filter((r) => r.type === type)), [type])

  const nextAnniversary = useMemo(() => {
    const start = new Date(loveMeta.startDate)
    const now = new Date()
    const next = new Date(now.getFullYear(), start.getMonth(), start.getDate())
    if (next.getTime() < now.getTime()) next.setFullYear(now.getFullYear() + 1)
    return { date: next, left: Math.ceil((next.getTime() - now.getTime()) / 86400000) }
  }, [])

  return (
    <div className="shell">
      <PageIntro
        kicker="04 / LIFE · LOVE LOG"
        title={
          <>
            异地第{' '}
            <br />
            <span className="marker">{Math.floor(days / 365) + 1} 年</span>
          </>
        }
        desc={loveMeta.motto}
        note="她叫小羊，是这篇页面的第一位读者，也是最严格的编辑。"
        right={
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <Sticker rotate={-5} color="#FFB3C7">
              {loveMeta.city}
            </Sticker>
            <div className="rounded-2xl border-1.5 border-ink bg-cream px-5 py-4 text-center shadow-hard">
              <p className="font-mono text-[9px] tracking-[0.2em] text-ink/40">TOGETHER</p>
              <p className="font-display text-[38px] font-extrabold leading-none">{days.toLocaleString()}</p>
              <p className="mt-1 text-[11px] text-ink/50">天 · since 2023.05.20</p>
            </div>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {loveStats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.05}>
            <div className={cn('rounded-2xl border-1.5 border-ink p-4', i === 0 ? 'bg-ink text-paper' : 'bg-cream')}>
              <p className={cn('font-display text-[26px] font-extrabold leading-none', i === 0 ? 'text-lime' : 'text-ink')}>
                {i === 0 ? days.toLocaleString() : s.value}
                <span className="ml-1 text-[11px] font-medium text-ink/40">{s.unit}</span>
              </p>
              <p className={cn('mt-1.5 text-[11px]', i === 0 ? 'text-paper/60' : 'text-ink/50')}>{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_290px]">
        <div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  'rounded-full border-1.5 px-3 py-1.5 text-[11px] transition',
                  type === t ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-cream text-ink/55 hover:border-ink/50',
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative pl-6 sm:pl-8">
            <div className="absolute bottom-3 left-[9px] top-3 w-px bg-ink/15 sm:left-[13px]" />
            <div className="space-y-4">
              {list.map((r, i) => {
                const Icon = iconMap[r.icon]
                return (
                  <Reveal key={r.id} delay={i * 0.04}>
                    <div className="relative">
                      <span
                        className="absolute -left-6 top-4 flex h-[19px] w-[19px] items-center justify-center rounded-full border-1.5 border-ink sm:-left-8 sm:h-[27px] sm:w-[27px]"
                        style={{ background: r.color }}
                      >
                        <Icon size={10} />
                      </span>
                      <div className="group rounded-2xl border-1.5 border-ink bg-cream p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-hard-sm sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full px-2 py-0.5 font-mono text-[9px]" style={{ background: r.color + '80' }}>
                              {r.type}
                            </span>
                            <span className="font-mono text-[10px] text-ink/40">{r.date}</span>
                          </div>
                          <span className="flex items-center gap-1 font-mono text-[9px] text-ink/35">
                            <MapPin size={9} /> {r.place}
                          </span>
                        </div>
                        <h3 className="mt-2 text-[14.5px] font-bold leading-snug">{r.title}</h3>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-ink/55">{r.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border-1.5 border-ink bg-lime p-5">
            <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-ink/50">
              <CalendarHeart size={11} /> NEXT ANNIVERSARY
            </p>
            <p className="mt-2 font-display text-[34px] font-extrabold leading-none">
              {nextAnniversary.left}
              <span className="ml-1 text-[12px] font-medium text-ink/50">天后</span>
            </p>
            <p className="mt-1.5 text-[11px] text-ink/60">
              {nextAnniversary.date.getMonth() + 1} 月 {nextAnniversary.date.getDate()} 日 · 第 {Math.floor(days / 365) + 1} 年
            </p>
            <p className="mt-3 border-t border-ink/20 pt-3 font-hand text-[18px] leading-snug text-ink/70">
              「下次见面，我请她吃两碗面，因为上次她没吃过瘾。」
            </p>
          </div>

          <div className="rounded-2xl border-1.5 border-ink bg-cream p-5">
            <p className="font-mono text-[9px] tracking-[0.16em] text-ink/35">THE RULES</p>
            <h3 className="mt-1.5 text-[14px] font-extrabold">我们的三条约定</h3>
            <ul className="mt-2.5 space-y-2">
              {['不吵隔夜架', '每天至少一次语音', '吵架不许提分手'].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[11.5px] text-ink/60">
                  <Heart size={10} className="text-coral" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-2xl border-1.5 border-ink bg-cream p-4">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-rose via-coral to-lime" />
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-1.5 border-ink bg-rose/60 font-display text-lg font-extrabold">羊</div>
              <div>
                <p className="text-[12.5px] font-bold">小羊</p>
                <p className="font-mono text-[9px] text-ink/40">最严格的读者 · 摄影提供</p>
              </div>
            </div>
            <p className="mt-3 font-hand text-[19px] leading-snug text-ink/70">「你写代码的时候，像一个在搭积木的小孩。」</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
