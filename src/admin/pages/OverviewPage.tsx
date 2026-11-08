import { ArrowUpRight, BookOpen, Download, Eye, MessageSquare, RefreshCw, Sparkles, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { realtime, traffic } from '@/admin/data'
import type { SectionKey } from '@/admin/AdminShell'
import { AButton, AdminModal, Badge, EmptyState, Meter, PageTitle, Panel, Segmented, TrendChart } from '@/admin/ui'
import { cn } from '@/lib/utils'
import { serverConfig } from '@/services/config'
import { generateReport, getOverview, type Overview, type Report } from '@/services/admin'
import { getRealtime, type RealtimeStats } from '@/services/adminx'

const kpiIcons = [Eye, Users, Sparkles, MessageSquare, BookOpen, Download]
const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err))
const fmtTime = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN')
}

/** 未接服务端时的只读回退：明确标注「预置演示值」，不冒充真实统计 */
const demoOverview = (win: '7d' | '30d'): Overview => {
  const t = traffic[win]
  const days = t.labels.map((date, i) => ({ date, pv: t.pv[i], uv: t.uv[i], ai: t.ai[i] }))
  return {
    generatedAt: new Date().toISOString(),
    content: {
      articles: { total: 6, published: 6, draft: 0, pending: 0, hidden: 0 },
      projects: { total: 7, published: 7, draft: 0, pending: 0, hidden: 0 },
      moments: { total: 0, published: 0, draft: 0, pending: 0, hidden: 0 },
      danmaku: { total: 10, published: 10, draft: 0, pending: 0, hidden: 0 },
    },
    guestbook: { total: 0, pending: 0, published: 0 },
    files: { total: 9, public: 5, private: 0, trashed: 0, shares: 0 },
    ai: { todayCalls: 0, todayTokens: 0, successRate: null, quota: 60 },
    analytics: {
      days,
      pv: days.reduce((s, d) => s + d.pv, 0),
      uv: days.reduce((s, d) => s + d.uv, 0),
      ai: days.reduce((s, d) => s + d.ai, 0),
      topPages: [],
    },
    jobs: { total: 0, dead: 0, running: 0 },
    resume: { modules: 0 },
    env: { model: 'retrieval' },
  }
}

