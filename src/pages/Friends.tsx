import { ArrowUpRight, HeartHandshake, Link2, Mail, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { PageHead } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/Toast'
import { friends } from '@/data/me'
import { profile } from '@/data/site'
import { useSeo } from '@/lib/seo'
import { serverConfig } from '@/services/config'
import { submitFriendLink } from '@/services/settings'

export default function Friends() {
  const { show, node } = useToast()
  const [form, setForm] = useState({ name: '', url: '', desc: '' })
  const [busy, setBusy] = useState(false)

  const apply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.url.trim()) return show('站点名和地址都要填')
    if (!serverConfig.enabled) return show('未接服务端：请用邮件申请')
    setBusy(true)
    try {
      await submitFriendLink({ name: form.name.trim(), url: form.url.trim(), desc: form.desc.trim() })
      setForm({ name: '', url: '', desc: '' })
      show('已提交，审核通过后会出现在这里')
    } catch (err) {
      show(`提交失败：${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  useSeo({
    title: '友链 · 晓叶',
    description: '一起打过比赛的、一起改过稿的、在我卡住时给我答案的人。',
    path: '/me/friends',
  })

  return (
    <div className="shell">
      {node}
      <PageHead
        kicker="05 / ME · FRIENDS"
        title="同频的人与他们的站"
        right={<span className="font-mono text-[9.5px] text-ink/45">{friends.length} 个友链 · 持续更新</span>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {friends.map((f) => {
          const Tag = f.url ? 'a' : 'div'
          return (
            <Tag
              key={f.id}
              {...(f.url
                ? { href: f.url, target: '_blank', rel: 'noopener noreferrer' }
                : { 'aria-label': `${f.name}（链接暂未公开）` })}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-1.5 border-ink bg-cream p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-hard"
            >
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full border-1.5 border-ink/10" style={{ background: `color-mix(in srgb, ${f.color} 44%, transparent)` }} />
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
                <Link2 size={9} /> {f.url ?? '链接暂未公开'}
              </p>
            </Tag>
          )
        })}
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

          {/* BE-14：服务端在线时可直接提交，进 pending 等审核 */}
          <form onSubmit={apply} className="mt-4 space-y-2 border-t border-paper/15 pt-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="站点名称"
                className="rounded-lg border border-paper/20 bg-paper/5 px-2.5 py-2 text-[11px] text-paper placeholder:text-paper/30 outline-none focus:border-lime"
              />
              <input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
                className="rounded-lg border border-paper/20 bg-paper/5 px-2.5 py-2 text-[11px] text-paper placeholder:text-paper/30 outline-none focus:border-lime"
              />
            </div>
            <input
              value={form.desc}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
              placeholder="一句介绍（可选）"
              className="w-full rounded-lg border border-paper/20 bg-paper/5 px-2.5 py-2 text-[11px] text-paper placeholder:text-paper/30 outline-none focus:border-lime"
            />
            <button
              type="submit"
              disabled={busy || !serverConfig.enabled}
              className="w-full rounded-lg border border-lime/50 bg-lime/15 py-2 text-[11.5px] font-semibold text-lime transition hover:bg-lime/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? '提交中…' : serverConfig.enabled ? '提交友链申请（进审核队列）' : '未接服务端：请用上方邮件申请'}
            </button>
          </form>
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
