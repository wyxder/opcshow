import { ChevronDown, ChevronUp, Download, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  aiSessions as demoAiSessions,
  deviceShare as demoDeviceShare,
  funnels as demoFunnels,
  hourly as demoHourly,
  pageRank as demoPageRank,
  readDepth as demoReadDepth,
  realtime as demoRealtime,
  sourceShare as demoSourceShare,
  traffic,
} from '@/admin/data'
import {
  AButton,
  Badge,
  Donut,
  EmptyState,
  Field,
  Legend,
  LoadState,
  Meter,
  MiniBars,
  PageTitle,
  Panel,
  ReadOnlyNotice,
  SearchBox,
  Segmented,
  Select,
  TableHead,
  TrendChart,
} from '@/admin/ui'
import { clearLocalSamples, getSummary, type AnalyticsSummary } from '@/services/analytics'
import { serverConfig } from '@/services/config'
import {
  exportAnalyticsCsv,
  getAnalyticsBreakdown,
  getAnalyticsLogs,
  getRealtime,
  type AnalyticsBreakdown,
  type AnalyticsLogPage,
  type RealtimeStats,
} from '@/services/adminx'

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err))

const PALETTE = [
  'rgb(var(--c-coral))',
  'rgb(var(--c-amber))',
  'rgb(var(--c-blue))',
  'rgb(var(--c-grape))',
  'rgb(var(--c-rose))',
  'rgb(var(--c-lime))',
]
const colorAt = (i: number) => PALETTE[i % PALETTE.length]

const LOG_LABELS: Record<string, string> = {
  ts: '时间',
  time: '时间',
  createdAt: '时间',
  day: '日期',
  kind: '类型',
  path: '页面',
  referrer: '来源',
  sessionHash: '会话',
  ip: 'IP',
  ua: 'UA',
  stayMs: '停留(ms)',
  raw: '原始',
}

type DonutSlice = { label: string; value: number; color: string }
type FunnelRow = { label: string; value: number; ratio: number }
type PageRow = { path: string; title: string; sub: string; pv: number; uv: number | null; stay: string; bounce: string }

/** 服务端漏斗只有 value，按首步换算成百分比；演示数据同样过一遍，避免两套口径 */
const funnelRowsFrom = (items: { label: string; value: number }[]): FunnelRow[] => {
  const base = items[0]?.value || 1
  return items.map((f) => ({ label: f.label, value: f.value, ratio: Math.round((f.value / base) * 100) }))
}

/** 日志是 Record<string, unknown>，逐格安全转字符串，不引入 any */
const cell = (key: string, v: unknown): string => {
  if (v === null || v === undefined) return '—'
  if ((key === 'ts' || key === 'time' || key === 'createdAt') && typeof v === 'number') {
    const d = new Date(v < 1e12 ? v * 1000 : v)
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('zh-CN')
  }
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v) ?? '—'
  } catch {
    return String(v)
  }
}

const fmtTime = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN')
}

const findReason = (bd: AnalyticsBreakdown | null, ...keys: string[]) =>
  bd?.unsupported.find((u) => keys.some((k) => u.key.toLowerCase().includes(k)))?.reason

