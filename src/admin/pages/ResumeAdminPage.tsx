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
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { resumeModules, resumeParse, resumeVersions } from '@/admin/data'
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
import { cn } from '@/lib/utils'

type Tab = 'parse' | 'modules' | 'versions'

const moduleIcons: Record<string, typeof UserRound> = {
  user: UserRound,
  cap: GraduationCap,
  spark: Sparkles,
  layers: Layers,
  trophy: Trophy,
  flask: FlaskConical,
  megaphone: Megaphone,
  heart: Heart,
}

export default function ResumeAdminPage({ tab, setTab, show }: { tab: Tab; setTab: (t: Tab) => void; show: (m: string) => void }) {
  const [parsing, setParsing] = useState(false)
  const [modules, setModules] = useState(resumeModules)
  const [versions, setVersions] = useState(resumeVersions)
  const [rollback, setRollback] = useState<string | null>(null)
  const [releasing, setReleasing] = useState(false)
  const [release, setRelease] = useState({ version: 'v1.3', note: '' })

  const enabledCount = modules.filter((m) => m.enabled).length

  const move = (index: number, dir: -1 | 1) => {
    const next = [...modules]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setModules(next)
  }

  const runParse = () => {
    setParsing(true)
    window.setTimeout(() => {
      setParsing(false)
      show('解析完成：识别到 7 个项目、12 条量化指标')
    }, 1200)
  }

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Resume"
        title="简历管理"
        desc="上传 PDF 自动解析为结构化数据，模块开关决定前台简历的展示内容。"
        right={
          <>
            <AButton icon={<Download size={13} />} onClick={() => show('简历 PDF 已开始下载')}>
              下载 PDF
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
                  <p className="truncate text-[12px] font-medium">{resumeParse.file}</p>
                  <p className="mt-0.5 font-mono text-[9.5px] text-admin-muted">
                    {resumeParse.size} · {resumeParse.pages} 页 · 更新于 {resumeParse.updated}
                  </p>
                </div>
                <Status>{resumeParse.state}</Status>
              </div>

              <div className="mt-3 rounded-xl border-1.5 border-ink/20 p-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-admin-muted">解析进度</span>
                  <span className="font-mono text-[10.5px]">{parsing ? '进行中…' : '100%'}</span>
                </div>
                <Meter value={parsing ? 62 : 100} color={parsing ? '#E6A23C' : '#2E6B3F'} className="mt-2 h-2" />
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ['解析耗时', '4.2s'],
                    ['识别准确率', '96%'],
                    ['结构化字段', '18'],
                    ['使用模型', 'DeepSeek'],
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
                <AButton onClick={() => show('上传新简历（演示）')}>上传新文件</AButton>
                <AButton variant="soft" onClick={() => show('已打开原文件预览')}>
                  预览原文
                </AButton>
              </div>
            </Panel>

            <Panel kicker="Pipeline" title="解析流水线" desc="每一步都可重跑，失败会保留中间产物">
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
              right={<Badge tone="teal">{resumeParse.extracted.length} 个字段</Badge>}
            >
              <div className="space-y-2.5">
                {resumeParse.extracted.map((e) => (
                  <div key={e.key} className="rounded-lg border border-ink/15 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-admin-muted">{e.key}</span>
                      <span className={cn('font-mono text-[9.5px]', e.confidence >= 95 ? 'text-admin-teal' : 'text-admin-amber')}>
                        {e.confidence}%
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-snug">{e.value}</p>
                    <Meter value={e.confidence} color={e.confidence >= 95 ? '#2E6B3F' : '#E6A23C'} className="mt-1.5 h-1" />
                  </div>
                ))}
              </div>
              <AButton variant="primary" className="mt-3 w-full" icon={<Check size={13} />} onClick={() => show('结构化数据已同步到个人中心')}>
                同步到简历数据
              </AButton>
            </Panel>

            <Panel kicker="Logs" title="最近解析记录">
              <div className="space-y-1.5 text-[10.5px]">
                {[
                  ['2026-10-12 21:40', '成功 · 18 字段'],
                  ['2026-10-11 09:12', '成功 · 17 字段'],
                  ['2026-09-20 16:05', '部分失败 · 2 字段需人工'],
                ].map(([t, r]) => (
                  <div key={t} className="flex items-center justify-between border-b border-ink/10 pb-1.5 last:border-0">
                    <span className="font-mono text-admin-muted">{t}</span>
                    <span>{r}</span>
                  </div>
                ))}
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
            right={<Badge tone="neutral">已启用 {enabledCount} / {modules.length}</Badge>}
            flush
          >
            <div className="divide-y divide-ink/10">
              {modules.map((m, i) => {
                const Icon = moduleIcons[m.icon] ?? Layers
                return (
                  <div key={m.id} className={cn('flex items-center gap-3 px-4 py-2.5', !m.enabled && 'opacity-55')}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sand/60 text-ink/60">
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-[11.5px] font-medium">
                        {m.title}
                        <span className="font-mono text-[9px] text-admin-muted">{m.count} 项</span>
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-admin-muted">{m.desc}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton label="上移" onClick={() => move(i, -1)}>
                        <ArrowUp size={11} />
                      </IconButton>
                      <IconButton label="下移" onClick={() => move(i, 1)}>
                        <ArrowDown size={11} />
                      </IconButton>
                    </div>
                    <Toggle
                      on={m.enabled}
                      label={m.title}
                      onChange={(v) => {
                        setModules((l) => l.map((x) => (x.id === m.id ? { ...x, enabled: v } : x)))
                        show(v ? `已启用「${m.title}」` : `已隐藏「${m.title}」`)
                      }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between border-t border-ink/10 bg-paper px-4 py-2.5">
              <span className="text-[10px] text-admin-muted">调整完成后记得保存</span>
              <AButton size="sm" variant="primary" onClick={() => show('模块顺序已保存')}>
                保存布局
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
                      <span className="font-mono text-[9px] text-admin-muted">{m.count}</span>
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
              <AButton size="sm" variant="primary" onClick={() => { setRelease({ version: `v1.${versions.length + 1}`, note: '' }); setReleasing(true) }}>
                发布新版本
              </AButton>
            }
          >
            <div className="overflow-x-auto no-scrollbar">
              <div className="admin-zebra min-w-[820px]">
                <TableHead cols={['版本', '说明', '状态', '大小', '下载', '日期', '操作']} template="72px minmax(0,1fr) 92px 72px 62px 92px 118px" />
                {versions.map((v) => (
                  <div
                    key={v.version}
                    className="grid grid-cols-[72px_minmax(0,1fr)_92px_72px_62px_92px_118px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11.5px] last:border-0 hover:bg-lime/20"
                  >
                    <span className="font-mono text-[11px] font-medium">{v.version}</span>
                    <div className="min-w-0">
                      <p className="truncate">{v.note}</p>
                      <p className="font-mono text-[9px] text-admin-muted">{v.author}</p>
                    </div>
                    <Status>{v.status}</Status>
                    <span className="font-mono text-[10px] text-admin-muted">{v.size}</span>
                    <span className="font-mono text-[10px] text-admin-muted">{v.downloads}</span>
                    <span className="font-mono text-[9.5px] text-admin-muted">{v.date}</span>
                    <div className="flex items-center justify-end gap-1">
                      <IconButton label="下载" onClick={() => show(`${v.version} 已开始下载`)}>
                        <Download size={11} />
                      </IconButton>
                      <AButton
                        size="sm"
                        variant={v.status === '当前版本' ? 'soft' : 'ghost'}
                        disabled={v.status === '当前版本'}
                        onClick={() => setRollback(v.version)}
                      >
                        回滚
                      </AButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['当前版本', versions[0].version, '2026-10-12 发布'],
              ['累计下载', `${versions.reduce((s, v) => s + v.downloads, 0)}`, '来自 3 个版本'],
              ['平均更新周期', '51 天', '最近两次间隔 22 天'],
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
        title={`回滚到 ${rollback ?? ''}`}
        desc="回滚后前台立即生效，当前版本会自动归档。"
        footer={
          <>
            <AButton onClick={() => setRollback(null)}>取消</AButton>
            <AButton
              variant="primary"
              icon={<RotateCcw size={12} />}
              onClick={() => {
                const target = rollback
                setRollback(null)
                setVersions((l) => l.map((v) => ({ ...v, status: v.version === target ? '当前版本' : v.status === '当前版本' ? '已归档' : v.status })))
                show(`已回滚到 ${target}`)
              }}
            >
              确认回滚
            </AButton>
          </>
        }
      >
        <p className="text-[12px] leading-relaxed text-admin-ink/80">
          将把 `{rollback}` 的模块顺序、字段内容与导出样式恢复为当前展示版本。已投递的 PDF 不受影响。
        </p>
      </AdminModal>

      <AdminModal
        open={releasing}
        onClose={() => setReleasing(false)}
        title="发布新版本"
        desc="会基于当前模块布局生成 PDF 并归档。"
        footer={
          <>
            <AButton onClick={() => setReleasing(false)}>取消</AButton>
            <AButton
              variant="primary"
              onClick={() => {
                setVersions((l) => [
                  {
                    version: release.version,
                    date: '2026-10-30',
                    author: '魏云潇',
                    status: '当前版本',
                    size: '1.2 MB',
                    downloads: 0,
                    note: release.note || '按当前模块布局生成',
                  },
                  ...l.map((v) => ({ ...v, status: v.status === '当前版本' ? '已归档' : v.status })),
                ])
                setReleasing(false)
                show(`已发布 ${release.version}`)
              }}
            >
              发布
            </AButton>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="版本号">
            <Input value={release.version} onChange={(e) => setRelease({ ...release, version: e.target.value })} />
          </Field>
          <Field label="变更说明">
            <Input value={release.note} onChange={(e) => setRelease({ ...release, note: e.target.value })} placeholder="例如：补充 RSI 闭环与 42 个用例" />
          </Field>
        </div>
      </AdminModal>
    </div>
  )
}
