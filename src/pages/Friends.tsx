import { ArrowUpRight, HeartHandshake, Link2, Mail, Sparkles } from 'lucide-react'
import { PageIntro, Sticker } from '@/components/ui/primitives'
import { friends } from '@/data/me'
import { profile } from '@/data/site'

export default function Friends() {
  return (
    <div className="shell">
      <PageIntro
        kicker="05 / ME · FRIENDS"
        title={
          <>
            同频的人
            <br />
            与<span className="marker">他们的站</span>
          </>
        }
        desc="一起打过比赛的、一起改过稿的、在我卡住时给我答案的人。互联网上能遇到这些人，运气很好。"
        note="想交换友链？往下翻有我的站点信息。"
        right={
          <div className="flex flex-wrap gap-2">
            <Sticker rotate={-4} color="#C9F158">
              {friends.length} 个友链
            </Sticker>
            <Sticker rotate={5} color="#BFD8FF">
              持续更新
            </Sticker>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {friends.map((f) => (
          <a
            key={f.id}
            href={f.url}
            className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-1.5 border-ink bg-cream p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-hard"
          >
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full border-1.5 border-ink/10" style={{ background: f.color + '70' }} />
            <div className="relative flex items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-1.5 border-ink font-display text-[15px] font-extrabold"
                style={{ background: f.color }}
              >
                {f.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-extrabold">{f.name}</p>
                <span className="mt-0.5 inline-block rounded-full border border-ink/15 bg-paper px-1.5 py-0.5 font-mono text-[9.5px] text-ink/50">
                  {f.tag}
                </span>
              </div>
              <ArrowUpRight size={14} className="shrink-0 text-ink/25 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
            </div>
            <p className="relative mt-3 flex-1 text-[11.5px] leading-relaxed text-ink/55">{f.desc}</p>
            <p className="relative mt-3 flex items-center gap-1 border-t border-dashed border-ink/12 pt-2 font-mono text-[9px] text-ink/35">
              <Link2 size={9} /> {f.url === '#' ? '链接暂未公开' : f.url}
            </p>
          </a>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border-1.5 border-ink bg-ink p-5 text-paper">
          <div className="flex items-center gap-2">
            <HeartHandshake size={16} className="text-lime" />
            <h2 className="text-[15px] font-extrabold">交换友链</h2>
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-paper/55">
            只要是认真在写东西的个人站都欢迎。不要求流量，但希望你有 3 篇以上原创内容，并且站点不是纯 AI 生成。
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ['站点名称', 'WYX.SPACE'],
              ['一句介绍', '把想法做成能上线的东西'],
              ['地址', 'wyx.space'],
              ['头像 / 图标', '魏（酸性绿底）'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-paper/15 px-2.5 py-2">
                <p className="font-mono text-[9px] tracking-widest text-paper/35">{k}</p>
                <p className="mt-0.5 text-[11px] text-paper/80">{v}</p>
              </div>
            ))}
          </div>
          <a href={`mailto:${profile.email}?subject=友链申请`} className="btn-lime mt-4 !py-2 !text-[12px]">
            <Mail size={13} /> 发邮件申请
          </a>
        </div>

        <div className="rounded-2xl border-1.5 border-ink bg-cream p-5">
          <p className="kicker">MY PRINCIPLE</p>
          <h3 className="mt-1.5 text-[16px] font-extrabold">友链不是流量交换</h3>
          <ul className="mt-3 space-y-2">
            {[
              '只加我真的读过、并且会再读的站',
              '不希望被放进「AI 工具导航」里当填充',
              '失效超过 3 个月会移出列表',
              '每个链接，我都能说出一次真实的交流',
            ].map((t) => (
              <li key={t} className="flex gap-2 text-[11.5px] leading-relaxed text-ink/60">
                <Sparkles size={11} className="mt-0.5 shrink-0 text-coral" /> {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-dashed border-ink/15 pt-3 font-hand text-[19px] text-ink/50">
            「链接是人和人之间的最短路径。」
          </p>
        </div>
      </div>
    </div>
  )
}
