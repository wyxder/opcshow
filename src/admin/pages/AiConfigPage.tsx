import { Activity, Bot, Check, Cpu, KeyRound, Plus, Sparkles, Trash2, Wand2, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { aiModels as modelSeed, aiUsage, prompts as promptSeed } from '@/admin/data'
import { serverConfig } from '@/services/config'
import { deleteModel, deletePrompt, getFeedback, reviewFeedback, type FeedbackRow } from '@/services/admin'
import { apiJson } from '@/services/http'
import {
  AButton,
  AdminModal,
  Badge,
  Donut,
  Field,
  IconButton,
  Input,
  Legend,
  Meter,
  MiniBars,
  PageTitle,
  Panel,
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
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', provider: 'DeepSeek', model: '', key: '', context: '64k' })
  const [editingPrompt, setEditingPrompt] = useState<PromptRow | null>(null)
  const [promptDraft, setPromptDraft] = useState({ name: '', scene: '', model: '', body: '' })
  const [limit, setLimit] = useState('3000000')
  const [feedback, setFeedback] = useState<FeedbackRow[]>([])

  /** F-01：配置页接服务端真实读写；未接服务端时保持纯演示态并在文案里说清楚 */
  useEffect(() => {
    if (!real) return
    let alive = true
    void Promise.all([
      apiJson<{ models: ServerModel[] }>('/api/ai/models').catch(() => null),
      apiJson<ServerPrompt[]>('/api/ai/prompts').catch(() => null),
      apiJson<UsageSummary>('/api/ai/usage').catch(() => null),
    ]).then(([m, p, u]) => {
      if (!alive) return
      if (m?.models) setModels(m.models.map(toModelRow))
      if (p) setPrompts(p.map(toPromptRow))
      if (u) setUsage(u)
    })
    void getFeedback().then((f) => alive && setFeedback(f))
    return () => {
      alive = false
    }
  }, [real])

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
  /** AI-06：只有真的拿到 /api/ai/usage 才标「服务端记账」，否则如实标预置 */
  const usageLive = Boolean(usage) && real
  const tokenPercent = Math.round((view.usedTokens / Number(limit || 1)) * 100)

  /** 真实模式下写操作必须等服务端返回成功再提示 */
  const patchModel = async (id: string, patch: { enabled?: boolean; isDefault?: boolean }, okMsg: string) => {
    if (!real) {
      setModels((l) =>
        l.map((x) =>
          patch.isDefault
            ? { ...x, isDefault: x.id === id, enabled: x.id === id ? true : x.enabled }
            : x.id === id
              ? { ...x, enabled: patch.enabled ?? x.enabled, isDefault: patch.enabled === false ? false : x.isDefault }
              : x,
        ),
      )
      show(`${okMsg}（演示：仅本页）`)
      return
    }
    try {
      const updated = await apiJson<ServerModel>(`/api/ai/models/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      setModels((l) => l.map((x) => (x.id === id ? { ...x, enabled: updated.enabled, isDefault: updated.isDefault } : patch.isDefault ? { ...x, isDefault: false } : x)))
      show(okMsg)
    } catch (err) {
      show(`保存失败：${(err as Error).message}`)
    }
  }

  const openPrompt = (p: (typeof promptSeed)[number]) => {
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
            : '未配置服务端：这里的改动只存在当前页面，刷新即丢失，不会影响任何线上会话。'
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
                        onClick={() => {
                          void patchModel(m.id, { isDefault: true }, `${m.name} 已设为默认模型`)
                        }}
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border transition',
                          m.isDefault ? 'border-ink bg-ink text-lime' : 'border-ink/20 text-transparent hover:border-ink/40',
                        )}
                        aria-label="设为默认"
                      >
                        <Check size={11} />
                      </button>
                      <Toggle
                        on={m.enabled}
                        label={m.name}
                        onChange={(v) => {
                          void patchModel(m.id, { enabled: v }, v ? `${m.name} 已启用` : `${m.name} 已停用`)
                        }}
                      />
                      <IconButton
                        label="删除模型"
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
                  <AButton
                    size="sm"
                    icon={<Zap size={11} />}
                    onClick={() => {
                      if (!real) return show('连接测试通过（演示，未真实请求）')
                      void apiJson<{ mode: string; model: string; index?: { chunks?: number } }>('/api/ai/health')
                        .then((h) =>
                          show(
                            h.mode === 'model'
                              ? `网关正常 · 模型可用 · 索引 ${h.index?.chunks ?? 0} 块`
                              : '网关正常 · 未配置模型密钥，当前走站内检索摘录',
                          ),
                        )
                        .catch((err: Error) => show(`连接失败：${err.message}`))
                    }}
                  >
                    测试连接
                  </AButton>
                  <AButton size="sm" variant="soft" onClick={() => show(real ? '故障切换需要服务端路由策略，当前版本未实现' : '已切换至备用模型（演示）')}>
                    故障切换
                  </AButton>
                </div>
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
                    onChange={(v) => {
                      if (!real) {
                        setPrompts((l) => l.map((x) => (x.id === p.id ? { ...x, enabled: v } : x)))
                        show(`${v ? '提示词已启用' : '提示词已停用'}（演示：仅本页）`)
                        return
                      }
                      void apiJson(`/api/ai/prompts/${p.id}`, { method: 'PUT', body: JSON.stringify({ active: v }) })
                        .then(() => {
                          setPrompts((l) => l.map((x) => (x.id === p.id ? { ...x, enabled: v } : x)))
                          show(v ? '提示词已启用，下一次对话生效' : '提示词已停用')
                        })
                        .catch((err: Error) => show(`保存失败：${err.message}`))
                    }}
                  />
                </div>
              ))}
            </div>
          </Panel>

          <div className="space-y-3">
            <Panel kicker="Guardrails" title="全局约束" desc="只读：定义在 server/ai/prompts.mjs，随服务端发布生效">
              <Textarea
                defaultValue="回答必须基于站内已发布的内容；不确定时直说不知道。不要编造项目指标、获奖或个人信息。涉及联系方式时优先引导到留言板。"
                rows={6}
                readOnly
                className="text-[11px] opacity-80"
              />
              <AButton className="mt-2 w-full" onClick={() => show('全局约束在 server/ai/prompts.mjs 中，需随服务端发版修改')}>
                查看修改方式
              </AButton>
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
            <Panel kicker="Logs" title="调用日志" desc={real ? '最近 8 次真实请求（服务端记账）' : '预置演示数据'} flush>
              <div className="overflow-x-auto no-scrollbar">
                <div className="admin-zebra min-w-[620px]">
                  <TableHead cols={['时间', '模型', '场景', 'Token', '耗时', '状态']} template="120px 150px minmax(0,1fr) 72px 66px 72px" />
                  {(real && view.recent.length
                    ? view.recent.slice(0, 8).map((r) => [
                        new Date(r.ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
                        r.model,
                        r.source === 'retrieval' ? '站内检索摘录' : '模型生成',
                        String(r.tokens ?? 0),
                        `${r.latency ?? 0}ms`,
                        r.ok ? '成功' : '失败',
                      ])
                    : [
                        ['10-30 10:21', 'DeepSeek Chat', '站点助手 · 简历问答', '1,842', '820ms', '成功'],
                        ['10-30 10:18', 'DeepSeek Chat', '站点助手 · 项目咨询', '2,410', '1.1s', '成功'],
                        ['10-30 09:56', 'GPT-4o mini', '简历摘要生成', '3,208', '1.4s', '成功'],
                        ['10-30 09:40', 'DeepSeek Chat', '留言审核分类', '486', '640ms', '成功'],
                        ['10-30 09:12', 'DeepSeek Chat', '站点助手 · 超时重试', '—', '3.0s', '超时'],
                      ]
                  ).map((r) => (
                    <div
                      key={r[0] + r[2]}
                      className="grid grid-cols-[120px_150px_minmax(0,1fr)_72px_66px_72px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[10.5px] last:border-0 hover:bg-lime/20"
                    >
                      <span className="font-mono text-[9.5px] text-admin-muted">{r[0]}</span>
                      <span className="truncate">{r[1]}</span>
                      <span className="truncate text-admin-muted">{r[2]}</span>
                      <span className="font-mono text-admin-muted">{r[3]}</span>
                      <span className="font-mono text-admin-muted">{r[4]}</span>
                      <Status>{r[5]}</Status>
                    </div>
                  ))}
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

              <Panel kicker="Quota" title="额度与限流">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-admin-muted">本月已用</span>
                  <span className="font-mono">
                    {view.monthTokens} / {fmtTokens(view.limit)}
                  </span>
                </div>
                <Meter value={tokenPercent} color={tokenPercent > 80 ? 'rgb(var(--c-coral))' : 'rgb(var(--c-teal))'} className="mt-2 h-2" />
                <div className="mt-3 grid gap-3">
                  <Field label="每月额度（tokens）">
                    <Input value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ''))} />
                  </Field>
                  <Field label="单访客每日上限">
                    <Select defaultValue="30 次">
                      {['10 次', '20 次', '30 次', '不限'].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <AButton
                  variant="primary"
                  className="mt-3 w-full"
                  icon={<Activity size={12} />}
                  onClick={() => show('额度与日限流由服务端环境变量控制（AI_DAILY_QUOTA / AI_MONTHLY_TOKEN_BUDGET），后台暂不支持热改')}
                >
                  保存设置
                </AButton>
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
              onClick={() => {
                if (!draft.name.trim() || !draft.model.trim()) return show('请填写名称与模型 ID')
                const row: ModelRow = {
                  id: newId('m'),
                  name: draft.name,
                  provider: draft.provider,
                  model: draft.model,
                  key: real ? '服务端托管' : `sk-••••••••${Math.random().toString(16).slice(2, 6)}`,
                  enabled: false,
                  isDefault: false,
                  latency: '—',
                  cost: '按官方计价',
                  context: draft.context,
                  calls: 0,
                }
                if (!real) {
                  setModels((l) => [...l, row])
                  setAdding(false)
                  show('模型已加入本页（演示：刷新丢失）')
                  return
                }
                void apiJson<ServerModel>('/api/ai/models', {
                  method: 'POST',
                  body: JSON.stringify({ name: draft.name, provider: draft.provider, model: draft.model }),
                })
                  .then((created) => {
                    setModels((l) => [...l, { ...row, ...toModelRow(created), context: draft.context }])
                    setAdding(false)
                    show('模型已写入服务端，默认停用；密钥请配到服务端环境变量')
                  })
                  .catch((err: Error) => show(`接入失败：${err.message}`))
              }}
            >
              测试并保存
            </AButton>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="显示名称">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="例如：豆包 Pro" />
          </Field>
          <Field label="供应商">
            <Select value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })}>
              {['DeepSeek', 'OpenAI', '阿里云', '智谱', '字节跳动'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="模型 ID">
            <Input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="deepseek-chat" />
          </Field>
          <Field label="上下文">
            <Select value={draft.context} onChange={(e) => setDraft({ ...draft, context: e.target.value })}>
              {['32k', '64k', '128k', '200k'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="API Key" className="sm:col-span-2" hint="支持环境变量注入，例如 $DEEPSEEK_KEY">
            <Input type="password" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} placeholder="sk-..." />
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
            <AButton
              variant="primary"
              icon={<Sparkles size={12} />}
              onClick={() => {
                const name = promptDraft.name.trim()
                if (!name) return show('请填写名称')
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
                if (!real) {
                  setPrompts((l) => (isNew ? [localRow, ...l] : l.map((x) => (x.id === localRow.id ? { ...x, ...localRow } : x))))
                  setEditingPrompt(null)
                  show('提示词已保存（演示：仅本页）')
                  return
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
                void req
                  .then((res) => {
                    const saved: PromptRow = { ...localRow, id: res.id, model: `v${res.version}` }
                    setPrompts((l) => (isNew ? [saved, ...l] : l.map((x) => (x.id === saved.id ? { ...x, ...saved } : x))))
                    setEditingPrompt(null)
                    show(`提示词已保存到服务端 · 版本 v${res.version}，下一次对话生效`)
                  })
                  .catch((err: Error) => show(`保存失败：${err.message}`))
              }}
            >
              保存模板
            </AButton>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="名称">
            <Input value={promptDraft.name} onChange={(e) => setPromptDraft({ ...promptDraft, name: e.target.value })} />
          </Field>
          <Field label="关联场景">
            <Select value={promptDraft.scene} onChange={(e) => setPromptDraft({ ...promptDraft, scene: e.target.value })}>
              {['全站对话', '简历解析', '内容管理', '互动审核'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="使用模型" className="sm:col-span-2">
            <Select value={promptDraft.model} onChange={(e) => setPromptDraft({ ...promptDraft, model: e.target.value })}>
              {models.map((m) => (
                <option key={m.id}>{m.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="提示词正文" className="sm:col-span-2">
            <Textarea value={promptDraft.body} onChange={(e) => setPromptDraft({ ...promptDraft, body: e.target.value })} rows={9} className="font-mono text-[11px]" />
          </Field>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-admin-muted">
          <span>约 {Math.round(promptDraft.body.length / 2)} tokens</span>
          <IconButton label="复制" onClick={() => void navigator.clipboard?.writeText(editingPrompt?.body ?? promptDraft.body).then(() => show('提示词已复制'))}>
            <KeyRound size={11} />
          </IconButton>
        </div>
      </AdminModal>
    </div>
  )
}