export default function OverviewPage({
  show,
  go,
}: {
  show: (msg: string) => void
  go: (section: SectionKey, tab?: string) => void
}) {
  const [win, setWin] = useState<'7d' | '30d'>('7d')
  const [data, setData] = useState<Overview | null>(null)
  const [snapshot, setSnapshot] = useState<RealtimeStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    if (!serverConfig.enabled) {
      setData(demoOverview(win))
      return
    }
    setLoading(true)
    try {
      const [next, rt] = await Promise.all([getOverview(), getRealtime()])
      if (next) setData(next)
      else show('总览接口不可用：保留上一次数据')
      if (rt) setSnapshot(rt) // 实时快照失败时保留上一次
    } catch (err) {
      // 两个读都是 safe 读；极端异常也不清空已有数据，只提示并保留上次
      show(`总览接口不可用：保留上一次数据（${errMsg(err)}）`)
    } finally {
      setLoading(false)
    }
  }, [win, show])

  useEffect(() => {
    void load()
  }, [load])

  const view = data ?? demoOverview(win)
  const live = serverConfig.enabled && Boolean(data)
  const days = win === '30d' && live ? view.analytics.days.slice(-7) : view.analytics.days
  const lastDay = days[days.length - 1]
  /** 真实模式优先用 getRealtime() 实时快照，失败回落 overview.analytics 的最后一天；演示模式保留预置兜底 */
  const todayRows = [
    { label: '今日 PV', value: snapshot?.todayPv ?? lastDay?.pv ?? (live ? '—' : realtime.pv), icon: Eye },
    { label: '今日 UV', value: snapshot?.todayUv ?? lastDay?.uv ?? (live ? '—' : realtime.uv), icon: Users },
    { label: '今日 AI', value: snapshot?.todayAi ?? view.ai.todayCalls, icon: Sparkles },
    { label: 'AI 成功率', value: view.ai.successRate === null ? '—' : `${view.ai.successRate}%`, icon: Sparkles },
  ]
  const kpis = [
    { label: '近 7 天 PV', value: view.analytics.pv.toLocaleString(), note: live ? '服务端埋点' : '预置演示值' },
    { label: '近 7 天 UV', value: view.analytics.uv.toLocaleString(), note: live ? '会话去重' : '预置演示值' },
    { label: 'AI 轮次', value: view.analytics.ai.toLocaleString(), note: live ? 'kind=ai' : '预置演示值' },
    { label: '待审留言', value: String(view.guestbook.pending), note: live ? '互动审核' : '预置演示值' },
    { label: '非公开内容', value: String(view.content.articles.draft + view.content.projects.draft + view.content.moments.draft), note: '文章/项目/动态' },
    { label: '文件 / 分享', value: `${view.files.total} / ${view.files.shares}`, note: `回收站 ${view.files.trashed}` },
  ]

  const makeReport = async () => {
    if (!serverConfig.enabled) {
      setReport({
        generatedAt: new Date().toISOString(),
        source: 'demo',
        note: '未接服务端：这是页面内置的示例周报',
        kpis: {},
        text: '尚未接入服务端，无法生成真实周报。配置 VITE_API_BASE 后这里会按真实埋点与内容统计生成。',
      })
      return
    }
    setGenerating(true)
    try {
      setReport(await generateReport())
    } catch (err) {
      show(`周报生成失败：${errMsg(err)}`)
    } finally {
      setGenerating(false)
    }
  }

  /** 复制正文：await 成功后才提示，失败给出具体原因 */
  const copyReport = async () => {
    if (!report) return
    if (!navigator.clipboard) return show('复制失败：当前环境不支持剪贴板')
    try {
      await navigator.clipboard.writeText(report.text)
      show('周报正文已复制')
    } catch {
      show('复制失败：浏览器未授予剪贴板权限')
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Dashboard"
        title="首页总览"
        desc={live ? '数据来自服务端埋点、内容库与任务队列（7 天窗口）。' : '未接服务端：以下为只读预置演示值，仅用于预览版式。'}
        right={
          <>
            <Segmented value={win} onChange={setWin} options={[{ key: '7d', label: '近 7 天' }, { key: '30d', label: '近 30 天' }]} />
            <AButton icon={<RefreshCw size={13} />} onClick={() => void load()} disabled={loading}>
              {loading ? '刷新中…' : '刷新'}
            </AButton>
            <AButton variant="dark" icon={<Sparkles size={13} />} onClick={() => void makeReport()} disabled={generating}>
              {generating ? '生成中…' : 'AI 周报'}
            </AButton>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={live ? 'teal' : 'amber'}>{live ? '服务端真实数据' : '预置演示值 · 只读'}</Badge>
        <Badge tone={view.env.model === 'configured' ? 'teal' : 'neutral'}>AI：{view.env.model === 'configured' ? '模型已配置' : '检索模式'}</Badge>
        <span className="font-mono text-[9.5px] text-admin-muted">生成于 {new Date(view.generatedAt).toLocaleString('zh-CN')}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((k, i) => {
          const Icon = kpiIcons[i]
          return (
            <div key={k.label} className={cn('rounded-[18px] border-1.5 border-ink px-3.5 py-3 shadow-hard-sm', i === 0 ? 'bg-lime' : 'bg-cream')}>
              <div className="flex items-start justify-between gap-2">
                <p className={cn('text-[10.5px]', i === 0 ? 'text-ink/70' : 'text-admin-muted')}>{k.label}</p>
                <Icon size={13} className="mt-0.5 shrink-0 text-admin-muted" strokeWidth={1.7} />
              </div>
              <p className="mt-2 font-display text-[27px] font-extrabold leading-none tracking-tight text-ink">{k.value}</p>
              <p className="mt-2 text-[10px] text-admin-muted">{k.note}</p>
            </div>
          )
        })}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.62fr_1fr]">
        <Panel
          kicker="Traffic trend"
          title="访问 / 访客 / AI 会话"
          desc={live ? '服务端埋点按日聚合' : '预置演示值（未接服务端）'}
          right={<span className="rounded-full border border-ink/15 px-2.5 py-1 font-mono text-[9.5px] text-admin-muted">{win}</span>}
        >
          {days.length ? (
            <TrendChart
              labels={days.map((d) => d.date.slice(5))}
              series={[
                { name: 'pv', color: 'rgb(var(--c-coral))', values: days.map((d) => d.pv) },
                { name: 'uv', color: 'rgb(var(--c-blue))', values: days.map((d) => d.uv) },
              ]}
              bars={{ values: days.map((d) => d.ai), color: 'rgb(var(--c-lime))' }}
              height={214}
              labelStep={days.length > 10 ? 5 : 1}
            />
          ) : (
            <EmptyState title="还没有埋点" desc="前台访问后会自动写入 /api/track" />
          )}
        </Panel>

        <Panel kicker="Queue" title="内容与任务" desc="待审 / 草稿 / 任务队列">
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: '待审留言', value: view.guestbook.pending, hint: '互动审核' },
              { label: '文章草稿', value: view.content.articles.draft + view.content.articles.pending, hint: '内容管理' },
              { label: '项目草稿', value: view.content.projects.draft + view.content.projects.pending, hint: '内容管理' },
              { label: '任务死信', value: view.jobs.dead, hint: '简历解析' },
            ].map((r) => (
              <div key={r.label} className="rounded-xl border border-ink/15 bg-paper px-3 py-2.5">
                <p className="text-[10px] text-admin-muted">{r.label}</p>
                <p className="mt-1.5 font-display text-[20px] font-extrabold leading-none">{r.value}</p>
                <p className="mt-1 font-mono text-[9px] text-admin-muted">{r.hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1.5 border-t border-dashed border-ink/15 pt-2.5">
            <button onClick={() => go('review', 'guestbook')} className="flex w-full items-center justify-between text-[10.5px] text-admin-muted hover:text-admin-ink">
              去审核留言 <ArrowUpRight size={11} />
            </button>
            <button onClick={() => go('content', 'articles')} className="flex w-full items-center justify-between text-[10.5px] text-admin-muted hover:text-admin-ink">
              去内容管理 <ArrowUpRight size={11} />
            </button>
            <button onClick={() => go('resume', 'versions')} className="flex w-full items-center justify-between text-[10.5px] text-admin-muted hover:text-admin-ink">
              去简历版本 <ArrowUpRight size={11} />
            </button>
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.62fr_1fr]">
        <Panel kicker="Top pages" title="热门页面（7 天）" right={<span className="font-mono text-[9.5px] text-admin-muted">来自 /api/track</span>}>
          {view.analytics.topPages.length ? (
            <div>
              {view.analytics.topPages.map((p, i) => {
                const max = view.analytics.topPages[0]?.pv || 1
                return (
                  <div key={p.path} className={cn('flex items-center gap-3 py-2.5', i !== 0 && 'border-t border-ink/10')}>
                    <span className="w-5 shrink-0 font-mono text-[10px] text-admin-muted">{i + 1}</span>
                    <Link to={p.path} className="min-w-0 flex-1 truncate text-[12px] font-medium hover:text-admin-danger">
                      {p.path}
                    </Link>
                    <span className="shrink-0 font-mono text-[10.5px] text-admin-muted">{p.pv}</span>
                    <div className="w-14 shrink-0">
                      <Meter value={(p.pv / max) * 100} color={i === 0 ? 'rgb(var(--c-coral))' : 'rgb(var(--c-blue))'} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState title="还没有页面数据" desc="埋点只记录 path / 停留 / 会话哈希" />
          )}
        </Panel>

        <Panel
          dark
          kicker="Today"
          title="今日"
          desc={live ? (snapshot ? '服务端实时快照 + 内容库记账' : '服务端记账（实时快照暂不可用）') : '预置演示值 · 未接服务端'}
        >
          <div className="grid grid-cols-2 gap-2.5">
            {todayRows.map((r) => (
              <div key={r.label} className="rounded-xl border border-paper/15 bg-paper/5 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[10px] text-paper/70">
                  <r.icon size={11} /> {r.label}
                </p>
                <p className="mt-1.5 font-display text-[20px] font-extrabold leading-none tracking-tight text-paper">{r.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-paper/15 pt-2.5 text-[10px] text-paper/70">
            <span>在线 {snapshot ? snapshot.online : live ? '—' : realtime.online}</span>
            <span>日配额 {view.ai.quota}</span>
            <span>Token {view.ai.todayTokens}</span>
          </div>
          {snapshot && (
            <p className="mt-2 font-mono text-[9px] text-paper/50">
              实时快照于 {fmtTime(snapshot.generatedAt)} · 累计命中 {snapshot.totalHits}
            </p>
          )}
        </Panel>
      </div>

      <AdminModal
        open={Boolean(report)}
        onClose={() => setReport(null)}
        title="AI 周报"
        desc={report?.note ?? '按埋点与内容统计生成'}
        width="max-w-xl"
        footer={
          <>
            <AButton onClick={() => setReport(null)}>关闭</AButton>
            <AButton variant="primary" onClick={() => void copyReport()}>
              复制正文
            </AButton>
          </>
        }
      >
        {report ? (
          <div className="space-y-3 text-[12px] leading-relaxed text-admin-ink/85">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(report.kpis)
                .slice(0, 3)
                .map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-ink/15 bg-paper px-2.5 py-2">
                    <p className="text-[9.5px] text-admin-muted">{k}</p>
                    <p className="mt-0.5 font-display text-[16px] font-bold leading-none">{v}</p>
                  </div>
                ))}
            </div>
            <p className="whitespace-pre-line">{report.text}</p>
            <Badge tone={report.source === 'rules' ? 'teal' : 'amber'}>{report.source === 'rules' ? '规则生成（未调用模型）' : '示例'}</Badge>
            <p className="font-mono text-[9px] text-admin-muted">发送邮件未接入：需邮件服务与账号；可先复制正文手动发送。</p>
          </div>
        ) : null}
      </AdminModal>
    </div>
  )
}