export default function AnalyticsPage({ show }: { show: (m: string) => void }) {
  const real = serverConfig.enabled
  const [win, setWin] = useState<'7d' | '30d'>('30d')

  /** 本机样本 / 按日聚合：services/analytics.ts（真实接口 + 本机兜底），驱动趋势与 KPI */
  const [local, setLocal] = useState<AnalyticsSummary | null>(null)
  /** 服务端增强聚合：adminx.ts，驱动占比 / 漏斗 / 时段 / 排行 / AI 会话 */
  const [breakdown, setBreakdown] = useState<AnalyticsBreakdown | null>(null)
  /** 实时快照：adminx.ts */
  const [snapshot, setSnapshot] = useState<RealtimeStats | null>(null)

  const [loading, setLoading] = useState(real)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')

  /** 原始访问日志（可折叠） */
  const [logOpen, setLogOpen] = useState(false)
  const [logs, setLogs] = useState<AnalyticsLogPage | null>(null)
  const [logLoading, setLogLoading] = useState(false)
  const [logError, setLogError] = useState('')
  const [q, setQ] = useState('')
  const [kind, setKind] = useState('')
  const [limit, setLimit] = useState(50)

  /** 真的重新请求服务端并刷新：按 window 重拉聚合 + 实时快照 + 日聚合 */
  const refreshAll = useCallback(
    async (window: '7d' | '30d', spinner: boolean): Promise<string | null> => {
      if (spinner) setRefreshing(true)
      setLoadError('')
      try {
        const [rt, bd, summary] = await Promise.all([
          getRealtime(),
          getAnalyticsBreakdown(window),
          getSummary(window),
        ])
        if (rt) setSnapshot(rt) // 实时快照失败时保留上一次
        setBreakdown(bd)
        setLocal(summary)
        if (real && !bd) {
          const msg = '服务端聚合接口（/api/admin/analytics/breakdown）未返回数据'
          setLoadError(msg)
          return msg
        }
        return null
      } catch (err) {
        const msg = `数据加载失败：${errMsg(err)}`
        setLoadError(msg)
        return msg
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [real],
  )

  /** 7 天 / 30 天切换真实请求不同 window */
  useEffect(() => {
    void refreshAll(win, true)
  }, [win, refreshAll])

  /** 实时快照每 60 秒轮询；失败保留上次数据 */
  useEffect(() => {
    if (!real) return
    const timer = window.setInterval(() => {
      void getRealtime().then((rt) => {
        if (rt) setSnapshot(rt)
      })
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [real])

  const loadLogs = useCallback(async (): Promise<{ ok: true; total: number } | { ok: false; error: string }> => {
    if (!real) return { ok: false, error: '未接服务端：原始访问日志需要服务端埋点接口' }
    setLogLoading(true)
    setLogError('')
    try {
      const page = await getAnalyticsLogs({ limit, kind: kind || undefined, q: q.trim() || undefined })
      if (!page) {
        const msg = '日志接口不可用或未返回数据'
        setLogError(msg)
        return { ok: false, error: msg }
      }
      setLogs(page)
      return { ok: true, total: page.total }
    } catch (err) {
      const msg = errMsg(err)
      setLogError(msg)
      return { ok: false, error: msg }
    } finally {
      setLogLoading(false)
    }
  }, [real, limit, kind, q])

  const submitLogs = async () => {
    const res = await loadLogs()
    if (res.ok) show(`已加载 ${res.total} 条访问日志`)
    else show(`日志加载失败：${res.error}`)
  }

  /** 展开时自动拉一次，不弹 toast；失败后不自动重试，交给「刷新」 */
  useEffect(() => {
    if (logOpen && !logs && !logLoading && !logError) void loadLogs()
  }, [logOpen, logs, logLoading, logError, loadLogs])

  /** 真实模式走服务端下载；浏览器下载无法回读结果，先确认日志接口可用再触发 */
  const exportCsv = async () => {
    if (real) {
      try {
        const probe = await getAnalyticsLogs({ limit: 1 })
        if (!probe) return show('导出失败：服务端日志接口不可用，无法确认导出能力')
        exportAnalyticsCsv()
        show('已触发服务端 CSV 下载（/api/admin/analytics/export）')
      } catch (err) {
        show(`导出失败：${errMsg(err)}`)
      }
      return
    }
    // 演示模式兜底：仅导出本机样本
    if (!local || local.topPages.length === 0) return show('还没有本机样本可导出')
    const rows = [['path', 'views'], ...local.topPages.map((p) => [p.path, String(p.views)])]
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `wyx-analytics-local-${win}.csv`
    a.click()
    URL.revokeObjectURL(url)
    show('已导出本机样本 CSV（预置演示值）')
  }

  /** 只清本机 localStorage，不动服务端数据；await 重载成功后才提示 */
  const clearSamples = async () => {
    clearLocalSamples()
    try {
      setLocal(await getSummary(win))
      show('已清空本机样本（仅 localStorage）')
    } catch (err) {
      show(`清空后重载失败：${errMsg(err)}`)
    }
  }

  /** -------------------------------- 视图数据 -------------------------------- */

  const data = traffic[win]
  const realDays = local?.source === 'server' && local.days?.length ? local.days : null
  const pv = realDays ? sum(realDays.map((d) => d.pv)) : sum(data.pv)
  const uv = realDays ? sum(realDays.map((d) => d.uv)) : sum(data.uv)

  const bd = breakdown
  const demoMode = !real
  const emptyHint = loading
    ? '正在加载服务端聚合…'
    : loadError || (real ? '服务端聚合接口不可用，暂无数据' : '未接服务端，暂无真实数据')
  const dimDesc = (realDesc: string) =>
    bd ? realDesc : demoMode ? '预置演示值 · 仅用于预览版式' : '服务端聚合接口不可用'

  const pageRows: PageRow[] = bd
    ? bd.pageRank.map((p) => ({ path: p.path, title: p.path, sub: '服务端仅返回 path / PV', pv: p.pv, uv: null, stay: '—', bounce: '—' }))
    : demoMode
      ? demoPageRank.map((p) => ({ path: p.path, title: p.title, sub: p.path, pv: p.pv, uv: p.uv, stay: p.stay, bounce: p.bounce }))
      : []

  const sourceSlices: DonutSlice[] = bd
    ? bd.sourceShare.map((s, i) => ({ label: s.name, value: s.value, color: colorAt(i) }))
    : demoMode
      ? demoSourceShare.map((s) => ({ label: s.label, value: s.value, color: s.color }))
      : []
  const sourceLegend = bd
    ? bd.sourceShare.map((s, i) => ({ label: s.name, value: `${s.percent}%`, color: colorAt(i) }))
    : demoMode
      ? demoSourceShare.map((s) => ({ label: s.label, value: `${s.value}%`, color: s.color }))
      : []

  const readDepthRows = bd ? bd.readDepth : demoMode ? demoReadDepth : []
  const funnelRows: FunnelRow[] = bd ? funnelRowsFrom(bd.funnels) : demoMode ? funnelRowsFrom(demoFunnels) : []
  const aiSlices: DonutSlice[] = bd
    ? bd.aiSessions.map((a, i) => ({ label: a.name, value: a.value, color: colorAt(i) }))
    : demoMode
      ? demoAiSessions.map((a) => ({ label: a.label, value: a.value, color: a.color }))
      : []
  const aiTotal = sum(aiSlices.map((a) => a.value))
  const hourlyValues: number[] = bd
    ? Array.from({ length: 24 }, (_, h) => bd.hourly.find((x) => x.hour === h)?.value ?? 0)
    : demoMode
      ? demoHourly
      : []
  const hasHourly = bd ? bd.hourly.length > 0 : demoMode

  const funnelNote = (() => {
    if (funnelRows.length < 2) return demoMode ? '预置演示值 · 仅用于预览版式' : '服务端暂无漏斗样本'
    let best = { from: funnelRows[0].label, to: funnelRows[1].label, drop: funnelRows[0].ratio - funnelRows[1].ratio }
    for (let i = 2; i < funnelRows.length; i++) {
      const drop = funnelRows[i - 1].ratio - funnelRows[i].ratio
      if (drop > best.drop) best = { from: funnelRows[i - 1].label, to: funnelRows[i].label, drop }
    }
    return best.drop > 0
      ? `${best.from} → ${best.to} 是最大流失点（-${best.drop}%）· 按服务端埋点聚合`
      : '各步骤无显著流失 · 按服务端埋点聚合'
  })()

  const deviceSlices: DonutSlice[] = bd
    ? bd.deviceShare.map((d, i) => ({ label: d.name, value: d.value, color: colorAt(i) }))
    : demoMode
      ? demoDeviceShare.map((d) => ({ label: d.label, value: d.value, color: d.color }))
      : []
  const deviceLegend = bd
    ? bd.deviceShare.map((d, i) => ({ label: d.name, value: `${d.percent}%`, color: colorAt(i) }))
    : demoMode
      ? demoDeviceShare.map((d) => ({ label: d.label, value: `${d.value}%`, color: d.color }))
      : []

  const deviceReason = findReason(bd, 'device', 'ua', 'useragent') ?? '当前窗口内还没有带设备信息的新样本，启用 UA 类别采集后产生的访问会进入统计'
  const regionReason = findReason(bd, 'region', 'geo', 'location') ?? '埋点未采集 IP 归属地，服务端无法统计访客地域'

  const realtimeRows: [string, string][] = [
    ['在线', snapshot ? String(snapshot.online) : demoMode ? String(demoRealtime.online) : '—'],
    ['今日 PV', snapshot ? String(snapshot.todayPv) : demoMode ? String(demoRealtime.pv) : '—'],
    ['今日 UV', snapshot ? String(snapshot.todayUv) : demoMode ? String(demoRealtime.uv) : '—'],
    ['今日 AI', snapshot ? String(snapshot.todayAi) : demoMode ? String(demoRealtime.ai) : '—'],
  ]

  const kindOptions = useMemo(() => {
    // page / ai 来自 services/analytics.ts 的 kind 与 adminx 的 kind=ai 计数口径；其余从真实日志动态补充
    const set = new Set<string>(['page', 'ai'])
    for (const it of logs?.items ?? []) {
      const k = it.kind
      if (typeof k === 'string' && k) set.add(k)
    }
    return [{ key: '', label: '全部类型' }, ...[...set].map((k) => ({ key: k, label: k }))]
  }, [logs])

  const logKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const it of logs?.items ?? []) for (const k of Object.keys(it)) keys.add(k)
    const preferred = ['ts', 'time', 'createdAt', 'day', 'kind', 'path', 'referrer', 'sessionHash', 'ip', 'ua', 'stayMs']
    const ordered = [...preferred.filter((k) => keys.has(k)), ...[...keys].filter((k) => !preferred.includes(k))].slice(0, 6)
    return ordered.length ? ordered : ['raw']
  }, [logs])
  const logTemplate = logKeys.length > 1 ? `minmax(0,1.4fr) repeat(${logKeys.length - 1}, minmax(0,1fr))` : 'minmax(0,1fr)'
  const logCols = logKeys.map((k) => LOG_LABELS[k] ?? k)

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Data board"
        title="数据看板"
        desc={
          real
            ? '埋点明细 + 日聚合，全部来自服务端真实接口；PV/UV 为去重会话口径，AI 会话按消息轮次计数。'
            : '未接服务端：以下为预置演示值，仅用于预览版式；埋点明细 + 日聚合。'
        }
        right={
          <>
            <Badge tone={bd ? 'teal' : real ? (loading ? 'neutral' : 'red') : 'amber'}>
              {bd ? '服务端真实数据' : real ? (loading ? '正在加载…' : '聚合接口不可用') : '预置演示值 · 未接服务端'}
            </Badge>
            <Segmented
              value={win}
              onChange={setWin}
              options={[
                { key: '7d', label: '近 7 天' },
                { key: '30d', label: '近 30 天' },
              ]}
            />
            <AButton
              icon={<RefreshCw size={13} />}
              disabled={refreshing || loading}
              onClick={async () => {
                const err = await refreshAll(win, true)
                if (err) show(`刷新失败：${err}`)
                else show(`已重新拉取${win === '7d' ? '近 7 天' : '近 30 天'}服务端聚合数据`)
              }}
            >
              {refreshing ? '拉取中…' : '重跑聚合'}
            </AButton>
            <AButton
              variant="dark"
              icon={<Download size={13} />}
              onClick={() => void exportCsv()}
              title={real ? '从服务端导出真实访问日志 CSV' : '导出本机样本 CSV（演示模式）'}
            >
              导出
            </AButton>
          </>
        }
      />

      {!real && (
        <ReadOnlyNotice show>
          未接服务端：图表为预置演示值，「导出」仅导出本机样本，服务端聚合与原始访问日志不可用。
        </ReadOnlyNotice>
      )}
      {real && loadError && !loading && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border-1.5 border-danger/45 bg-danger/10 px-3 py-2 text-[11px] text-ink">
          <Badge tone="red">接口不可用</Badge>
          <span className="flex-1">{loadError}，图表暂不可用；可点击重试。</span>
          <AButton size="sm" icon={<RefreshCw size={11} />} onClick={() => void refreshAll(win, true)}>
            重试
          </AButton>
        </div>
      )}

      <Panel
        kicker="Real data"
        title="本机浏览样本"
        desc={local?.note}
        right={
          <div className="flex items-center gap-2">
            <Badge tone={local?.source === 'server' ? 'teal' : 'neutral'}>{local?.source === 'server' ? '服务端埋点' : '本机统计'}</Badge>
            <AButton size="sm" onClick={() => void clearSamples()}>
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
              {local.source === 'server' && (
                <p className="mt-1 font-mono text-[9px] text-admin-muted">
                  平均停留 {local.avgStaySec ?? 0}s · AI 会话 {local.aiSessions ?? 0}
                </p>
              )}
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
          清空仅作用于本机 localStorage 的浏览样本，不影响服务端埋点数据；本页图表读 {'{VITE_API_BASE}'}/api/admin/analytics/breakdown。
        </p>
        <p className="mt-1 font-mono text-[9px] text-admin-muted">
          接入点：POST {'{VITE_API_BASE}'}{serverConfig.trackPath} → 服务端聚合（services/analytics.ts）
        </p>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: '累计 PV', value: pv.toLocaleString(), note: realDays ? '服务端埋点' : `日均 ${Math.round(pv / data.labels.length)}`, delta: realDays ? '—' : '+12.6%' },
          { label: '累计 UV', value: uv.toLocaleString(), note: realDays ? '会话去重' : '去重后访客', delta: realDays ? '—' : '+8.4%' },
          { label: '平均停留', value: realDays ? `${local?.avgStaySec ?? 0}s` : '2m 18s', note: realDays ? '来自 stayMs' : '较上周期 +14s', delta: realDays ? '—' : '+11.4%' },
          { label: 'AI 会话', value: realDays ? String(local?.aiSessions ?? realDays.reduce((s, d) => s + d.ai, 0)) : '239', note: realDays ? 'kind=ai 计数' : '预置样本', delta: realDays ? '—' : '优化' },
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
        title={`访问趋势 · ${realDays ? win : data.label}`}
        desc={realDays ? '服务端按日聚合（services/analytics.ts）' : demoMode ? '预置演示值 · 未接服务端' : data.range}
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
          labels={realDays ? realDays.map((d) => d.date.slice(5)) : data.labels}
          series={[
            { name: 'pv', color: 'rgb(var(--c-coral))', values: realDays ? realDays.map((d) => d.pv) : data.pv },
            { name: 'uv', color: 'rgb(var(--c-blue))', values: realDays ? realDays.map((d) => d.uv) : data.uv },
          ]}
          bars={{ values: realDays ? realDays.map((d) => d.ai) : data.ai, color: 'rgb(var(--c-lime))' }}
          height={230}
          labelStep={win === '7d' ? 1 : 5}
        />
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
        <Panel
          kicker="Pages"
          title="页面排行"
          desc={dimDesc('服务端按真实埋点聚合（仅 path / PV）')}
          flush
        >
          <div className="overflow-x-auto no-scrollbar">
            <div className="admin-zebra min-w-[620px]">
              <TableHead cols={['页面', 'PV', 'UV', '停留', '跳出', '趋势']} template="minmax(0,1fr) 70px 70px 76px 64px 84px" />
              {pageRows.length ? (
                pageRows.map((p, i) => (
                  <div
                    key={p.path}
                    className="grid grid-cols-[minmax(0,1fr)_70px_70px_76px_64px_84px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11.5px] last:border-0 hover:bg-lime/20"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-admin-ink">{p.title}</p>
                      <p className="mt-0.5 font-mono text-[9.5px] text-admin-muted">{p.sub}</p>
                    </div>
                    <span className="font-mono text-[10.5px]">{p.pv.toLocaleString()}</span>
                    <span className="font-mono text-[10.5px] text-admin-muted">{p.uv === null ? '—' : p.uv.toLocaleString()}</span>
                    <span className="font-mono text-[10.5px] text-admin-muted">{p.stay}</span>
                    <span className="font-mono text-[10.5px] text-admin-muted">{p.bounce}</span>
                    <div className="flex justify-end">
                      {demoMode ? (
                        <MiniBars data={[4, 6, 5, 8, 7, 9, i === 0 ? 11 : 6]} height={20} color={i === 0 ? 'rgb(var(--c-coral))' : 'rgb(var(--c-blue))'} />
                      ) : (
                        <span className="font-mono text-[10px] text-admin-muted" title="服务端未提供逐页时序数据">—</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title="暂无页面排行" desc={emptyHint} />
              )}
            </div>
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel kicker="Devices" title="设备分布" desc={dimDesc('服务端按 UA 粗分类别聚合 · 不存原始 UA')}>
            {deviceSlices.length ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-4">
                  <Donut data={deviceSlices} size={112} thickness={14} centerValue={String(bd?.deviceSamples ?? sum(deviceSlices.map((d) => d.value)))} centerLabel="条样本" />
                  <Legend className="flex-1" data={deviceLegend} />
                </div>
                {bd && bd.deviceSamples < bd.samples && (
                  <p className="border-t border-dashed border-ink/15 pt-2 text-[10px] leading-relaxed text-admin-muted">
                    覆盖 {bd.deviceSamples.toLocaleString()} / {bd.samples.toLocaleString()} 条样本；启用设备类别采集之前的历史记录没有该字段，不参与统计。
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                <EmptyState title="暂无设备分布" desc={deviceReason} />
                <div className="rounded-xl border border-dashed border-ink/20 bg-paper px-3 py-2.5 text-[10.5px] leading-relaxed text-admin-muted">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-admin-warning">启用条件</span>
                  <p className="mt-1">
                    埋点已开始按 User-Agent 粗分手机 / 平板 / 桌面（只存类别，不存原始 UA）。当前窗口内还没有新样本，产生一次新访问后这里就会出图。
                  </p>
                </div>
              </div>
            )}
          </Panel>

          <Panel kicker="Sources" title="流量来源" desc={dimDesc('服务端按 referrer 聚合')}>
            {sourceSlices.length ? (
              <div className="flex items-center gap-4">
                <Donut data={sourceSlices} size={112} thickness={14} centerValue={String(sourceSlices.length)} centerLabel="类来源" />
                <Legend className="flex-1" data={sourceLegend} />
              </div>
            ) : (
              <EmptyState title="暂无来源占比" desc={emptyHint} />
            )}
          </Panel>

          <Panel kicker="Read depth" title="阅读深度" desc={dimDesc('服务端按停留时长聚合')}>
            {readDepthRows.length ? (
              <div className="space-y-2">
                {readDepthRows.map((r) => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="text-admin-muted">{r.label}</span>
                      <span className="font-mono">{r.value}%</span>
                    </div>
                    <Meter value={r.value} color={r.value > 30 ? 'rgb(var(--c-coral))' : 'rgb(var(--c-amber))'} className="mt-1" />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="暂无阅读深度样本" desc={emptyHint} />
            )}
          </Panel>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel kicker="Funnel" title="访问转化漏斗" desc={dimDesc('从进站到下载的完整链路')}>
          {funnelRows.length ? (
            <div className="space-y-2.5">
              {funnelRows.map((f) => (
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
          ) : (
            <EmptyState title="暂无漏斗样本" desc={emptyHint} />
          )}
          <p className="mt-3 border-t border-dashed border-ink/15 pt-2 text-[10px] text-admin-muted">{funnelNote}</p>
        </Panel>

        <Panel kicker="Regions" title="访客地域" desc="该维度服务端暂不支持">
          <div className="space-y-2.5">
            <EmptyState title="暂无访客地域" desc={regionReason} />
            <div className="rounded-xl border border-dashed border-ink/20 bg-paper px-3 py-2.5 text-[10.5px] leading-relaxed text-admin-muted">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-admin-warning">启用条件</span>
              <p className="mt-1">
                需采集访客 IP 并接入 IP 归属地库（或使用带地域信息的边缘日志），服务端才能聚合；当前返回 regionShare: []。
              </p>
            </div>
            {bd && bd.unsupported.length > 0 && (
              <ul className="space-y-1 border-t border-dashed border-ink/15 pt-2 font-mono text-[9px] text-admin-muted">
                {bd.unsupported.map((u) => (
                  <li key={u.key}>
                    {u.key}：{u.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel kicker="AI sessions" title="AI 会话构成" desc={dimDesc('站点助手的提问类型')}>
          {aiSlices.length ? (
            <>
              <div className="flex items-center gap-4">
                <Donut data={aiSlices} size={108} thickness={13} centerValue={String(aiTotal)} centerLabel="SESSIONS" />
                <Legend className="flex-1" data={aiSlices.map((a) => ({ label: a.label, value: a.value, color: a.color }))} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-dashed border-ink/15 pt-2 text-[10px]">
                <span className="text-admin-muted">
                  共 {aiTotal.toLocaleString()} 次 · 今日 {snapshot ? snapshot.todayAi : '—'} 次
                </span>
                <Badge tone="teal">{aiSlices.length} 类</Badge>
              </div>
            </>
          ) : (
            <EmptyState title="暂无 AI 会话样本" desc={emptyHint} />
          )}
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <Panel kicker="Hourly" title="今日访问分布（小时）" desc={dimDesc('服务端按小时聚合 · 横轴 0—23 时')}>
          {hasHourly ? (
            <>
              <MiniBars data={hourlyValues} height={86} color="rgb(var(--c-coral))" />
              <div className="mt-2 flex justify-between font-mono text-[9px] text-admin-muted">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:00</span>
              </div>
            </>
          ) : (
            <EmptyState title="暂无时段分布" desc={emptyHint} />
          )}
        </Panel>

        <Panel
          kicker="Realtime"
          title="实时快照"
          desc={real ? '每 60 秒轮询服务端 /api/admin/analytics/realtime' : '预置演示值 · 未接服务端'}
        >
          <div className="grid grid-cols-2 gap-2.5">
            {realtimeRows.map(([l, v]) => (
              <div key={l} className="rounded-lg bg-paper px-3 py-2">
                <p className="text-[10px] text-admin-muted">{l}</p>
                <p className="mt-1 text-[17px] font-bold leading-none">{v}</p>
              </div>
            ))}
          </div>
          {snapshot && (
            <p className="mt-2 font-mono text-[9px] text-admin-muted">
              累计命中 {snapshot.totalHits} · 快照于 {fmtTime(snapshot.generatedAt)}
            </p>
          )}
          <button
            onClick={() => setLogOpen((v) => !v)}
            aria-expanded={logOpen}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-ink/15 px-3 py-2 text-[11px] text-admin-muted transition hover:text-admin-ink"
          >
            {logOpen ? '收起原始访问日志' : '查看原始访问日志'}
            {logOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </Panel>
      </div>

      {logOpen && (
        <Panel
          kicker="Raw logs"
          title="原始访问日志"
          desc="来自服务端 /api/admin/analytics/logs，支持按关键词与事件类型检索"
          right={<Badge tone={logs ? 'teal' : 'neutral'}>{logs ? `共 ${logs.total} 条` : '未加载'}</Badge>}
        >
          <div className="flex flex-wrap items-end gap-2">
            <Field label="关键词检索" className="min-w-[200px] flex-1">
              <SearchBox value={q} onChange={setQ} placeholder="输入关键词，如 /learn 或来源域名" />
            </Field>
            <Field label="事件类型" className="w-32">
              <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="按事件类型筛选">
                {kindOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="返回条数" className="w-24">
              <Select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))} aria-label="返回条数">
                {[20, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>
                    {n} 条
                  </option>
                ))}
              </Select>
            </Field>
            <AButton size="sm" variant="dark" onClick={() => void submitLogs()}>
              检索
            </AButton>
            <AButton size="sm" icon={<RefreshCw size={12} />} onClick={() => void submitLogs()}>
              刷新
            </AButton>
          </div>

          <div className="mt-3">
            <LoadState loading={logLoading} error={logError} onRetry={() => void submitLogs()} label="正在拉取访问日志…">
              {logs && logs.items.length ? (
                <div className="overflow-x-auto no-scrollbar">
                  <div className="admin-zebra min-w-[640px]">
                    <TableHead cols={logCols} template={logTemplate} />
                    {logs.items.map((it, i) => (
                      <div
                        key={i}
                        className="grid items-center gap-3 border-b border-ink/10 px-4 py-2 text-[11px] last:border-0 hover:bg-lime/20"
                        style={{ gridTemplateColumns: logTemplate }}
                      >
                        {logKeys.map((k) => (
                          <span key={k} className="truncate font-mono text-[10px] text-admin-muted" title={cell(k, it[k])}>
                            {cell(k, it[k])}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title={logs ? '没有匹配的访问日志' : '尚未拉取日志'}
                  desc={logs ? '换个关键词或事件类型再试' : real ? '点击「检索」从服务端拉取原始访问日志' : '未接服务端，原始访问日志不可用'}
                />
              )}
            </LoadState>
          </div>
          <p className="mt-3 font-mono text-[9px] text-admin-muted">
            仅展示最近 {limit} 条；共 {logs?.total ?? 0} 条命中。检索按 kind / page / referrer 匹配，数据来自服务端原始埋点日志。
          </p>
        </Panel>
      )}
    </div>
  )
}
