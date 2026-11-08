import { Activity, Bot, Check, Cpu, KeyRound, Plus, RotateCcw, Sparkles, Trash2, Wand2, Zap } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { aiModels as modelSeed, aiUsage, prompts as promptSeed } from '@/admin/data'
import { serverConfig } from '@/services/config'
import { deleteModel, deletePrompt, getFeedback, reviewFeedback, type FeedbackRow } from '@/services/admin'
import { apiJson, ApiError } from '@/services/http'
import {
  aiFailover,
  clearAiCache,
  getAiLogs,
  getAiSettings,
  getCapabilities,
  resetAiUsage,
  saveAiSettings,
  type AiLogRow,
  type AiSettings,
  type Capabilities,
} from '@/services/adminx'
import {
  AButton,
  AdminModal,
  Badge,
  Donut,
  Field,
  IconButton,
  Input,
  Legend,
  LoadState,
  Meter,
  MiniBars,
  PageTitle,
  Panel,
  ReadOnlyNotice,
  Select,
  Status,
  TableHead,
  Tabs,
  Textarea,
  Toggle,
} from '@/admin/ui'
import { cn, newId } from '@/lib/utils'

type Tab = 'models' | 'prompts' | 'usage'
type ModelRow = (typeof modelSeed)[number]
type PromptRow = (typeof promptSeed)[number]

/** 服务端只返回配置本身（不含密钥），这里补齐列表页需要的展示字段 */
type ServerModel = { id: string; name: string; provider: string; model: string; enabled: boolean; isDefault: boolean; source?: string }
type ServerPrompt = { id: string; name: string; scene: string; version: number; body: string; active: boolean; updatedAt: string }
type UsageSummary = {
  monthTokens: number
  monthCost: number
  avgLatency: number
  successRate: number
  budget: number
  dailyQuota: number
  daily: { date: string; tokens: number; cost: number; calls: number }[]
  byModel: { label: string; value: number }[]
  recent: { ts: string; model: string; tokens: number; latency: number; ok: boolean; source: string }[]
}

const toModelRow = (m: ServerModel): ModelRow => ({
  id: m.id,
  name: m.name,
  provider: m.provider,
  model: m.model,
  key: m.source === 'env' ? 'env · 服务端环境变量' : '服务端托管',
  enabled: Boolean(m.enabled),
  isDefault: Boolean(m.isDefault),
  latency: '—',
  cost: '按官方计价',
  context: '—',
  calls: 0,
})

const toPromptRow = (p: ServerPrompt): PromptRow => ({
  id: p.id,
  name: p.name,
  scene: p.scene,
  model: `v${p.version}`,
  updated: p.updatedAt.slice(0, 10),
  enabled: Boolean(p.active),
  tokens: Math.round(p.body.length / 2),
  body: p.body,
})

const fmtTokens = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err))

const DEMO_CONSTRAINT = '回答必须基于站内已发布的内容；不确定时直说不知道。不要编造项目指标、获奖或个人信息。涉及联系方式时优先引导到留言板。'

/**
 * /api/ai/usage 不可用时的兜底：只用真实调用日志聚合，绝不掺入 @/admin/data 的写死演示值。
 * 真实模式优先复用 /api/ai/usage（load 中），这里仅在它返回空时补位。
 */
const aggregateUsage = (logs: AiLogRow[], settings: AiSettings | null): UsageSummary => {
  const month = new Date().toISOString().slice(0, 7)
  const rows = logs.filter((l) => (l.day ?? l.ts.slice(0, 10)).startsWith(month))
  const monthTokens = rows.reduce((s, l) => s + (l.tokens ?? 0), 0)
  const monthCost = Number(rows.reduce((s, l) => s + (l.cost ?? 0), 0).toFixed(2))
  const avgLatency = rows.length ? Math.round(rows.reduce((s, l) => s + (l.latency ?? 0), 0) / rows.length) : 0
  const successRate = rows.length ? Number(((rows.filter((l) => l.ok).length / rows.length) * 100).toFixed(1)) : 100

  const byDay = new Map<string, { tokens: number; cost: number; calls: number }>()
  const byModel = new Map<string, number>()
  for (const l of rows) {
    const day = l.day ?? l.ts.slice(0, 10)
    const cur = byDay.get(day) ?? { tokens: 0, cost: 0, calls: 0 }
    cur.tokens += l.tokens ?? 0
    cur.cost += l.cost ?? 0
    cur.calls += 1
    byDay.set(day, cur)
    byModel.set(l.model, (byModel.get(l.model) ?? 0) + (l.tokens ?? 0))
  }
  const total = [...byModel.values()].reduce((s, v) => s + v, 0) || 1

  return {
    monthTokens,
    monthCost,
    avgLatency,
    successRate,
    budget: settings?.monthlyTokenBudget ?? 3000000,
    dailyQuota: settings?.dailyQuota ?? 0,
    daily: [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-14)
      .map(([date, v]) => ({ date, tokens: v.tokens, cost: Number(v.cost.toFixed(2)), calls: v.calls })),
    byModel: [...byModel.entries()].map(([label, value]) => ({ label, value: Math.round((value / total) * 100) })),
    recent: rows.slice(0, 20).map((l) => ({ ts: l.ts, model: l.model, tokens: l.tokens, latency: l.latency ?? 0, ok: l.ok, source: l.source ?? '' })),
  }
}

