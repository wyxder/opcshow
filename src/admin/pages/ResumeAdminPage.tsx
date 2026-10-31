import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  FileText,
  FlaskConical,
  GraduationCap,
  Heart,
  Layers,
  Megaphone,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
  UserRound,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { resumeModules, resumeParse, resumeVersions } from '@/admin/data'
import { serverConfig } from '@/services/config'
import { apiJson } from '@/services/http'
import { createResumeVersion, deleteResumeVersion, getResumeState, restoreResumeVersion, saveResumeModules, type ResumeModule, type ResumeVersion } from '@/services/admin'
import {
  AButton,
  AdminModal,
  Badge,
  Field,
  IconButton,
  Input,
  Meter,
  PageTitle,
  Panel,
  Status,
  TableHead,
  Tabs,
  Toggle,
} from '@/admin/ui'
import { cn, newId } from '@/lib/utils'

type Tab = 'parse' | 'modules' | 'versions'

const seedModules: ResumeModule[] = resumeModules.map((m, i) => ({ id: `seed_${i}`, title: m.title, summary: m.desc, items: Array.from({ length: m.count }, (_, k) => `示例条目 ${k + 1}`), enabled: m.enabled }))
const seedVersions: ResumeVersion[] = resumeVersions.map((v, i) => ({ id: `seedv_${i}`, name: v.version, note: v.note, source: 'seed', createdAt: `${v.date}T00:00:00.000Z`, modules: [] }))

type Job = {
  id: string
  status: string
  result?: { fileName?: string; fields?: { key: string; value: string; confidence: number }[]; engine?: string }
  error?: string
}

