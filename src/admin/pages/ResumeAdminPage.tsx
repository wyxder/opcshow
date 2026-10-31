import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { resumeModules, resumeParse, resumeVersions } from '@/admin/data'
import {
  AButton,
  AdminModal,
  Badge,
  EmptyState,
  Field,
  IconButton,
  Input,
  LoadState,
  Meter,
  PageTitle,
  Panel,
  ReadOnlyNotice,
  Status,
  TableHead,
  Tabs,
  Toggle,
} from '@/admin/ui'
import { cn, newId } from '@/lib/utils'
import {
  createResumeVersion,
  deleteResumeVersion,
  getResumeState,
  restoreResumeVersion,
  saveResumeModules,
  type ResumeModule,
  type ResumeVersion,
} from '@/services/admin'
import { serverConfig } from '@/services/config'
import { apiJson } from '@/services/http'

type Tab = 'parse' | 'modules' | 'versions'
type Job = {
  id: string
  status: string
  result?: { fileName?: string; fields?: { key: string; value: string; confidence: number }[]; engine?: string }
  error?: string
}

const real = serverConfig.enabled
const DEMO_NOTE = '当前未配置服务端（VITE_API_BASE），解析、模块调整、版本创建 / 恢复 / 删除均已禁用。'

const seedModules: ResumeModule[] = resumeModules.map((m, i) => ({
  id: `seed_${i}`,
  title: m.title,
  summary: m.desc,
  items: Array.from({ length: m.count }, (_, k) => `示例条目 ${k + 1}`),
  enabled: m.enabled,
}))
const seedVersions: ResumeVersion[] = resumeVersions.map((v, i) => ({
  id: `seedv_${i}`,
  name: v.version,
  note: v.note,
  source: 'seed',
  createdAt: `${v.date}T00:00:00.000Z`,
  modules: [],
}))

const fmtDate = (iso?: string) => {
  const d = new Date(iso ?? '')
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN')
}