const DEMO_USAGE = {
  monthTokens: aiUsage.monthTokens,
  monthCost: aiUsage.monthCost,
  avgLatency: aiUsage.avgLatency,
  successRate: aiUsage.successRate,
  limit: aiUsage.limit,
  usedTokens: aiUsage.usedTokens,
  calls: 2370,
  daily: aiUsage.daily.map((d) => ({ ...d, calls: 0 })),
  byModel: aiUsage.byModel,
  recent: [] as UsageSummary['recent'],
}

export default function AiConfigPage({ tab, setTab, show }: { tab: Tab; setTab: (t: Tab) => void; show: (m: string) => void }) {
  const real = serverConfig.enabled
  const [models, setModels] = useState<ModelRow[]>(modelSeed)
  const [prompts, setPrompts] = useState<PromptRow[]>(promptSeed)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [logs, setLogs] = useState<AiLogRow[]>([])
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null)
  const [capabilities, setCapabilities] = useState<Capabilities>({})
  const [loading, setLoading] = useState(real)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', provider: 'DeepSeek', model: '', key: '', context: '64k' })
  const [editingPrompt, setEditingPrompt] = useState<PromptRow | null>(null)
  const [promptDraft, setPromptDraft] = useState({ name: '', scene: '', model: '', body: '' })
  const [globalConstraint, setGlobalConstraint] = useState(real ? '' : DEMO_CONSTRAINT)
  const [quota, setQuota] = useState({
    dailyQuota: real ? '' : '100',
    monthlyTokenBudget: real ? '' : '3000000',
    perVisitorDailyLimit: real ? '' : '20',
    fallbackModelId: '',
  })
  const [feedback, setFeedback] = useState<FeedbackRow[]>([])

  /** F-01：配置页接服务端真实读写；未接服务端时保持纯演示态并在文案里说清楚 */
  const load = useCallback(
    async (spinner = true) => {
      if (!real) {
        setLoading(false)
        return
      }
      if (spinner) setLoading(true)
      setError('')
      try {
        const [m, p, u, lg, settings, caps, fb] = await Promise.all([
          apiJson<{ models: ServerModel[] }>('/api/ai/models').catch(() => null),
          apiJson<ServerPrompt[]>('/api/ai/prompts').catch(() => null),
          apiJson<UsageSummary>('/api/ai/usage').catch(() => null),
          getAiLogs(50),
          getAiSettings(),
          getCapabilities(),
          getFeedback(),
        ])
        if (m?.models) setModels(m.models.map(toModelRow))
        if (p) setPrompts(p.map(toPromptRow))
        setLogs(lg)
        // 真实模式绝不展示 @/admin/data 的写死用量：优先服务端记账，其次用真实日志聚合
        setUsage(u ?? (lg.length ? aggregateUsage(lg, settings) : null))
        if (settings) {
          setAiSettings(settings)
          setGlobalConstraint(settings.globalConstraint)
          setQuota({
            dailyQuota: String(settings.dailyQuota),
            monthlyTokenBudget: String(settings.monthlyTokenBudget),
            perVisitorDailyLimit: String(settings.perVisitorDailyLimit),
            fallbackModelId: settings.fallbackModelId ?? '',
          })
        }
        setCapabilities(caps ?? {})
        setFeedback(fb)
      } catch (err) {
        setError(`加载失败：${errMsg(err)}`)
      } finally {
        setLoading(false)
      }
    },
    [real],
  )

  useEffect(() => {
    void load()
  }, [load])

  /** 把服务端保存结果回显到全局约束与额度表单 */
  const applySettings = (s: AiSettings) => {
    setAiSettings(s)
    setGlobalConstraint(s.globalConstraint)
    setQuota({
      dailyQuota: String(s.dailyQuota),
      monthlyTokenBudget: String(s.monthlyTokenBudget),
      perVisitorDailyLimit: String(s.perVisitorDailyLimit),
      fallbackModelId: s.fallbackModelId ?? '',
    })
  }

  const enabled = models.filter((m) => m.enabled)
  const defaultModel = models.find((m) => m.isDefault)
  const view = usage
    ? {
        monthTokens: fmtTokens(usage.monthTokens),
        monthCost: `¥ ${usage.monthCost.toFixed(2)}`,
        avgLatency: usage.avgLatency ? `${usage.avgLatency}ms` : '—',
        successRate: `${usage.successRate}%`,
        limit: usage.budget,
        usedTokens: usage.monthTokens,
        calls: usage.daily.reduce((s, d) => s + d.calls, 0),
        daily: usage.daily.map((d) => ({ date: d.date.slice(5), tokens: d.tokens, cost: d.cost, calls: d.calls })),
        byModel: usage.byModel.map((m, i) => ({ ...m, color: ['rgb(var(--c-coral))', 'rgb(var(--c-blue))', 'rgb(var(--c-amber))'][i % 3] })),
        recent: usage.recent,
      }
    : DEMO_USAGE
  /** AI-06：只有真的拿到服务端用量（或真实日志聚合）才标「服务端记账」，否则如实标预置 */
  const usageLive = Boolean(usage) && real
  const tokenPercent = Math.round((view.usedTokens / (view.limit || 1)) * 100)
  /** 能力清单如实 gate：未接服务端或明确 unavailable 时禁用故障切换 */
  const failoverAvailable = real && capabilities.modelFailover?.available !== false
  const failoverReason = capabilities.modelFailover?.reason ?? '服务端未提供该能力'

  /** 真实模式下写操作必须等服务端返回成功再提示；演示模式一律禁用并说明 */
  const patchModel = async (id: string, patch: { enabled?: boolean; isDefault?: boolean }, okMsg: string) => {
    if (!real) return show('未接服务端：模型启停与默认切换需配置 VITE_API_BASE')
    setBusy(true)
    try {
      const updated = await apiJson<ServerModel>(`/api/ai/models/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      setModels((l) => l.map((x) => (x.id === id ? { ...x, enabled: updated.enabled, isDefault: updated.isDefault } : patch.isDefault ? { ...x, isDefault: false } : x)))
      show(okMsg)
    } catch (err) {
      show(`保存失败：${errMsg(err)}`)
    } finally {
      setBusy(false)
    }
  }

  /** 连接测试：真实请求 /api/ai/health（services/ai.ts 的 probeAiMode 只返回 mode，不足以展示） */
  const testConnection = async () => {
    if (!real) return
    setBusy(true)
    try {
      const h = await apiJson<{ model?: string; mode?: string; index?: { chunks?: number }; promptScene?: string[] }>('/api/ai/health')
      const configured = h.model === 'configured' || h.mode === 'model'
      show(
        configured
          ? `网关正常 · 模型密钥已配置 · ${h.model ?? h.mode} · 索引 ${h.index?.chunks ?? 0} 块 · 生效场景 ${h.promptScene?.length ?? 0} 个`
          : '网关正常 · 未配置模型密钥，当前走站内检索摘录',
      )
    } catch (err) {
      show(`连接失败：${errMsg(err)}`)
    } finally {
      setBusy(false)
    }
  }

  /** 故障切换：真实切换默认模型，成功后刷新模型列表 */
  const failover = async () => {
    if (!real) return
    setBusy(true)
    try {
      const res = await aiFailover()
      show(`已切换默认模型为「${res.name}」（${res.model}）`)
      await load(false)
    } catch (err) {
      const noFallback = err instanceof ApiError && err.status === 422
      show(noFallback ? '故障切换失败：没有可用的备用模型，请先在「模型」页启用至少一个模型' : `故障切换失败：${errMsg(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const togglePrompt = async (p: PromptRow, v: boolean) => {
    if (!real) return
    setBusy(true)
    try {
      await apiJson(`/api/ai/prompts/${p.id}`, { method: 'PUT', body: JSON.stringify({ active: v }) })
      setPrompts((l) => l.map((x) => (x.id === p.id ? { ...x, enabled: v } : x)))
      show(v ? '提示词已启用，下一次对话生效' : '提示词已停用')
    } catch (err) {
      show(`保存失败：${errMsg(err)}`)
    } finally {
      setBusy(false)
    }
  }

  /** 提示词版本回滚：调用服务端 rollback，成功后刷新列表 */
  const rollbackPrompt = async () => {
    const target = editingPrompt
    if (!real || !target || target.id === 'new') return
    setBusy(true)
    try {
      const res = await apiJson<{ id: string; version: number }>(`/api/ai/prompts/${target.id}/rollback`, { method: 'POST' })
      const latest = await apiJson<ServerPrompt[]>('/api/ai/prompts')
      setPrompts(latest.map(toPromptRow))
      setEditingPrompt(null)
      show(`已回滚到上一版 · 当前版本 v${res.version}`)
    } catch (err) {
      show(`回滚失败：${errMsg(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const saveGlobalConstraint = async () => {
    if (!real) return
    setBusy(true)
    try {
      const saved = await saveAiSettings({ globalConstraint })
      applySettings(saved)
      show('全局约束已保存到服务端，下一次对话生效')
    } catch (err) {
      show(`保存失败：${errMsg(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const saveQuota = async () => {
    if (!real) return
    const dailyQuota = Number(quota.dailyQuota)
    const monthlyTokenBudget = Number(quota.monthlyTokenBudget)
    const perVisitorDailyLimit = Number(quota.perVisitorDailyLimit)
    if (![dailyQuota, monthlyTokenBudget, perVisitorDailyLimit].every((n) => Number.isInteger(n) && n > 0)) {
      return show('请填写有效的正整数额度')
    }
    setBusy(true)
    try {
      const saved = await saveAiSettings({
        dailyQuota,
        monthlyTokenBudget,
        perVisitorDailyLimit,
        fallbackModelId: quota.fallbackModelId.trim() || null,
      })
      applySettings(saved)
      show('额度与限流设置已保存到服务端')
    } catch (err) {
      show(`保存失败：${errMsg(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const resetUsage = async () => {
    if (!real) return
    if (!window.confirm('确认清空全部用量记录与当日配额计数？此操作不可撤销。')) return
    setBusy(true)
    try {
      const res = await resetAiUsage()
      show(`已清空 ${res.cleared} 条用量记录`)
      await load(false)
    } catch (err) {
      show(`清空失败：${errMsg(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const clearCache = async () => {
    if (!real) return
    setBusy(true)
    try {
      const res = await clearAiCache()
      show(`已清空 ${res.cleared} 条回答缓存`)
    } catch (err) {
      show(`清空失败：${errMsg(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const openPrompt = (p: PromptRow) => {
    setPromptDraft({ name: p.name, scene: p.scene, model: p.model, body: p.body })
    setEditingPrompt(p)
  }

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="AI"
        title="AI 配置"
        desc={
          real
            ? '模型与提示词写入服务端配置，保存后下一次对话生效；密钥只在服务端环境变量里。'
            : '未配置服务端：当前为只读演示，所有写操作已禁用；页面数据为本机预置示例。'
        }
        right={
          <>
            <Badge tone="teal">默认 {defaultModel?.name ?? '未设置'}</Badge>
            <AButton variant="primary" icon={<Plus size={13} />} onClick={() => (tab === 'prompts' ? openPrompt({ ...promptSeed[0], id: 'new', name: '', scene: '全站对话', model: defaultModel?.name ?? 'DeepSeek Chat', updated: '刚刚', enabled: true, tokens: 0, body: '' }) : setAdding(true))}>
              {tab === 'prompts' ? '新建提示词' : '接入模型'}
            </AButton>
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        items={[
          { key: 'models', label: '模型', count: enabled.length },
          { key: 'prompts', label: '提示词', count: prompts.length },
          { key: 'usage', label: '用量' },
        ]}
      />

      <ReadOnlyNotice show={!real}>
        当前未接入服务端（VITE_API_BASE 未配置）：模型 / 提示词 / 全局约束 / 额度 / 调用日志的读写均不可用，页面仅展示本机预置示例，所有写操作已禁用。
      </ReadOnlyNotice>

      {tab === 'models' && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['默认模型', defaultModel?.name ?? '—', defaultModel?.provider ?? ''],
              ['启用模型', `${enabled.length} / ${models.length}`, '可随时切换'],
              ['本月调用', view.calls ? view.calls.toLocaleString() : '—', usageLive ? '来自服务端记账' : '预置演示值'],
              ['平均延迟', view.avgLatency, real ? '月度均值' : 'P95 1.6s'],
            ].map(([l, v, n]) => (
              <div key={l} className="rounded-[18px] border-1.5 border-ink bg-cream px-3.5 py-3 shadow-hard-sm">
                <p className="text-[10.5px] text-admin-muted">{l}</p>
                <p className="mt-1.5 truncate font-display text-[18px] font-extrabold leading-none">{v}</p>
                <p className="mt-1.5 text-[9.5px] text-admin-muted">{n}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.65fr_1fr]">
            <Panel kicker="Models" title="模型接入" desc="同一条对话链路会自动回退到下一个可用模型" flush>
              <div className="overflow-x-auto no-scrollbar">
                <div className="admin-zebra min-w-[660px]">
                  <TableHead cols={['模型', '调用', '延迟', '价格', '默认', '启用']} template="minmax(0,1fr) 60px 66px 92px 66px 52px" />
                  {models.map((m) => (
                    <div
                      key={m.id}
                      className="grid grid-cols-[minmax(0,1fr)_60px_66px_92px_66px_52px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 last:border-0 hover:bg-lime/20"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', m.enabled ? 'bg-coral/15 text-admin-danger' : 'bg-sand/55 text-admin-muted')}>
                          <Bot size={13} />
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-[11.5px] font-medium">
                            {m.name}
                            {m.isDefault && <Badge tone="red">默认</Badge>}
                          </p>
                          <p className="truncate font-mono text-[9px] text-admin-muted">
                            {m.provider} · {m.model} · {m.context}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[9.5px] text-admin-muted">{m.calls}</span>
                      <span className="font-mono text-[9.5px] text-admin-muted">{m.latency}</span>
                      <span className="font-mono text-[9px] text-admin-muted">{m.cost}</span>
                      <button
                        disabled={!real || busy}
                        onClick={() => {
                          void patchModel(m.id, { isDefault: true }, `${m.name} 已设为默认模型`)
                        }}
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40',
                          m.isDefault ? 'border-ink bg-ink text-lime' : 'border-ink/20 text-transparent hover:border-ink/40',
                        )}
                        aria-label="设为默认"
                      >
                        <Check size={11} />
                      </button>
                      <Toggle
                        on={m.enabled}
                        label={m.name}
                        disabled={!real || busy}
                        onChange={(v) => {
                          void patchModel(m.id, { enabled: v }, v ? `${m.name} 已启用` : `${m.name} 已停用`)
                        }}
                      />
                      <IconButton
                        label="删除模型"
                        disabled={!real || busy}
                        className="hover:border-coral/60 hover:text-admin-danger"
                        onClick={() => {
                          if (m.id === 'm_env' || m.provider === '环境变量') return show('环境变量模型不能删除，请改 .env')
                          if (!window.confirm(`删除模型「${m.name}」？`)) return
                          void deleteModel(m.id)
                            .then(() => {
                              setModels((l) => l.filter((x) => x.id !== m.id))
                              show('模型已删除')
                            })
                            .catch((err: Error) => show(`删除失败：${err.message}`))
                        }}
                      >
                        <Trash2 size={11} />
                      </IconButton>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <div className="space-y-3">
              <Panel kicker="Active" title="当前生效模型">
                <div className="rounded-xl border border-ink/15 bg-paper p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-coral/15 text-admin-danger">
                      <Cpu size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold">{defaultModel?.name}</p>
                      <p className="font-mono text-[9px] text-admin-muted">{defaultModel?.model}</p>
                    </div>
                    <Badge tone="teal">在线</Badge>
                  </div>
                  <div className="mt-3 space-y-1.5 text-[10px]">
                    <p className="flex items-center justify-between">
                      <span className="text-admin-muted">API Key</span>
                      <span className="flex items-center gap-1 font-mono">
                        <KeyRound size={9} /> {defaultModel?.key}
                      </span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-admin-muted">上下文窗口</span>
                      <span className="font-mono">{defaultModel?.context}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-admin-muted">流式输出</span>
                      <Badge tone="teal">开启</Badge>
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <AButton size="sm" icon={<Zap size={11} />} disabled={!real || busy} onClick={() => void testConnection()}>
                    测试连接
                  </AButton>
                  <AButton
                    size="sm"
                    variant="soft"
                    disabled={!real || busy || !failoverAvailable}
                    title={failoverAvailable ? undefined : failoverReason}
                    onClick={() => void failover()}
                  >
                    故障切换
                  </AButton>
                </div>
                {!real && <p className="mt-2 text-[10px] leading-relaxed text-admin-muted">未接服务端：连接测试与故障切换需配置 VITE_API_BASE 后可用。</p>}
                {real && !failoverAvailable && <p className="mt-2 text-[10px] text-admin-muted">故障切换不可用：{failoverReason}</p>}
              </Panel>

              <Panel kicker="Fallback" title="回退策略">
                <div className="space-y-2 text-[10.5px]">
                  {[
                    ['主模型超时', '3s 后切换'],
                    ['额度耗尽', '降级到 mini 模型'],
                    ['连续失败 3 次', '熔断 5 分钟'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b border-ink/10 pb-1.5 last:border-0">
                      <span className="text-admin-muted">{k}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </div>
      )}

      {tab === 'prompts' && (
        <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
          <Panel kicker="Prompts" title="提示词模板" desc="修改后需重新发布才会生效，历史会话不受影响" flush>
            <div className="divide-y divide-ink/10">
              {prompts.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sand/55 text-admin-muted">
                    <Wand2 size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[11.5px] font-medium">
                      {p.name}
                      <Badge tone="neutral">{p.scene}</Badge>
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-admin-muted">{p.body}</p>
                    <p className="mt-1 flex items-center gap-2 font-mono text-[9px] text-admin-muted">
                      <span>{p.model}</span>
                      <span>·</span>
                      <span>{p.tokens} tokens</span>
                      <span>·</span>
                      <span>更新于 {p.updated}</span>
                    </p>
                  </div>
                  <Badge tone={p.enabled ? 'teal' : 'neutral'}>{p.enabled ? '已启用' : '已停用'}</Badge>
                  <AButton size="sm" variant="soft" onClick={() => openPrompt(p)}>
                    编辑
                  </AButton>
                  <IconButton
                    label="删除提示词"
                    disabled={!real || busy}
                    className="hover:border-coral/60 hover:text-admin-danger"
                    onClick={() => {
                      if (!window.confirm(`删除提示词「${p.name}」？`)) return
                      void deletePrompt(p.id)
                        .then(() => {
                          setPrompts((l) => l.filter((x) => x.id !== p.id))
                          show('提示词已删除')
                        })
                        .catch((err: Error) => show(`删除失败：${err.message}`))
                    }}
                  >
                    <Trash2 size={11} />
                  </IconButton>
                  <Toggle
                    on={p.enabled}
                    label={p.name}
                    disabled={!real || busy}
                    onChange={(v) => void togglePrompt(p, v)}
                  />
                </div>
              ))}
            </div>
          </Panel>

          <div className="space-y-3">
            <Panel kicker="Guardrails" title="全局约束" desc={real ? '写入服务端 ai.json，保存后下一次对话生效' : '未接服务端：只读预览，编辑保存已禁用'}>
              {!real && <ReadOnlyNotice show>未接服务端：全局约束只读，编辑与保存需配置 VITE_API_BASE。</ReadOnlyNotice>}
              <Textarea
                value={globalConstraint}
                onChange={(e) => setGlobalConstraint(e.target.value)}
                rows={6}
                readOnly={!real}
                disabled={!real}
                placeholder={loading ? '正在载入服务端配置…' : '留空表示不追加额外约束'}
                className="mt-2 text-[11px]"
              />
              <AButton className="mt-2 w-full" variant="primary" icon={<Activity size={12} />} disabled={!real || busy || loading} onClick={() => void saveGlobalConstraint()}>
                保存全局约束
              </AButton>
              {aiSettings?.updatedAt && <p className="mt-1.5 text-[9.5px] text-admin-muted">上次更新：{new Date(aiSettings.updatedAt).toLocaleString('zh-CN')}</p>}
            </Panel>
            <Panel kicker="Vars" title="可用变量">
              <div className="flex flex-wrap gap-1.5">
                {['{{site_name}}', '{{profile}}', '{{projects}}', '{{articles}}', '{{now}}', '{{path}}'].map((v) => (
                  <span key={v} className="rounded bg-sand/55 px-1.5 py-1 font-mono text-[9.5px] text-admin-ink/70">
                    {v}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-admin-muted">运行时自动注入，超出上下文会自动裁剪为摘要。</p>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'usage' && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['本月 Token', view.monthTokens, usageLive ? '服务端记账' : '预置演示值'],
              ['本月费用', view.monthCost, usageLive ? '按服务端单价折算（估算）' : '预置演示值'],
              ['平均延迟', view.avgLatency, usageLive ? '月度均值' : 'P95 1.6s'],
              ['成功率', view.successRate, usageLive ? '本月成功率' : '预置演示值'],
            ].map(([l, v, n]) => (
              <div key={l} className="rounded-[18px] border-1.5 border-ink bg-cream px-3.5 py-3 shadow-hard-sm">
                <p className="text-[10.5px] text-admin-muted">{l}</p>
                <p className="mt-1.5 font-display text-[20px] font-extrabold leading-none">{v}</p>
                <p className="mt-1.5 text-[9.5px] text-admin-muted">{n}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
            <Panel kicker="Daily" title={`近 ${view.daily.length} 天 Token 消耗`} desc={usageLive ? '服务端记账（估算）' : '预置演示值'}>{/* AI-06 */}
              <MiniBars data={view.daily.map((d) => d.tokens)} height={110} color="rgb(var(--c-coral))" />
              <div className="mt-2 flex justify-between font-mono text-[9px] text-admin-muted">
                {view.daily.map((d) => (
                  <span key={d.date}>{d.date}</span>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(() => {
                  const tokens = view.daily.map((d) => d.tokens)
                  const max = tokens.length ? Math.max(...tokens) : 0
                  const min = tokens.length ? Math.min(...tokens) : 0
                  const avg = tokens.length ? Math.round(tokens.reduce((s, v) => s + v, 0) / tokens.length) : 0
                  const cost = view.daily.reduce((s, d) => s + d.cost, 0)
                  return [
                    ['最高单日', fmtTokens(max)],
                    ['最低单日', fmtTokens(min)],
                    ['日均', fmtTokens(avg)],
                    ['区间费用', `¥ ${cost.toFixed(2)}`],
                  ]
                })().map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-paper px-2.5 py-2">
                    <p className="text-[9px] text-admin-muted">{l}</p>
                    <p className="mt-0.5 font-mono text-[11px]">{v}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel kicker="By model" title="模型占比">
              <div className="flex items-center gap-4">
                <Donut data={view.byModel} size={118} thickness={14} centerValue={view.monthTokens} centerLabel="TOKENS" />
                <Legend className="flex-1" data={view.byModel.map((m) => ({ label: m.label, value: `${m.value}%`, color: m.color }))} />
              </div>
            </Panel>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
            <Panel kicker="Logs" title="调用日志" desc={real ? '最近真实请求（服务端记账）' : '未接服务端：暂无调用日志'} flush>
              <div className="overflow-x-auto no-scrollbar">
                <div className="admin-zebra min-w-[620px]">
                  <TableHead cols={['时间', '模型', '场景', 'Token', '耗时', '状态']} template="120px 150px minmax(0,1fr) 72px 66px 72px" />
                  <LoadState loading={loading} error={error} onRetry={() => void load()} label="正在加载调用日志…">
                    {logs.length === 0 ? (
                      <p className="px-4 py-6 text-center text-[11px] text-admin-muted">{real ? '还没有调用记录' : '未接服务端，无法读取调用日志'}</p>
                    ) : (
                      logs.slice(0, 8).map((r, i) => (
                        <div
                          key={r.id ? `${r.id}-${i}` : `log-${i}`}
                          className="grid grid-cols-[120px_150px_minmax(0,1fr)_72px_66px_72px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[10.5px] last:border-0 hover:bg-lime/20"
                        >
                          <span className="font-mono text-[9.5px] text-admin-muted">
                            {new Date(r.ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                          <span className="truncate">{r.model}</span>
                          <span className="truncate text-admin-muted">{r.source === 'retrieval' ? '站内检索摘录' : r.source === 'preset' ? '预置问答' : '模型生成'}</span>
                          <span className="font-mono text-admin-muted">{String(r.tokens ?? 0)}</span>
                          <span className="font-mono text-admin-muted">{`${r.latency ?? 0}ms`}</span>
                          <Status>{r.ok ? '成功' : '失败'}</Status>
                        </div>
                      ))
                    )}
                  </LoadState>
                </div>
              </div>
            </Panel>

            <div className="space-y-3">
              <Panel kicker="Feedback" title="助手反馈（真实）" desc={real ? '来自 /api/ai/feedback' : '未接服务端'} flush>
                <div className="divide-y divide-ink/10">
                  {feedback.slice(0, 6).map((f) => (
                    <div key={f.id} className="flex items-center gap-2 px-4 py-2.5 text-[11px]">
                      <Badge tone={f.rating === 'up' ? 'teal' : 'red'}>{f.rating === 'up' ? '👍' : '👎'}</Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{f.reason || '未填写原因'}</p>
                        <p className="font-mono text-[9px] text-admin-muted">{new Date(f.ts).toLocaleString('zh-CN')} · {f.sessionId.slice(0, 10)}</p>
                      </div>
                      {f.reviewed ? (
                        <Badge tone="neutral">已处理</Badge>
                      ) : (
                        <AButton
                          size="sm"
                          variant="soft"
                          onClick={() => {
                            void reviewFeedback(f.id)
                              .then(() => {
                                setFeedback((l) => l.map((x) => (x.id === f.id ? { ...x, reviewed: true } : x)))
                                show('已标记为处理')
                              })
                              .catch((err: Error) => show(`操作失败：${err.message}`))
                          }}
                        >
                          标记
                        </AButton>
                      )}
                    </div>
                  ))}
                  {feedback.length === 0 && <p className="px-4 py-6 text-center text-[11px] text-admin-muted">还没有反馈</p>}
                </div>
              </Panel>

              <Panel kicker="Quota" title="额度与限流" desc={real ? '后台可热改的覆盖值，保存后立即回显' : '未接服务端：只读，编辑保存已禁用'}>
                {!real && <ReadOnlyNotice show>未接服务端：额度与限流无法编辑。</ReadOnlyNotice>}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-admin-muted">本月已用</span>
                  <span className="font-mono">
                    {view.monthTokens} / {fmtTokens(view.limit)}
                  </span>
                </div>
                <Meter value={tokenPercent} color={tokenPercent > 80 ? 'rgb(var(--c-coral))' : 'rgb(var(--c-teal))'} className="mt-2 h-2" />
                <div className="mt-3 grid gap-3">
                  <Field label="每月额度（tokens）">
                    <Input value={quota.monthlyTokenBudget} onChange={(e) => setQuota({ ...quota, monthlyTokenBudget: e.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="3000000" disabled={!real || busy} />
                  </Field>
                  <Field label="每日调用上限（次）">
                    <Input value={quota.dailyQuota} onChange={(e) => setQuota({ ...quota, dailyQuota: e.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="100" disabled={!real || busy} />
                  </Field>
                  <Field label="单访客每日上限（次）">
                    <Input value={quota.perVisitorDailyLimit} onChange={(e) => setQuota({ ...quota, perVisitorDailyLimit: e.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="20" disabled={!real || busy} />
                  </Field>
                  <Field label="默认备用模型" hint="故障切换未指定目标时优先使用">
                    <Select value={quota.fallbackModelId} onChange={(e) => setQuota({ ...quota, fallbackModelId: e.target.value })} disabled={!real || busy}>
                      <option value="">自动选择（下一个启用模型）</option>
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <AButton variant="primary" className="mt-3 w-full" icon={<Activity size={12} />} disabled={!real || busy || loading} onClick={() => void saveQuota()}>
                  保存设置
                </AButton>
                {aiSettings?.note && <p className="mt-2 text-[9.5px] leading-relaxed text-admin-muted">{aiSettings.note}</p>}
              </Panel>

              <Panel kicker="Maintenance" title="用量与缓存维护" desc="清空操作立即作用于服务端 ai.json">
                <div className="grid grid-cols-2 gap-2">
                  <AButton size="sm" variant="soft" icon={<Trash2 size={11} />} disabled={!real || busy} onClick={() => void resetUsage()}>
                    清空用量记录
                  </AButton>
                  <AButton size="sm" variant="soft" icon={<Trash2 size={11} />} disabled={!real || busy} onClick={() => void clearCache()}>
                    清空回答缓存
                  </AButton>
                </div>
                {!real && <p className="mt-2 text-[10px] text-admin-muted">未接服务端：清空操作已禁用。</p>}
              </Panel>

              <Panel kicker="Health" title="服务健康（静态示意）" desc="真实可用的是「测试连接」与 /api/ai/health">
                <div className="space-y-2 text-[10.5px]">
                  {[
                    ['网关可用性', '99.98%', 'teal'],
                    ['平均排队', '40ms', 'teal'],
                    ['失败重试', '3 次 / 天', 'amber'],
                  ].map(([k, v, tone]) => (
                    <div key={k} className="flex items-center justify-between border-b border-ink/10 pb-1.5 last:border-0">
                      <span className="text-admin-muted">{k}</span>
                      <Badge tone={tone as 'teal' | 'amber'}>{v}</Badge>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </div>
      )}

      <AdminModal
        open={adding}
        onClose={() => setAdding(false)}
        title="接入新模型"
        desc="密钥仅保存在服务端，不会下发到浏览器。"
        footer={
          <>
            <AButton onClick={() => setAdding(false)}>取消</AButton>
            <AButton
              variant="primary"
              disabled={!real || busy}
              onClick={() => {
                if (!real) return show('未接服务端：接入模型需配置 VITE_API_BASE，刷新不会保留')
                if (!draft.name.trim() || !draft.model.trim()) return show('请填写名称与模型 ID')
                void (async () => {
                  setBusy(true)
                  try {
                    const created = await apiJson<ServerModel>('/api/ai/models', {
                      method: 'POST',
                      body: JSON.stringify({ name: draft.name, provider: draft.provider, model: draft.model }),
                    })
                    setModels((l) => [
                      ...l,
                      {
                        id: created.id,
                        name: created.name,
                        provider: created.provider,
                        model: created.model,
                        key: '服务端托管',
                        enabled: created.enabled,
                        isDefault: created.isDefault,
                        latency: '—',
                        cost: '按官方计价',
                        context: draft.context,
                        calls: 0,
                      },
                    ])
                    setAdding(false)
                    show('模型已写入服务端，默认停用；密钥请配到服务端环境变量')
                  } catch (err) {
                    show(`接入失败：${errMsg(err)}`)
                  } finally {
                    setBusy(false)
                  }
                })()
              }}
            >
              接入并保存
            </AButton>
          </>
        }
      >
        <ReadOnlyNotice show={!real}>未接服务端：接入模型已禁用，保存按钮不可用；这里仅可查看表单。</ReadOnlyNotice>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="显示名称">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="例如：豆包 Pro" disabled={!real} />
          </Field>
          <Field label="供应商">
            <Select value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} disabled={!real}>
              {['DeepSeek', 'OpenAI', '阿里云', '智谱', '字节跳动'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="模型 ID">
            <Input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="deepseek-chat" disabled={!real} />
          </Field>
          <Field label="上下文">
            <Select value={draft.context} onChange={(e) => setDraft({ ...draft, context: e.target.value })} disabled={!real}>
              {['32k', '64k', '128k', '200k'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="API Key" className="sm:col-span-2" hint="支持环境变量注入，例如 $DEEPSEEK_KEY">
            <Input type="password" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} placeholder="sk-..." disabled={!real} />
          </Field>
        </div>
      </AdminModal>

      <AdminModal
        open={editingPrompt !== null}
        onClose={() => setEditingPrompt(null)}
        title={editingPrompt?.name ? '编辑提示词' : '新建提示词'}
        desc="建议把约束写成「目标 / 约束 / 验收」三段式。"
        width="max-w-2xl"
        footer={
          <>
            <AButton onClick={() => setEditingPrompt(null)}>取消</AButton>
            {editingPrompt && editingPrompt.id !== 'new' && real && (
              <AButton icon={<RotateCcw size={12} />} disabled={busy} onClick={() => void rollbackPrompt()}>
                回滚上一版
              </AButton>
            )}
            <AButton
              variant="primary"
              icon={<Sparkles size={12} />}
              disabled={!real || busy}
              onClick={() => {
                if (!real) return show('未接服务端：提示词保存需配置 VITE_API_BASE')
                void (async () => {
                  const name = promptDraft.name.trim()
                  if (!name) return show('请填写名称')
                  setBusy(true)
                  try {
                    const isNew = !editingPrompt || editingPrompt.id === 'new'
                    const localRow: PromptRow = {
                      id: isNew ? newId('p') : (editingPrompt?.id as string),
                      name,
                      scene: promptDraft.scene || '全站对话',
                      model: promptDraft.model || 'DeepSeek Chat',
                      updated: new Date().toISOString().slice(0, 10),
                      enabled: isNew ? true : promptDraft.body.trim().length > 0,
                      tokens: Math.round(promptDraft.body.length / 2),
                      body: promptDraft.body,
                    }
                    const req = isNew
                      ? apiJson<{ id: string; version: number }>('/api/ai/prompts', {
                          method: 'POST',
                          body: JSON.stringify({ name, scene: localRow.scene, body: promptDraft.body }),
                        })
                      : apiJson<{ id: string; version: number; active: boolean }>(`/api/ai/prompts/${localRow.id}`, {
                          method: 'PUT',
                          body: JSON.stringify({ name, body: promptDraft.body }),
                        })
                    const res = await req
                    const saved: PromptRow = { ...localRow, id: res.id, model: `v${res.version}` }
                    setPrompts((l) => (isNew ? [saved, ...l] : l.map((x) => (x.id === saved.id ? { ...x, ...saved } : x))))
                    setEditingPrompt(null)
                    show(`提示词已保存到服务端 · 版本 v${res.version}，下一次对话生效`)
                  } catch (err) {
                    show(`保存失败：${errMsg(err)}`)
                  } finally {
                    setBusy(false)
                  }
                })()
              }}
            >
              保存模板
            </AButton>
          </>
        }
      >
        <ReadOnlyNotice show={!real}>未接服务端：提示词保存 / 回滚已禁用，这里仅可查看内容。</ReadOnlyNotice>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="名称">
            <Input value={promptDraft.name} onChange={(e) => setPromptDraft({ ...promptDraft, name: e.target.value })} disabled={!real} />
          </Field>
          <Field label="关联场景">
            <Select value={promptDraft.scene} onChange={(e) => setPromptDraft({ ...promptDraft, scene: e.target.value })} disabled={!real}>
              {['全站对话', '简历解析', '内容管理', '互动审核'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="使用模型" className="sm:col-span-2">
            <Select value={promptDraft.model} onChange={(e) => setPromptDraft({ ...promptDraft, model: e.target.value })} disabled={!real}>
              {models.map((m) => (
                <option key={m.id}>{m.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="提示词正文" className="sm:col-span-2">
            <Textarea value={promptDraft.body} onChange={(e) => setPromptDraft({ ...promptDraft, body: e.target.value })} rows={9} className="font-mono text-[11px]" disabled={!real} />
          </Field>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-admin-muted">
          <span>约 {Math.round(promptDraft.body.length / 2)} tokens</span>
          <IconButton label="复制" onClick={() => void navigator.clipboard?.writeText(promptDraft.body).then(() => show('提示词已复制'))}>
            <KeyRound size={11} />
          </IconButton>
        </div>
      </AdminModal>
    </div>
  )
}