export default function ResumeAdminPage({ tab, setTab, show }: { tab: Tab; setTab: (t: Tab) => void; show: (m: string) => void }) {
  const real = serverConfig.enabled
  const [parsing, setParsing] = useState(false)
  const [modules, setModules] = useState<ResumeModule[]>(seedModules)
  const [versions, setVersions] = useState<ResumeVersion[]>(seedVersions)
  const [rollback, setRollback] = useState<ResumeVersion | null>(null)
  const [releasing, setReleasing] = useState(false)
  const [release, setRelease] = useState({ name: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addDraft, setAddDraft] = useState({ title: '', summary: '' })

  const loadState = async () => {
    if (!real) return
    const state = await getResumeState()
    if (!state) return
    setModules(state.modules)
    setVersions(state.versions)
  }

  useEffect(() => {
    void loadState()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real])
  /** 服务端解析结果覆盖预置字段；null 表示仍在用预置演示数据 */
  const [fields, setFields] = useState<{ key: string; value: string; confidence: number }[] | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [jobNote, setJobNote] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const lastText = useRef('')

  const enabledCount = modules.filter((m) => m.enabled).length

  const move = (index: number, dir: -1 | 1) => {
    const next = [...modules]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setModules(next)
  }

  /** 提交文本 → 轮询 GET /api/jobs/:id，直到成功/失败 */
  const submitParse = async (text: string, name: string) => {
    if (text.trim().length < 10) return show('文本太短，至少 10 个字符')
    setParsing(true)
    setJobNote(null)
    try {
      const job = await apiJson<Job>('/api/resume/parse', {
        method: 'POST',
        body: JSON.stringify({ text, fileName: name }),
      })
      for (let i = 0; i < 12; i += 1) {
        const cur = await apiJson<Job>(`/api/jobs/${job.id}`)
        if (cur.status === 'completed') {
          setFields(cur.result?.fields ?? null)
          setFileName(cur.result?.fileName ?? name)
          setJobNote(`服务端解析（${cur.result?.engine ?? 'local-rules'}）：${cur.result?.fields?.length ?? 0} 个字段`)
          await loadState()
          show('解析完成，模块与版本已写入服务端')
          return
        }
        if (cur.status === 'dead') {
          setJobNote(`任务失败：${cur.error ?? '未知原因'}`)
          show(`解析失败：${cur.error ?? '未知原因'}`)
          return
        }
        await new Promise((r) => window.setTimeout(r, 600))
      }
      setJobNote('任务仍在队列中，可稍后刷新查看')
      show('解析任务已提交，仍在处理')
    } catch (err) {
      setJobNote(`提交失败：${(err as Error).message}`)
      show(`解析失败：${(err as Error).message}`)
    } finally {
      setParsing(false)
    }
  }

  const runParse = () => {
    if (!real) return show('未接服务端：解析不可用（需 /api/resume/parse）')
    if (lastText.current) return void submitParse(lastText.current, fileName ?? 'resume.txt')
    fileRef.current?.click()
  }

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    const isText = /\.(txt|md|markdown)$/i.test(file.name)
    if (!isText) {
      show('服务端目前只能解析纯文本（.txt / .md）；PDF/DOCX 需要 pdfjs/mammoth 解析库，尚未接入')
      return
    }
    const text = await file.text()
    lastText.current = text
    setFileName(file.name)
    await submitParse(text, file.name)
  }

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Resume"
        title="简历管理"
        desc={
          real
            ? '上传纯文本简历 → 服务端任务解析为结构化字段；模块开关决定前台简历的展示内容。'
            : '未配置服务端：解析按钮只演示流程，字段与数字为预置数据，刷新即恢复。'
        }
        right={
          <>
            <AButton icon={<Download size={13} />} onClick={() => window.open('/files/wyx-resume-print.html', '_blank')}>
              打印版
            </AButton>
            <AButton variant="primary" icon={<RefreshCw size={13} />} onClick={runParse}>
              重新解析
            </AButton>
          </>
        }
      />

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
                  <p className="truncate text-[12px] font-medium">{fileName ?? resumeParse.file}</p>
                  <p className="mt-0.5 font-mono text-[9.5px] text-admin-muted">
                    {resumeParse.size} · {resumeParse.pages} 页 · 更新于 {resumeParse.updated}
                  </p>
                </div>
                <Status>{parsing ? '解析中' : fields ? '已解析' : resumeParse.state}</Status>
              </div>
              {jobNote && <p className="mt-2 font-mono text-[9.5px] text-admin-muted">{jobNote}</p>}
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
                  <span className="font-mono text-[10.5px]">{parsing ? '进行中…' : '100%'}</span>
                </div>
                <Meter value={parsing ? 62 : 100} color={parsing ? 'rgb(var(--c-amber))' : 'rgb(var(--c-teal))'} className="mt-2 h-2" />
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ['解析耗时', fields ? '见任务记录' : '4.2s'],
                    ['识别准确率', fields ? '按字段置信度' : '96%'],
                    ['结构化字段', fields ? String(fields.length) : '18'],
                    ['使用引擎', fields ? 'local-rules' : '预置演示'],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-lg border border-ink/10 bg-paper px-2 py-1.5">
                      <p className="text-[9.5px] text-admin-muted">{l}</p>
                      <p className="mt-0.5 font-mono text-[11px] font-medium">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <AButton icon={<Sparkles size={12} />} onClick={runParse} disabled={parsing}>
                  {parsing ? '解析中…' : '用 AI 重新解析'}
                </AButton>
                <AButton onClick={() => (real ? fileRef.current?.click() : show('上传新简历（演示：仅本页）'))}>上传新文件</AButton>
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
              desc="置信度低于 90% 的字段建议人工核对"
              right={<Badge tone={fields ? 'teal' : 'neutral'}>{fields ? '服务端结果' : '预置'} · {(fields ?? resumeParse.extracted).length} 个字段</Badge>}
            >
              <div className="space-y-2.5">
                {(fields ?? resumeParse.extracted).map((e) => (
                  <div key={e.key} className="rounded-lg border border-ink/15 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-admin-muted">{e.key}</span>
                      <span className={cn('font-mono text-[9.5px]', e.confidence >= 95 ? 'text-admin-teal' : 'text-admin-amber')}>
                        {e.confidence}%
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-snug">{e.value}</p>
                    <Meter value={e.confidence} color={e.confidence >= 95 ? 'rgb(var(--c-teal))' : 'rgb(var(--c-amber))'} className="mt-1.5 h-1" />
                  </div>
                ))}
              </div>
              <AButton
                variant="primary"
                className="mt-3 w-full"
                icon={<Check size={13} />}
                onClick={async () => {
                  if (!fields?.length) return show('先上传一份简历并解析')
                  if (!real) return show('未接服务端：不能保存')
                  try {
                    const next: ResumeModule[] = fields.map((f) => ({ id: `f_${f.key}`, title: f.key, summary: f.value, items: [], enabled: true }))
                    setModules(await saveResumeModules(next))
                    show('字段已写入简历模块')
                  } catch (err) {
                    show(`保存失败：${(err as Error).message}`)
                  }
                }}
              >
                同步到简历数据
              </AButton>
            </Panel>

            <Panel kicker="Logs" title="最近版本（真实）">
              <div className="space-y-1.5 text-[10.5px]">
                {versions.slice(0, 4).map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-2 border-b border-ink/10 pb-1.5 last:border-0">
                    <span className="truncate font-mono text-admin-muted">{new Date(v.createdAt).toLocaleString('zh-CN')}</span>
                    <span className="truncate">{v.name} · {v.modules.length} 模块</span>
                  </div>
                ))}
                {versions.length === 0 && <p className="py-3 text-center text-admin-muted">还没有版本</p>}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'modules' && (
        <div className="grid gap-3 xl:grid-cols-[1.45fr_1fr]">
          <Panel
            kicker="Modules"
            title="简历模块"
            desc="开关控制前台展示；顺序即阅读顺序，上移 / 下移即可调整"
            right={
              <div className="flex items-center gap-2">
                <Badge tone="neutral">已启用 {enabledCount} / {modules.length}</Badge>
                <AButton size="sm" icon={<Plus size={11} />} onClick={() => { setAddDraft({ title: '', summary: '' }); setAddOpen(true) }} disabled={!real}>
                  新增
                </AButton>
              </div>
            }
            flush
          >
            <div className="divide-y divide-ink/10">
              {modules.map((m, i) => {
                return (
                  <div key={m.id} className={cn('flex items-center gap-3 px-4 py-2.5', !m.enabled && 'opacity-55')}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sand/60 text-ink/60">
                      <Layers size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-[11.5px] font-medium">
                        {m.title}
                        <span className="font-mono text-[9px] text-admin-muted">{m.items.length} 项</span>
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-admin-muted">{m.summary || '—'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton label="上移" onClick={() => move(i, -1)}>
                        <ArrowUp size={11} />
                      </IconButton>
                      <IconButton label="下移" onClick={() => move(i, 1)}>
                        <ArrowDown size={11} />
                      </IconButton>
                      <IconButton label="删除" className="hover:border-coral/60 hover:text-admin-danger" onClick={() => setModules((l) => l.filter((x) => x.id !== m.id))}>
                        <Trash2 size={11} />
                      </IconButton>
                    </div>
                    <Toggle
                      on={m.enabled}
                      label={m.title}
                      onChange={(v) => setModules((l) => l.map((x) => (x.id === m.id ? { ...x, enabled: v } : x)))}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between border-t border-ink/10 bg-paper px-4 py-2.5">
              <span className="text-[10px] text-admin-muted">调整完成后记得保存</span>
              <AButton
                size="sm"
                variant="primary"
                disabled={saving || !real}
                onClick={async () => {
                  if (!real) return show('未接服务端：无法保存')
                  setSaving(true)
                  try {
                    setModules(await saveResumeModules(modules))
                    show('模块顺序与开关已保存')
                  } catch (err) {
                    show(`保存失败：${(err as Error).message}`)
                  } finally {
                    setSaving(false)
                  }
                }}
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
            desc="每次导出都会生成一个版本，回滚只影响前台展示内容"
            flush
            right={
              <AButton size="sm" variant="primary" onClick={() => { setRelease({ name: `v${versions.length + 1}`, note: '' }); setReleasing(true) }} disabled={!real}>
                发布新版本
              </AButton>
            }
          >
            <div className="overflow-x-auto no-scrollbar">
              <div className="admin-zebra min-w-[820px]">
                <TableHead cols={['版本', '说明', '来源', '模块', '日期', '操作']} template="130px minmax(0,1fr) 76px 56px 120px 132px" />
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="grid grid-cols-[130px_minmax(0,1fr)_76px_56px_120px_132px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11.5px] last:border-0 hover:bg-lime/20"
                  >
                    <span className="truncate font-mono text-[11px] font-medium">{v.name}</span>
                    <div className="min-w-0">
                      <p className="truncate">{v.note || '—'}</p>
                      <p className="font-mono text-[9px] text-admin-muted">{v.source}</p>
                    </div>
                    <Badge tone={v.source === 'parse' ? 'teal' : 'neutral'}>{v.source === 'parse' ? '解析' : '手动'}</Badge>
                    <span className="font-mono text-[10px] text-admin-muted">{v.modules.length}</span>
                    <span className="font-mono text-[9.5px] text-admin-muted">{new Date(v.createdAt).toLocaleString('zh-CN')}</span>
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
                      <AButton size="sm" variant="ghost" onClick={() => setRollback(v)}>
                        恢复
                      </AButton>
                      <IconButton
                        label="删除"
                        className="hover:border-coral/60 hover:text-admin-danger"
                        onClick={async () => {
                          if (!window.confirm(`删除版本「${v.name}」？不可恢复。`)) return
                          try {
                            await deleteResumeVersion(v.id)
                            await loadState()
                            show('版本已删除')
                          } catch (err) {
                            show(`删除失败：${(err as Error).message}`)
                          }
                        }}
                      >
                        <Trash2 size={11} />
                      </IconButton>
                    </div>
                  </div>
                ))}
                {versions.length === 0 && <p className="px-4 py-8 text-center text-[11.5px] text-admin-muted">还没有版本：解析或手动发布后出现</p>}
              </div>
            </div>
          </Panel>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['最新版本', versions[0]?.name ?? '—', versions[0] ? new Date(versions[0].createdAt).toLocaleString('zh-CN') : '暂无'],
              ['版本数', String(versions.length), '最多保留 50 个'],
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
        onClose={() => setRollback(null)}
        title={`恢复版本 ${rollback?.name ?? ''}`}
        desc="恢复会把当前模块替换为该版本的模块快照"
        footer={
          <>
            <AButton onClick={() => setRollback(null)}>取消</AButton>
            <AButton
              variant="primary"
              icon={<RotateCcw size={12} />}
              onClick={async () => {
                if (!rollback) return
                try {
                  await restoreResumeVersion(rollback.id)
                  setRollback(null)
                  await loadState()
                  show('已恢复该版本的模块')
                } catch (err) {
                  show(`恢复失败：${(err as Error).message}`)
                }
              }}
            >
              确认恢复
            </AButton>
          </>
        }
      >
        <p className="text-[12px] leading-relaxed text-admin-ink/80">
          将把 `{rollback?.name}` 的模块顺序与字段内容写回当前简历。已下载的旧文件不受影响。
        </p>
      </AdminModal>

      <AdminModal
        open={releasing}
        onClose={() => setReleasing(false)}
        title="发布新版本"
        desc="基于当前模块快照创建一个版本（不生成 PDF）"
        footer={
          <>
            <AButton onClick={() => setReleasing(false)}>取消</AButton>
            <AButton
              variant="primary"
              onClick={async () => {
                if (!release.name.trim()) return show('版本名不能为空')
                try {
                  await createResumeVersion({ name: release.name, note: release.note, modules })
                  setReleasing(false)
                  await loadState()
                  show(`已创建版本 ${release.name}`)
                } catch (err) {
                  show(`创建失败：${(err as Error).message}`)
                }
              }}
            >
              创建
            </AButton>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="版本名">
            <Input value={release.name} onChange={(e) => setRelease({ ...release, name: e.target.value })} />
          </Field>
          <Field label="变更说明">
            <Input value={release.note} onChange={(e) => setRelease({ ...release, note: e.target.value })} placeholder="例如：补充 RSI 闭环与 42 个用例" />
          </Field>
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
                if (!addDraft.title.trim()) return show('模块名不能为空')
                setModules((l) => [...l, { id: newId('m'), title: addDraft.title.trim(), summary: addDraft.summary.trim(), items: [], enabled: true }])
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
            <Input autoFocus value={addDraft.title} onChange={(e) => setAddDraft({ ...addDraft, title: e.target.value })} placeholder="例如：开源项目" />
          </Field>
          <Field label="摘要">
            <Input value={addDraft.summary} onChange={(e) => setAddDraft({ ...addDraft, summary: e.target.value })} placeholder="一句话说明这个模块展示什么" />
          </Field>
        </div>
      </AdminModal>
    </div>
  )
}
