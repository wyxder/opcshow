import { ArrowUpRight, BookOpen, Download, Eye, MessageSquare, RefreshCw, Sparkles, TrendingUp, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { realtime, sourceShare, topArticles, traffic } from '@/admin/data'
import type { SectionKey } from '@/admin/AdminShell'
import {
  AButton,
  AdminModal,
  Badge,
  Donut,
  Legend,
  Meter,
  PageTitle,
  Panel,
  Segmented,
  TrendChart,
} from '@/admin/ui'
import { cn } from '@/lib/utils'

const kpiIcons = [Eye, Users, Sparkles, MessageSquare, BookOpen, Download]

export default function OverviewPage({
  show,
  go,
}: {
  show: (msg: string) => void
  go: (section: SectionKey, tab?: string) => void
}) {
  const [win, setWin] = useState<'7d' | '30d'>('7d')
  const [report, setReport] = useState(false)
  const data = traffic[win]

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Dashboard"
        title="首页总览"
        desc="数据来自埋点与日聚合表；实时卡片读当天聚合，趋势图为 7 / 30 天窗口。"
        right={
          <>
            <Segmented
              value={win}
              onChange={setWin}
              options={[
                { key: '7d', label: '近 7 天' },
                { key: '30d', label: '近 30 天' },
              ]}
            />
            <AButton icon={<RefreshCw size={13} />} onClick={() => show('数据已刷新 · 刚刚')}>
              刷新
            </AButton>
            <AButton variant="dark" icon={<Sparkles size={13} />} onClick={() => setReport(true)}>
              AI 周报
            </AButton>
          </>
        }
      />

      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {data.kpis.map((k, i) => {
          const Icon = kpiIcons[i]
          const flat = k.delta === '0%'
          return (
            <div
              key={k.label}
              className={cn(
                'rounded-[18px] border-1.5 border-ink px-3.5 py-3 shadow-hard-sm transition hover:-translate-y-0.5 hover:shadow-hard-sm',
                i === 0 ? 'bg-lime' : 'bg-cream',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={cn('text-[10.5px]', i === 0 ? 'text-ink/70' : 'text-admin-muted')}>{k.label}</p>
                <Icon size={13} className={cn('mt-0.5 shrink-0', i === 0 ? 'text-admin-muted' : 'text-admin-muted')} strokeWidth={1.7} />
              </div>
              <p className="mt-2 font-display text-[27px] font-extrabold leading-none tracking-tight text-ink">{k.value}</p>
              <p className="mt-2 flex items-center gap-1 text-[10px]">
                <span className={cn('flex items-center gap-0.5 font-mono', flat ? 'text-admin-muted' : 'text-admin-teal')}>
                  {flat ? '—' : <TrendingUp size={9} />} {k.delta}
                </span>
                <span className="text-admin-muted">{k.note}</span>
              </p>
            </div>
          )
        })}
      </div>

      {/* trend + sources */}
      <div className="grid gap-3 xl:grid-cols-[1.62fr_1fr]">
        <Panel
          kicker="Traffic trend"
          title="访问 / 访客 / AI 会话"
          desc={data.range}
          right={
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 text-[10px] text-admin-muted">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-coral" /> PV
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue" /> UV
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-lime" /> AI 会话
                </span>
              </div>
              <span className="rounded-full border border-ink/15 px-2.5 py-1 font-mono text-[9.5px] text-admin-muted">窗口 {data.label}</span>
            </div>
          }
          bodyClassName="pr-2 sm:pr-3"
        >
          <TrendChart
            labels={data.labels}
            series={[
              { name: 'pv', color: 'rgb(var(--c-coral))', values: data.pv },
              { name: 'uv', color: 'rgb(var(--c-blue))', values: data.uv },
            ]}
            bars={{ values: data.ai, color: 'rgb(var(--c-lime))' }}
            height={214}
            labelStep={win === '7d' ? 1 : 5}
          />
        </Panel>

        <Panel kicker="Traffic sources" title="来源渠道占比" desc="按会话首次来源归因">
          <div className="flex flex-col items-center gap-4 sm:flex-row xl:flex-col 2xl:flex-row">
            <Donut data={sourceShare} centerValue={win === '7d' ? '1.5k' : '5.6k'} centerLabel="VISITS" size={148} thickness={17} />
            <Legend
              className="w-full flex-1"
              data={sourceShare.map((s) => ({ label: s.label, value: `${s.value}%`, color: s.color }))}
            />
          </div>
          <p className="mt-3 border-t border-dashed border-ink/15 pt-2.5 text-[10px] text-admin-muted">
            公众号带来的访问环比 <span className="text-admin-teal">+6.2%</span>，小红书收藏率最高。
          </p>
        </Panel>
      </div>

      {/* top articles + realtime */}
      <div className="grid gap-3 xl:grid-cols-[1.62fr_1fr]">
        <Panel
          kicker="Top articles"
          title="阅读榜（按累计浏览）"
          right={
            <button onClick={() => go('content', 'articles')} className="flex items-center gap-1 text-[10.5px] text-admin-muted transition hover:text-admin-ink">
              内容管理 <ArrowUpRight size={11} />
            </button>
          }
          bodyClassName="px-0 pb-1 pt-1"
        >
          <div>
            {topArticles.map((a, i) => (
              <div
                key={a.id}
                className={cn('group flex items-center gap-3 px-4 py-2.5 transition hover:bg-lime/20 sm:px-5', i !== 0 && 'border-t border-ink/10')}
              >
                <span className="w-5 shrink-0 font-mono text-[10px] text-admin-muted">{a.rank}</span>
                <div className="min-w-0 flex-1">
                  <Link to={`/learn/${a.id}`} className="block truncate text-[12px] font-medium text-admin-ink hover:text-admin-danger">
                    {a.title}
                  </Link>
                  <div className="mt-1 flex items-center gap-1.5">
                    {a.tags.map((t) => (
                      <span key={t} className="rounded border border-ink/15 px-1.5 py-px text-[9px] text-admin-muted">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[10.5px] text-admin-muted">{a.views.toLocaleString()}</span>
                <div className="w-14 shrink-0">
                  <Meter value={a.ratio} color={i === 0 ? 'rgb(var(--c-coral))' : 'rgb(var(--c-blue))'} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel dark kicker="Realtime" title="实时" desc="每 60 秒更新一次">
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: '在线', value: realtime.online, icon: Users },
              { label: '今日 PV', value: realtime.pv, icon: Eye },
              { label: '今日 UV', value: realtime.uv, icon: Users },
              { label: '今日 AI', value: realtime.ai, icon: Sparkles },
            ].map((r) => (
              <div key={r.label} className="rounded-xl border border-paper/15 bg-paper/5 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[10px] text-paper/70">
                  <r.icon size={11} /> {r.label}
                </p>
                <p className="mt-1.5 font-display text-[20px] font-extrabold leading-none tracking-tight text-paper">{r.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-paper/15 pt-2.5 text-[10px] text-paper/70">
            <span>运行 {realtime.uptime}</span>
            <span>累计 PV {realtime.totalPv}</span>
          </div>
        </Panel>
      </div>

      <AdminModal
        open={report}
        onClose={() => setReport(false)}
        title="AI 周报 · 2026.10.23 — 2026.10.29"
        desc="由站点数据 + 内容表现自动生成，可直接发到邮箱。"
        width="max-w-xl"
        footer={
          <>
            <AButton onClick={() => setReport(false)}>关闭</AButton>
            <AButton
              variant="primary"
              onClick={() => {
                setReport(false)
                show('周报已发送到 wyxcode@qq.com')
              }}
            >
              发送到邮箱
            </AButton>
          </>
        }
      >
        <div className="space-y-3 text-[12px] leading-relaxed text-admin-ink/85">
          <div className="grid grid-cols-3 gap-2">
            {[
              ['PV', '1.5k', '+4.8%'],
              ['UV', '930', '+19.2%'],
              ['AI 会话', '239', '+0.4%'],
            ].map(([l, v, d]) => (
              <div key={l} className="rounded-lg border border-ink/15 bg-paper px-2.5 py-2">
                <p className="text-[9.5px] text-admin-muted">{l}</p>
                <p className="mt-0.5 font-display text-[16px] font-bold leading-none">{v}</p>
                <p className="mt-1 font-mono text-[9px] text-admin-teal">{d}</p>
              </div>
            ))}
          </div>
          <p>
            本周 UV 涨幅明显高于 PV，说明「来的人变多了」而不是「老访客刷得更勤」。增长主要来自公众号与小红书的两篇 RAG 长文，阅读时长中位数提升到 2 分 40 秒。
          </p>
          <div>
            <p className="mb-1.5 font-medium">三条建议</p>
            <ul className="space-y-1.5 text-[11.5px] text-admin-muted">
              <li>· 把「RAG 工程化」系列在公众号做一次合集，承接新增访客。</li>
              <li>· 简历下载页转化率 2%，建议在阅读页底部补一个下载入口。</li>
              <li>· AI 助手 3 条未命中问题已沉淀，补进站点知识库可减少重复问答。</li>
            </ul>
          </div>
          <Badge tone="amber">演示数据 · 生成于 2026-10-30 09:00</Badge>
        </div>
      </AdminModal>
    </div>
  )
}
