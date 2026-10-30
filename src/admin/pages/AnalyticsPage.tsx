import { ArrowUpRight, Download, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  aiSessions,
  deviceShare,
  funnels,
  hourly,
  pageRank,
  readDepth,
  regionShare,
  traffic,
} from '@/admin/data'
import {
  AButton,
  Badge,
  Donut,
  EmptyState,
  Legend,
  Meter,
  MiniBars,
  PageTitle,
  Panel,
  Segmented,
  TableHead,
  TrendChart,
} from '@/admin/ui'
import { clearLocalSamples, getSummary, type AnalyticsSummary } from '@/services/analytics'

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

export default function AnalyticsPage({ show }: { show: (m: string) => void }) {
  const [win, setWin] = useState<'7d' | '30d'>('30d')
  const data = traffic[win]
  const pv = sum(data.pv)
  const uv = sum(data.uv)
  /** fx.md B7：未接服务端时的真实可用数据 —— 本机无 Cookie 浏览样本 */
  const [local, setLocal] = useState<AnalyticsSummary | null>(null)

  useEffect(() => {
    let alive = true
    getSummary().then((s) => alive && setLocal(s))
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Data board"
        title="数据看板"
        desc="埋点明细 + 日聚合。PV/UV 为去重后的会话口径，AI 会话按消息轮次计数。"
        right={
          <>
            <Badge tone="amber">看板数字为预置样本</Badge>
            <Segmented
              value={win}
              onChange={setWin}
              options={[
                { key: '7d', label: '近 7 天' },
                { key: '30d', label: '近 30 天' },
              ]}
            />
            <AButton icon={<RefreshCw size={13} />} onClick={() => show('聚合任务已重跑')}>
              重跑聚合
            </AButton>
            <AButton variant="dark" icon={<Download size={13} />} onClick={() => show('CSV 已导出（演示）')}>
              导出
            </AButton>
          </>
        }
      />

      <Panel
        kicker="Real data"
        title="本机浏览样本"
        desc={local?.note}
        right={
          <div className="flex items-center gap-2">
            <Badge tone={local?.source === 'server' ? 'teal' : 'neutral'}>{local?.source === 'server' ? '服务端埋点' : '本机统计'}</Badge>
            <AButton size="sm" onClick={() => { clearLocalSamples(); getSummary().then(setLocal); show('已清空本机样本') }}>
              清空样本
            </AButton>
          </div>
        }
      >
        {!local || local.pv === 0 ? (
          <EmptyState title="本机还没有浏览样本" desc="在前台多翻几页，这里就会出现真实记录" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <div>
              <p className="text-[9.5px] text-admin-muted">PV / UV（本机）</p>
              <p className="mt-1 font-display text-[24px] font-extrabold leading-none">
                {local.pv}
                <span className="ml-1 text-[12px] font-medium text-admin-muted">/ {local.uv}</span>
              </p>
              {local.since && <p className="mt-1 font-mono text-[9px] text-admin-muted">自 {local.since}</p>}
            </div>
            <div className="space-y-1.5">
              {local.topPages.map((p) => (
                <div key={p.path} className="flex items-center gap-2 text-[11px]">
                  <span className="w-40 shrink-0 truncate font-mono text-[10px] text-admin-muted">{p.path}</span>
                  <Meter value={(p.views / local.pv) * 100} className="flex-1" />
                  <span className="w-8 shrink-0 text-right font-mono text-[10px]">{p.views}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="mt-3 font-mono text-[9px] text-admin-muted">
          接入点：POST {'{VITE_API_BASE}'}/api/track → 聚合后替掉本页的预置样本（services/analytics.ts）
        </p>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: '累计 PV', value: pv.toLocaleString(), note: `日均 ${Math.round(pv / data.labels.length)}`, delta: '+12.6%' },
          { label: '累计 UV', value: uv.toLocaleString(), note: `去重后访客`, delta: '+8.4%' },
          { label: '平均停留', value: '2m 18s', note: '较上周期 +14s', delta: '+11.4%' },
          { label: '跳出率', value: '41.2%', note: '较上周期 -2.6%', delta: '优化' },
        ].map((k) => (
          <div key={k.label} className="rounded-[18px] border-1.5 border-ink bg-cream px-3.5 py-3 shadow-hard-sm">
            <p className="text-[10.5px] text-admin-muted">{k.label}</p>
            <p className="mt-2 font-display text-[25px] font-extrabold leading-none tracking-tight">{k.value}</p>
            <p className="mt-2 flex items-center gap-1.5 text-[10px]">
              <span className="font-mono text-admin-teal">{k.delta}</span>
              <span className="text-admin-muted">{k.note}</span>
            </p>
          </div>
        ))}
      </div>

      <Panel
        kicker="Visits"
        title={`访问趋势 · ${data.label}`}
        desc={data.range}
        right={
          <div className="flex items-center gap-2.5 text-[10px] text-admin-muted">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-coral" /> PV
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue" /> UV
            </span>
          </div>
        }
      >
        <TrendChart
          labels={data.labels}
          series={[
            { name: 'pv', color: 'rgb(var(--c-coral))', values: data.pv },
            { name: 'uv', color: 'rgb(var(--c-blue))', values: data.uv },
          ]}
          bars={{ values: data.ai, color: 'rgb(var(--c-lime))' }}
          height={230}
          labelStep={win === '7d' ? 1 : 5}
        />
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
        <Panel kicker="Pages" title="页面排行" desc="按 PV 排序，停留时间为中位数" flush>
          <div className="overflow-x-auto no-scrollbar">
            <div className="admin-zebra min-w-[620px]">
              <TableHead cols={['页面', 'PV', 'UV', '停留', '跳出', '趋势']} template="minmax(0,1fr) 70px 70px 76px 64px 84px" />
              {pageRank.map((p, i) => (
                <div
                  key={p.path}
                  className="grid grid-cols-[minmax(0,1fr)_70px_70px_76px_64px_84px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11.5px] last:border-0 hover:bg-lime/20"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-admin-ink">{p.title}</p>
                    <p className="mt-0.5 font-mono text-[9.5px] text-admin-muted">{p.path}</p>
                  </div>
                  <span className="font-mono text-[10.5px]">{p.pv.toLocaleString()}</span>
                  <span className="font-mono text-[10.5px] text-admin-muted">{p.uv.toLocaleString()}</span>
                  <span className="font-mono text-[10.5px] text-admin-muted">{p.stay}</span>
                  <span className="font-mono text-[10.5px] text-admin-muted">{p.bounce}</span>
                  <div className="flex justify-end">
                    <MiniBars data={[4, 6, 5, 8, 7, 9, i === 0 ? 11 : 6]} height={20} color={i === 0 ? 'rgb(var(--c-coral))' : 'rgb(var(--c-blue))'} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel kicker="Devices" title="设备分布">
            <div className="flex items-center gap-4">
              <Donut data={deviceShare} size={112} thickness={14} centerValue="61%" centerLabel="桌面" />
              <Legend
                className="flex-1"
                data={deviceShare.map((d) => ({ label: d.label, value: `${d.value}%`, color: d.color }))}
              />
            </div>
          </Panel>

          <Panel kicker="Read depth" title="阅读深度">
            <div className="space-y-2">
              {readDepth.map((r) => (
                <div key={r.label}>
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-admin-muted">{r.label}</span>
                    <span className="font-mono">{r.value}%</span>
                  </div>
                  <Meter value={r.value} color={r.value > 30 ? 'rgb(var(--c-coral))' : 'rgb(var(--c-amber))'} className="mt-1" />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel kicker="Funnel" title="访问转化漏斗" desc="从进站到下载的完整链路">
          <div className="space-y-2.5">
            {funnels.map((f) => (
              <div key={f.label}>
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="text-admin-muted">{f.label}</span>
                  <span className="font-mono">
                    {f.value.toLocaleString()} · {f.ratio}%
                  </span>
                </div>
                <Meter value={f.ratio} color={f.ratio > 50 ? 'rgb(var(--c-blue))' : f.ratio > 10 ? 'rgb(var(--c-amber))' : 'rgb(var(--c-coral))'} className="mt-1 h-2" />
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-dashed border-ink/15 pt-2 text-[10px] text-admin-muted">
            阅读过半 → 互动 是最大流失点（26% → 6%）。
          </p>
        </Panel>

        <Panel kicker="Regions" title="访客地域" desc="按 IP 归属地聚合">
          <div className="space-y-2">
            {regionShare.map((r) => (
              <div key={r.label} className="flex items-center gap-2.5">
                <span className="w-10 shrink-0 text-[10.5px] text-admin-muted">{r.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/12">
                  <div className="h-full rounded-full bg-blue/70" style={{ width: `${(r.value / 28) * 100}%` }} />
                </div>
                <span className="w-7 text-right font-mono text-[10px]">{r.value}%</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel kicker="AI sessions" title="AI 会话构成" desc="站点助手的提问类型">
          <div className="flex items-center gap-4">
            <Donut data={aiSessions} size={108} thickness={13} centerValue="239" centerLabel="SESSIONS" />
            <Legend className="flex-1" data={aiSessions.map((a) => ({ label: a.label, value: a.value, color: a.color }))} />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-ink/15 pt-2 text-[10px]">
            <span className="text-admin-muted">今日 0 次会话 · 知识库命中 82%</span>
            <Badge tone="teal">健康</Badge>
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <Panel kicker="Hourly" title="今日访问分布（小时）" desc="横轴 0—23 时">
          <MiniBars data={hourly} height={86} color="rgb(var(--c-coral))" />
          <div className="mt-2 flex justify-between font-mono text-[9px] text-admin-muted">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </Panel>

        <Panel kicker="Realtime" title="实时快照" desc="每 60 秒轮询">
          <div className="grid grid-cols-2 gap-2.5">
            {[
              ['在线', '0'],
              ['今日 PV', '75'],
              ['今日 UV', '75'],
              ['今日 AI', '0'],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-paper px-3 py-2">
                <p className="text-[10px] text-admin-muted">{l}</p>
                <p className="mt-1 text-[17px] font-bold leading-none">{v}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => show('已跳转到日志检索（演示）')}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-ink/15 px-3 py-2 text-[11px] text-admin-muted transition hover:text-admin-ink"
          >
            查看原始访问日志 <ArrowUpRight size={11} />
          </button>
        </Panel>
      </div>
    </div>
  )
}