export default function ResumeAdminPage({
  tab,
  setTab,
  show,
}: {
  tab: Tab
  setTab: (t: Tab) => void
  show: (m: string) => void
}) {
  const [modules, setModules] = useState<ResumeModule[]>(real ? [] : seedModules)
  const [versions, setVersions] = useState<ResumeVersion[]>(real ? [] : seedVersions)
  const [loading, setLoading] = useState(real)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const [parsing, setParsing] = useState(false)
  const [fields, setFields] = useState<{ key: string; value: string; confidence: number }[] | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [jobNote, setJobNote] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const lastText = useRef('')

  const [rollback, setRollback] = useState<ResumeVersion | null>(null)
  const [releasing, setReleasing] = useState(false)
  const [release, setRelease] = useState({ name: '', note: '' })
  const [addOpen, setAddOpen] = useState(false)
  const [addDraft, setAddDraft] = useState({ title: '', summary: '' })
  const [formError, setFormError] = useState('')

  const load = useCallback(async (spinner = true) => {
    if (!real) {
      setModules(seedModules)
      setVersions(seedVersions)
      setDirty(false)
      setLoading(false)
      setError('')
      return
    }
    if (spinner) setLoading(true)
    setError('')
    try {
      const state = await getResumeState()
      if (state) {
        setModules(state.modules)
        setVersions(state.versions)
        setDirty(false)
      }
    } catch (err) {
      setError(`简历数据加载失败：${(err as Error).message}`)
    } finally {
      if (spinner) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const enabledCount = modules.filter((m) => m.enabled).length

  const move = (index: number, dir: -1 | 1) => {
    if (!real) return
    const next = [...modules]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setModules(next)
    setDirty(true)
  }

  const submitParse = async (text: string, name: string) => {
    if (!real) return show('未配置服务端，解析不可用')
    if (text.trim().length < 10) return show('文本太短，至少 10 个字符')
    setParsing(true)
    setJobNote(null)
    try {
      const job = await apiJson<Job>('/api/resume/parse', {
        method: 'POST',
        body: JSON.stringify({ text, fileName: name }),
      })
      for (let i = 0; i < 20; i += 1) {
        const cur = await apiJson<Job>(`/api/jobs/${job.id}`)
        if (cur.status === 'completed') {
          setFields(cur.result?.fields ?? null)
          setFileName(cur.result?.fileName ?? name)
          setJobNote(`服务端解析（${cur.result?.engine ?? 'local-rules'}）：${cur.result?.fields?.length ?? 0} 个字段`)
          await load(false)
          show('解析完成，模块与版本已写入服务端')
          return
        }
        if (cur.status === 'dead' || cur.status === 'failed') {
          setJobNote(`任务失败：${cur.error ?? '未知原因'}`)
          show(`解析失败：${cur.error ?? '未知原因'}`)
          return
        }
        await new Promise((r) => window.setTimeout(r, 600))
      }
      setJobNote('任务仍在队列中，可稍后刷新查看')
      show('解析任务已提交，仍在处理')
    } catch (err) {
      setJobNote(`解析失败：${(err as Error).message}`)
      show(`解析失败：${(err as Error).message}`)
    } finally {
      setParsing(false)
    }
  }

  const runParse = () => {
    if (!real) return show('未配置服务端，解析不可用')
    if (lastText.current) return void submitParse(lastText.current, fileName ?? 'resume.txt')
    fileRef.current?.click()
  }

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    const isText = /\.(txt|md|markdown)$/i.test(file.name)
    if (!isText) {
      show('服务端目前只能解析纯文本（.txt / .md）；PDF / DOCX 需要 pdfjs / mammoth，尚未接入')
      return
    }
    const text = await file.text()
    lastText.current = text
    setFileName(file.name)
    await submitParse(text, file.name)
  }

  const saveModules = async () => {
    if (!real) return show('未配置服务端，无法保存')
    if (!dirty) return show('没有需要保存的修改')
    if (saving) return
    setSaving(true)
    try {
      setModules(await saveResumeModules(modules))
      setDirty(false)
      show('模块顺序与开关已保存')
    } catch (err) {
      show(`保存失败：${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const syncFields = async () => {
    if (!real) return show('未配置服务端，不能保存')
    if (!fields?.length) return show('先上传一份简历并解析')
    if (busy) return
    setBusy('sync')
    try {
      const next: ResumeModule[] = fields.map((f) => ({ id: `f_${f.key}`, title: f.key, summary: f.value, items: [], enabled: true }))
      setModules(await saveResumeModules(next))
      setDirty(false)
      show('字段已写入简历模块')
    } catch (err) {
      show(`保存失败：${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  const createVersion = async () => {
    if (!real) return setFormError(DEMO_NOTE)
    if (!release.name.trim()) return setFormError('版本名不能为空')
    if (busy) return
    setBusy('version-create')
    setFormError('')
    try {
      await createResumeVersion({ name: release.name.trim(), note: release.note.trim(), modules })
      setReleasing(false)
      await load(false)
      show(`已创建版本 ${release.name.trim()}`)
    } catch (err) {
      setFormError(`创建失败：${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  const confirmRollback = async () => {
    if (!rollback) return
    if (!real) return show('未配置服务端，不能恢复版本')
    if (busy) return
    setBusy('version-restore')
    try {
      await restoreResumeVersion(rollback.id)
      setRollback(null)
      await load(false)
      show('已恢复该版本的模块')
    } catch (err) {
      show(`恢复失败：${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  const removeVersion = async (v: ResumeVersion) => {
    if (!real) return show('未配置服务端，不能删除版本')
    if (!window.confirm(`删除版本「${v.name}」？不可恢复。`)) return
    if (busy) return
    setBusy(`version-delete-${v.id}`)
    try {
      await deleteResumeVersion(v.id)
      await load(false)
      show('版本已删除')
    } catch (err) {
      show(`删除失败：${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  const currentFile = fileName ?? (real ? '尚未上传简历文件' : resumeParse.file)
  const extracted = fields ?? (real ? [] : resumeParse.extracted)

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Resume"
        title="简历管理"
        desc={
          real
            ? '上传纯文本简历 → 服务端任务解析为结构化字段；模块开关决定前台简历的展示内容。'
            : '演示只读数据：解析、模块调整与版本操作全部禁用，刷新后不会保存任何内容。'
        }
        right={
          <>
            <AButton icon={<Download size={13} />} onClick={() => window.open('/files/wyx-resume-print.html', '_blank')}>
              打印版
            </AButton>
            <AButton
              variant="primary"
              icon={parsing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              onClick={runParse}
              disabled={!real || parsing}
              title={real ? '' : '未配置服务端：解析不可用'}
            >
              {parsing ? '解析中…' : '重新解析'}
            </AButton>
          </>
        }
      />

      <ReadOnlyNotice show={!real}>
        {DEMO_NOTE} 配置 <span className="font-mono text-[9.5px]">VITE_API_BASE</span> 并登录后自动启用。
      </ReadOnlyNotice>

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        items={[
          { key: 'parse', label: '解析' },
          { key: 'modules', label: '模块', count: enabledCount },
          { key: 'versions', label: '版本', count: versions.length },
        ]}
      />

      {tab === 'parse' && (
        <div className="grid gap-3 xl:grid-cols-[1.25fr_1fr]">
          <div className="space-y-3">
            <Panel kicker="Source" title="当前简历文件">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-dashed border-ink/25 bg-paper p-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-coral/15 text-admin-danger">
                  <FileText size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium">{currentFile}</p>
                  <p className="mt-0.5 font-mono text-[9.5px] text-admin-muted">
                    {real ? '服务端仅解析 .txt / .md' : `${resumeParse.size} · ${resumeParse.pages} 页 · 预置演示`}
                  </p>
                </div>
                <Status>{parsing ? '解析中' : fields ? '已解析' : real ? '未解析' : resumeParse.state}</Status>
              </div>
              {jobNote && <p className="mt-2 font-mono text-[9.5px] leading-relaxed text-admin-muted">{jobNote}</p>}
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.markdown,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  void pickFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />

              <div className="mt-3 rounded-xl border-1.5 border-ink/20 p-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-admin-muted">解析进度</span>
                  <span className="font-mono text-[10.5px]">{parsing ? '进行中…' : real ? (fields ? '100%' : '0%') : '预置'}</span>
                </div>
                <Meter
                  value={parsing ? 62 : real ? (fields ? 100 : 0) : 100}
                  color={parsing ? 'rgb(var(--c-amber))' : real && !fields ? 'rgb(var(--c-ink))' : 'rgb(var(--c-teal))'}
                  className="mt-2 h-2"
                />
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ['解析耗时', fields ? '见任务记录' : real ? '—' : '4.2s'],
                    ['识别准确率', fields ? '按字段置信度' : real ? '—' : '96%'],
                    ['结构化字段', fields ? String(fields.length) : real ? '0' : '18'],
                    ['使用引擎', fields ? 'local-rules' : real ? '—' : '预置演示'],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-lg border border-ink/10 bg-paper px-2 py-1.5">
                      <p className="text-[9.5px] text-admin-muted">{l}</p>
                      <p className="mt-0.5 font-mono text-[11px] font-medium">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <AButton
                  icon={parsing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  onClick={runParse}
                  disabled={!real || parsing}
                  title={real ? '' : '未配置服务端：解析不可用'}
                >
                  {parsing ? '解析中…' : '用 AI 重新解析'}
                </AButton>
                <AButton
                  onClick={() => fileRef.current?.click()}
                  disabled={!real || parsing}
                  title={real ? '' : '未配置服务端：上传不可用'}
                >
                  上传新文件
                </AButton>
                <AButton variant="soft" onClick={() => window.open('/work/resume', '_blank')}>
                  预览前台简历
                </AButton>
              </div>
            </Panel>

            <Panel kicker="Pipeline" title="解析流水线（静态示意）" desc="当前实现为本地规则抽取，耗时与分区数为版式示意">
              <ol className="relative space-y-3 pl-5">
                <span className="absolute left-[5px] top-1 h-[calc(100%-8px)] w-px bg-ink/15" />
                {[
                  ['文件上传与校验', '1.2s', 'PDF 1.2 MB，未加密'],
                  ['版面分析 (Layout)', '0.9s', '识别 2 页、3 个分区'],
                  ['结构化抽取', '1.6s', '18 个字段，7 个项目'],
                  ['一致性与缺省校验', '0.5s', '无缺失字段'],
                ].map(([title, time, note]) => (
                  <li key={title} className="relative">
                    <span className="absolute -left-5 top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full border border-admin-teal bg-cream" />
                    <p className="flex items-center justify-between text-[11.5px] font-medium">
                      {title} <span className="font-mono text-[9.5px] text-admin-muted">{time}</span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-admin-muted">{note}</p>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel
              kicker="Extracted"
              title="抽取结果"
              desc={real ? '置信度低于 90% 的字段建议人工核对' : '以下为预置演示字段，不代表真实简历'}
              right={
                <Badge tone={fields ? 'teal' : 'neutral'}>
                  {fields ? '服务端结果' : real ? '未解析' : '预置'} · {extracted.length} 个字段
                </Badge>
              }
            >
              <LoadState loading={loading} error={error} onRetry={() => void load()} label="正在加载简历数据…">
                {extracted.length === 0 ? (
                  <EmptyState title="还没有解析结果" desc="上传 .txt / .md 简历后，服务端会把字段解析到这里" />
                ) : (
                  <div className="space-y-2.5">
                    {extracted.map((e) => (
                      <div key={e.key} className="rounded-lg border border-ink/15 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-admin-muted">{e.key}</span>
                          <span className={cn('font-mono text-[9.5px]', e.confidence >= 95 ? 'text-admin-teal' : 'text-admin-amber')}>{e.confidence}%</span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-snug">{e.value}</p>
                        <Meter value={e.confidence} color={e.confidence >= 95 ? 'rgb(var(--c-teal))' : 'rgb(var(--c-amber))'} className="mt-1.5 h-1" />
                      </div>
                    ))}
                  </div>
                )}
                <AButton
                  variant="primary"
                  className="mt-3 w-full"
                  icon={busy === 'sync' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  onClick={() => void syncFields()}
                  disabled={!real || !fields?.length || busy !== null}
                  title={real ? '' : '未配置服务端：不能保存'}
                >
                  {busy === 'sync' ? '写入中…' : '同步到简历数据'}
                </AButton>
              </LoadState>
            </Panel>

            <Panel kicker="Logs" title="最近版本" desc={real ? '来自服务端 resume.versions' : '预置演示版本（只读）'}>
              <LoadState loading={loading} error={error} onRetry={() => void load()}>
                <div className="space-y-1.5 text-[10.5px]">
                  {versions.slice(0, 4).map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-2 border-b border-ink/10 pb-1.5 last:border-0">
                      <span className="truncate font-mono text-admin-muted">{fmtDate(v.createdAt)}</span>
                      <span className="truncate">
                        {v.name} · {v.modules.length} 模块
                      </span>
                    </div>
                  ))}
                  {versions.length === 0 && <p className="py-3 text-center text-admin-muted">还没有版本</p>}
                </div>
              </LoadState>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'modules' && (
        <div className="grid gap-3 xl:grid-cols-[1.45fr_1fr]">
          <Panel
            kicker="Modules"
            title="简历模块"
            desc="开关控制前台展示；顺序即阅读顺序，上移 / 下移后保存即可生效"
            right={
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={dirty ? 'amber' : 'neutral'}>{real ? (dirty ? '有未保存修改' : '已同步') : '演示只读'}</Badge>
                <Badge tone="neutral">
                  已启用 {enabledCount} / {modules.length}
                </Badge>
                <AButton
                  size="sm"
                  icon={<Plus size={11} />}
                  disabled={!real || saving}
                  title={real ? '' : '未配置服务端：不能新增'}
                  onClick={() => {
                    setAddDraft({ title: '', summary: '' })
                    setFormError('')
                    setAddOpen(true)
                  }}
                >
                  新增
                </AButton>
              </div>
            }
            flush
          >
            <LoadState loading={loading} error={error} onRetry={() => void load()} label="正在加载模块…">
              <div className="divide-y divide-ink/10">
                {modules.map((m, i) => (
                  <div key={m.id} className={cn('flex items-center gap-3 px-4 py-2.5', !m.enabled && 'opacity-55')}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sand/60 text-ink/60">
                      <Sparkles size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-[11.5px] font-medium">
                        {m.title}
                        <span className="font-mono text-[9px] text-admin-muted">{m.items.length} 项</span>
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-admin-muted">{m.summary || '—'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton
                        label="上移"
                        disabled={!real || saving || i === 0}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp size={11} />
                      </IconButton>
                      <IconButton
                        label="下移"
                        disabled={!real || saving || i === modules.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown size={11} />
                      </IconButton>
                      <IconButton
                        label="删除"
                        disabled={!real || saving}
                        className="hover:border-coral/60 hover:text-admin-danger"
                        onClick={() => {
                          if (!real) return
                          setModules((l) => l.filter((x) => x.id !== m.id))
                          setDirty(true)
                          show('已从列表移除，保存布局后生效')
                        }}
                      >
                        <Trash2 size={11} />
                      </IconButton>
                    </div>
                    <Toggle
                      on={m.enabled}
                      label={m.title}
                      disabled={!real || saving}
                      onChange={(v) => {
                        if (!real) return
                        setModules((l) => l.map((x) => (x.id === m.id ? { ...x, enabled: v } : x)))
                        setDirty(true)
                      }}
                    />
                  </div>
                ))}
                {modules.length === 0 && <EmptyState title="还没有模块" desc="新增模块或解析简历后会出现在这里" />}
              </div>
            </LoadState>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 bg-paper px-4 py-2.5">
              <span className="text-[10px] text-admin-muted">
                {real ? (dirty ? '调整完成后记得保存，否则刷新会丢失' : '顺序与开关与服务端一致') : '演示模式：调整按钮已禁用'}
              </span>
              <AButton
                size="sm"
                variant="primary"
                disabled={!real || saving || !dirty}
                title={real ? '' : '未配置服务端：无法保存'}
                onClick={() => void saveModules()}
                icon={saving ? <Loader2 size={11} className="animate-spin" /> : undefined}
              >
                {saving ? '保存中…' : '保存布局'}
              </AButton>
            </div>
          </Panel>

          <div className="space-y-3">
            <Panel kicker="Preview" title="前台结构预览" desc="按当前启用顺序生成">
              <ol className="space-y-1.5">
                {modules
                  .filter((m) => m.enabled)
                  .map((m, i) => (
                    <li key={m.id} className="flex items-center gap-2 rounded-lg border border-ink/15 px-2.5 py-2">
                      <span className="font-mono text-[9.5px] text-admin-muted">{String(i + 1).padStart(2, '0')}</span>
                      <span className="flex-1 text-[11px]">{m.title}</span>
                      <span className="font-mono text-[9px] text-admin-muted">{m.items.length}</span>
                    </li>
                  ))}
                {modules.filter((m) => m.enabled).length === 0 && <p className="py-3 text-center text-[10.5px] text-admin-muted">没有启用的模块</p>}
              </ol>
              <AButton className="mt-3 w-full" onClick={() => window.open('/work/resume', '_blank')}>
                打开前台简历
              </AButton>
            </Panel>

            <Panel kicker="Tips" title="展示建议">
              <ul className="space-y-2 text-[10.5px] leading-relaxed text-admin-muted">
                <li>· 投递研发岗时，把「项目经历」放在「教育经历」之前。</li>
                <li>· 自媒体数据属于加分项，论坛类投递可以关闭。</li>
                <li>· 兴趣标签建议保留，它让简历更像一个具体的人。</li>
              </ul>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'versions' && (
        <div className="space-y-3">
          <Panel
            kicker="Versions"
            title="版本历史"
            desc="每次导出 / 解析都会生成版本；恢复只影响前台展示的模块内容"
            flush
            right={
              <AButton
                size="sm"
                variant="primary"
                disabled={!real}
                title={real ? '' : '未配置服务端：不能创建版本'}
                onClick={() => {
                  setRelease({ name: `v${versions.length + 1}`, note: '' })
                  setFormError('')
                  setReleasing(true)
                }}
              >
                发布新版本
              </AButton>
            }
          >
            <LoadState loading={loading} error={error} onRetry={() => void load()} label="正在加载版本…">
              <div className="overflow-x-auto no-scrollbar">
                <div className="admin-zebra min-w-[840px]">
                  <TableHead cols={['版本', '说明', '来源', '模块', '日期', '操作']} template="130px minmax(0,1fr) 76px 56px 150px 132px" />
                  {versions.map((v) => {
                    const removeKey = `version-delete-${v.id}`
                    const sourceLabel = v.source === 'parse' ? '解析' : v.source === 'manual' ? '手动' : '预置'
                    return (
                      <div
                        key={v.id}
                        className="grid grid-cols-[130px_minmax(0,1fr)_76px_56px_150px_132px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11.5px] last:border-0 hover:bg-lime/20"
                      >
                        <span className="truncate font-mono text-[11px] font-medium">{v.name}</span>
                        <div className="min-w-0">
                          <p className="truncate" title={v.note}>
                            {v.note || '—'}
                          </p>
                          <p className="font-mono text-[9px] text-admin-muted">{v.source}</p>
                        </div>
                        <Badge tone={v.source === 'parse' ? 'teal' : 'neutral'}>{sourceLabel}</Badge>
                        <span className="font-mono text-[10px] text-admin-muted">{v.modules.length}</span>
                        <span className="font-mono text-[9.5px] text-admin-muted">{fmtDate(v.createdAt)}</span>
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            label="下载 JSON"
                            onClick={() => {
                              const url = URL.createObjectURL(new Blob([JSON.stringify(v, null, 2)], { type: 'application/json' }))
                              const a = document.createElement('a')
                              a.href = url
                              a.download = `${v.name}.json`
                              a.click()
                              URL.revokeObjectURL(url)
                            }}
                          >
                            <Download size={11} />
                          </IconButton>
                          <AButton
                            size="sm"
                            variant="ghost"
                            disabled={!real}
                            title={real ? '' : '未配置服务端：不能恢复'}
                            onClick={() => setRollback(v)}
                          >
                            恢复
                          </AButton>
                          <IconButton
                            label="删除"
                            disabled={!real}
                            className="hover:border-coral/60 hover:text-admin-danger"
                            onClick={() => void removeVersion(v)}
                          >
                            {busy === removeKey ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          </IconButton>
                        </div>
                      </div>
                    )
                  })}
                  {versions.length === 0 && (
                    <div className="px-4">
                      <EmptyState title="还没有版本" desc="解析简历或发布新版本后会出现在这里" />
                    </div>
                  )}
                </div>
              </div>
            </LoadState>
          </Panel>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['最新版本', versions[0]?.name ?? '—', versions[0] ? fmtDate(versions[0].createdAt) : '暂无'],
              ['版本数', String(versions.length), real ? '最多保留 50 个' : '演示只读'],
              ['当前模块数', String(modules.length), `已启用 ${enabledCount}`],
            ].map(([l, v, n]) => (
              <div key={l} className="rounded-xl border border-ink/15 bg-cream px-4 py-3">
                <p className="text-[10px] text-admin-muted">{l}</p>
                <p className="mt-1.5 text-[20px] font-extrabold leading-none">{v}</p>
                <p className="mt-1.5 text-[9.5px] text-admin-muted">{n}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <AdminModal
        open={rollback !== null}
        onClose={() => {
          if (busy) return
          setRollback(null)
        }}
        title={`恢复版本 ${rollback?.name ?? ''}`}
        desc="恢复会把当前模块替换为该版本的模块快照"
        footer={
          <>
            <AButton disabled={busy !== null} onClick={() => setRollback(null)}>
              取消
            </AButton>
            <AButton
              variant="primary"
              icon={busy === 'version-restore' ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              disabled={busy !== null}
              onClick={() => void confirmRollback()}
            >
              {busy === 'version-restore' ? '恢复中…' : '确认恢复'}
            </AButton>
          </>
        }
      >
        <p className="text-[12px] leading-relaxed text-admin-ink/80">
          将把「{rollback?.name}」的模块顺序与字段内容写回当前简历。已下载的旧文件不受影响。
        </p>
      </AdminModal>

      <AdminModal
        open={releasing}
        onClose={() => {
          if (busy) return
          setReleasing(false)
        }}
        title="发布新版本"
        desc="基于当前模块快照创建一个版本（不生成 PDF）"
        footer={
          <>
            <AButton disabled={busy !== null} onClick={() => setReleasing(false)}>
              取消
            </AButton>
            <AButton
              variant="primary"
              disabled={busy !== null}
              onClick={() => void createVersion()}
              icon={busy === 'version-create' ? <Loader2 size={12} className="animate-spin" /> : undefined}
            >
              {busy === 'version-create' ? '创建中…' : '创建'}
            </AButton>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="版本名">
            <Input value={release.name} onChange={(e) => setRelease({ ...release, name: e.target.value })} disabled={busy !== null} />
          </Field>
          <Field label="变更说明">
            <Input
              value={release.note}
              onChange={(e) => setRelease({ ...release, note: e.target.value })}
              placeholder="例如：补充 RSI 闭环与 42 个用例"
              disabled={busy !== null}
            />
          </Field>
          {formError && <p className="text-[11px] text-admin-danger">{formError}</p>}
        </div>
      </AdminModal>

      <AdminModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="新增简历模块"
        footer={
          <>
            <AButton onClick={() => setAddOpen(false)}>取消</AButton>
            <AButton
              variant="primary"
              onClick={() => {
                if (!real) return setFormError(DEMO_NOTE)
                if (!addDraft.title.trim()) return setFormError('模块名不能为空')
                setModules((l) => [
                  ...l,
                  { id: newId('m'), title: addDraft.title.trim(), summary: addDraft.summary.trim(), items: [], enabled: true },
                ])
                setDirty(true)
                setAddOpen(false)
                show('已添加到列表，记得保存布局')
              }}
            >
              添加
            </AButton>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="模块名">
            <Input
              autoFocus
              value={addDraft.title}
              onChange={(e) => setAddDraft({ ...addDraft, title: e.target.value })}
              placeholder="例如：开源项目"
            />
          </Field>
          <Field label="摘要">
            <Input
              value={addDraft.summary}
              onChange={(e) => setAddDraft({ ...addDraft, summary: e.target.value })}
              placeholder="一句话说明这个模块展示什么"
            />
          </Field>
          {formError && <p className="text-[11px] text-admin-danger">{formError}</p>}
        </div>
      </AdminModal>
    </div>
  )
}
