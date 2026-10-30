import { Check, Copy, Download, Link2, Plus, RefreshCw, Share2, Trash2, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { adminFiles, shares as shareSeed, storage, uploadQueue as queueSeed } from '@/admin/data'
import {
  AButton,
  AdminModal,
  Badge,
  EmptyState,
  Field,
  IconButton,
  Input,
  Meter,
  PageTitle,
  Panel,
  SearchBox,
  Select,
  Status,
  TableHead,
  Tabs,
  Toggle,
} from '@/admin/ui'
import { cn } from '@/lib/utils'

type Tab = 'upload' | 'share' | 'clean'
type FileRow = (typeof adminFiles)[number]

const extColor: Record<string, string> = {
  pdf: 'bg-coral/15 text-admin-danger',
  md: 'bg-blue/10 text-admin-info',
  zip: 'bg-sand text-admin-amber',
  fig: 'bg-grape/10 text-admin-plum',
  py: 'bg-lime/50 text-admin-moss',
  pptx: 'bg-coral/15 text-admin-danger',
  xlsx: 'bg-blue/10 text-admin-info',
}

export default function FilesAdminPage({ tab, setTab, show }: { tab: Tab; setTab: (t: Tab) => void; show: (m: string) => void }) {
  const [files, setFiles] = useState<FileRow[]>(adminFiles)
  const [queue, setQueue] = useState(queueSeed)
  const [query, setQuery] = useState('')
  const [shares, setShares] = useState(shareSeed)
  const [creating, setCreating] = useState(false)
  const [shareDraft, setShareDraft] = useState({ file: adminFiles[0].name, password: '', expires: '永久' })
  const [trash, setTrash] = useState(storage.trash)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = files.filter((f) => (f.name + f.category).toLowerCase().includes(query.trim().toLowerCase()))
  const usedPercent = Math.round((storage.used / storage.total) * 100)

  const onPick = (list: FileList | null) => {
    if (!list?.length) return
    const added = Array.from(list).map((f, i) => ({
      id: `up-${Date.now()}-${i}`,
      name: f.name,
      size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      progress: 100,
      state: '完成',
    }))
    setQueue((q) => [...added, ...q.map((x) => (x.state === '上传中' ? { ...x, progress: 100, state: '完成' } : x))])
    show(`已上传 ${added.length} 个文件（演示）`)
  }

  const createShare = () => {
    const token = `wyx-${Math.random().toString(36).slice(2, 6)}`
    setShares((l) => [
      { id: `s${Date.now()}`, file: shareDraft.file, token, password: shareDraft.password || '无', expires: shareDraft.expires, visits: 0, created: '2026-10-30' },
      ...l,
    ])
    setCreating(false)
    show('分享链接已生成')
  }

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Files"
        title="文件资源"
        desc="统一管理简历附件、课程讲义与数据集；公开文件会出现在前台文件页。"
        right={
          <>
            <AButton icon={<RefreshCw size={13} />} onClick={() => show('存储用量已刷新')}>
              刷新用量
            </AButton>
            <AButton variant="primary" icon={<UploadCloud size={13} />} onClick={() => inputRef.current?.click()}>
              上传文件
            </AButton>
            <input ref={inputRef} type="file" multiple hidden onChange={(e) => onPick(e.target.files)} />
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        items={[
          { key: 'upload', label: '上传', count: files.length },
          { key: 'share', label: '分享', count: shares.length },
          { key: 'clean', label: '清理' },
        ]}
      />

      {tab === 'upload' && (
        <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            <Panel kicker="Drop zone" title="拖拽上传" desc="单个文件不超过 50 MB，支持 PDF / MD / ZIP / XLSX / FIG">
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  onPick(e.dataTransfer.files)
                }}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/25 bg-paper py-8 transition hover:border-ink hover:bg-lime/15"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-admin-danger">
                  <UploadCloud size={18} />
                </span>
                <p className="text-[12px] font-medium">把文件拖到这里，或点击选择</p>
                <p className="text-[10px] text-admin-muted">上传后自动按文件名匹配分类，可手动调整</p>
              </div>

              <div className="mt-4 space-y-2">
                {queue.map((q) => (
                  <div key={q.id} className="flex items-center gap-2.5 rounded-lg border border-ink/15 px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px]">{q.name}</span>
                      <span className="font-mono text-[9px] text-admin-muted">{q.size}</span>
                    </span>
                    <div className="w-24">
                      <Meter value={q.progress} color={q.state === '完成' ? '#2E6B3F' : '#E6A23C'} />
                    </div>
                    <Status>{q.state}</Status>
                    <IconButton
                      label="移除"
                      onClick={() => {
                        setQueue((l) => l.filter((x) => x.id !== q.id))
                        show('已从队列移除')
                      }}
                    >
                      <Trash2 size={11} />
                    </IconButton>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              kicker="Library"
              title="文件库"
              desc={`${files.length} 个文件 · 公开 ${files.filter((f) => f.visibility === '公开').length} 个`}
              flush
              right={<SearchBox value={query} onChange={setQuery} placeholder="搜索文件" className="w-40" />}
            >
              <div className="overflow-x-auto no-scrollbar">
                <div className="admin-zebra min-w-[720px]">
                  <TableHead cols={['文件', '分类', '大小', '下载', '可见性', '操作']} template="minmax(0,1fr) 96px 68px 58px 88px 84px" />
                  {filtered.map((f) => (
                    <div
                      key={f.id}
                      className="grid grid-cols-[minmax(0,1fr)_96px_68px_58px_88px_84px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11.5px] last:border-0 hover:bg-lime/20"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={cn('rounded px-1 py-0.5 font-mono text-[8.5px] uppercase', extColor[f.ext] ?? 'bg-sand/55 text-ink/60')}>
                          {f.ext}
                        </span>
                        <span className="truncate">{f.name}</span>
                      </div>
                      <span className="truncate text-[10px] text-admin-muted">{f.category}</span>
                      <span className="font-mono text-[10px] text-admin-muted">{f.size}</span>
                      <span className="font-mono text-[10px] text-admin-muted">{f.downloads}</span>
                      <button
                        onClick={() => {
                          setFiles((l) => l.map((x) => (x.id === f.id ? { ...x, visibility: x.visibility === '公开' ? '私密' : '公开' } : x)))
                          show(f.visibility === '公开' ? '已设为私密' : '已设为公开')
                        }}
                        className={cn('w-fit rounded-full px-2 py-0.5 text-[9.5px]', f.visibility === '公开' ? 'bg-lime/50 text-admin-moss' : 'bg-sand/55 text-admin-muted')}
                      >
                        {f.visibility}
                      </button>
                      <div className="flex items-center justify-end gap-1">
                        <IconButton label="下载" onClick={() => show('开始下载（演示）')}>
                          <Download size={11} />
                        </IconButton>
                        <IconButton
                          label="分享"
                          onClick={() => {
                            setShareDraft({ file: f.name, password: '', expires: '永久' })
                            setCreating(true)
                          }}
                        >
                          <Share2 size={11} />
                        </IconButton>
                        <IconButton
                          label="删除"
                          className="hover:border-coral/60 hover:text-admin-danger"
                          onClick={() => {
                            setFiles((l) => l.filter((x) => x.id !== f.id))
                            show('已移入回收站')
                          }}
                        >
                          <Trash2 size={11} />
                        </IconButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel kicker="Storage" title="存储用量">
              <div className="flex items-end justify-between">
                <p className="font-display text-[28px] font-extrabold leading-none">{storage.used} <span className="text-[12px] font-medium text-admin-muted">/ {storage.total} GB</span></p>
                <Badge tone={usedPercent > 80 ? 'red' : 'teal'}>{usedPercent}%</Badge>
              </div>
              <Meter value={usedPercent} className="mt-2.5 h-2" />
              <p className="mt-1.5 text-[10px] text-admin-muted">{storage.trend}</p>
              <div className="mt-3 space-y-1.5">
                {storage.buckets.map((b) => (
                  <div key={b.label} className="flex items-center gap-2 text-[10.5px]">
                    <span className="h-2 w-2 rounded-[2px]" style={{ background: b.color }} />
                    <span className="flex-1 text-admin-muted">{b.label}</span>
                    <span className="font-mono">{b.value} GB</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel kicker="Limits" title="上传限制">
              <div className="space-y-2.5 text-[11px]">
                {[
                  ['单文件大小', '50 MB'],
                  ['单次最多', '10 个文件'],
                  ['允许类型', 'PDF / MD / ZIP / XLSX / FIG / PY'],
                  ['存储位置', 'Supabase Storage'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-admin-muted">{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
              <AButton className="mt-3 w-full" onClick={() => show('存储配置（演示）')}>
                调整限制
              </AButton>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'share' && (
        <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
          <Panel
            kicker="Links"
            title="分享链接"
            desc="带密码的链接适合发给面试官，过期后自动失效"
            flush
            right={
              <AButton size="sm" variant="primary" icon={<Plus size={11} />} onClick={() => setCreating(true)}>
                新建分享
              </AButton>
            }
          >
            <div className="overflow-x-auto no-scrollbar">
              <div className="admin-zebra min-w-[720px]">
                <TableHead cols={['文件', '链接', '密码', '访问', '过期', '操作']} template="minmax(0,1fr) 128px 66px 52px 88px 96px" />
                {shares.map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-[minmax(0,1fr)_128px_66px_52px_88px_96px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11.5px] last:border-0 hover:bg-lime/20"
                  >
                    <span className="truncate">{s.file}</span>
                    <span className="flex items-center gap-1 font-mono text-[10px] text-admin-muted">
                      <Link2 size={10} /> /s/{s.token}
                    </span>
                    <span className="font-mono text-[10px] text-admin-muted">{s.password}</span>
                    <span className="font-mono text-[10px]">{s.visits}</span>
                    <span className="font-mono text-[9.5px] text-admin-muted">{s.expires}</span>
                    <div className="flex items-center justify-end gap-1">
                      <IconButton
                        label="复制链接"
                        onClick={() => {
                          navigator.clipboard?.writeText(`https://wyx.space/s/${s.token}`)
                          show('链接已复制')
                        }}
                      >
                        <Copy size={11} />
                      </IconButton>
                      <IconButton
                        label="关闭分享"
                        className="hover:border-coral/60 hover:text-admin-danger"
                        onClick={() => {
                          setShares((l) => l.filter((x) => x.id !== s.id))
                          show('分享已关闭')
                        }}
                      >
                        <Trash2 size={11} />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <div className="space-y-3">
            <Panel kicker="Summary" title="分享概览">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ['链接总数', shares.length],
                  ['累计访问', shares.reduce((s, x) => s + x.visits, 0)],
                  ['带密码', shares.filter((s) => s.password !== '无').length],
                  ['永久有效', shares.filter((s) => s.expires === '永久').length],
                ].map(([l, v]) => (
                  <div key={l as string} className="rounded-lg border border-ink/10 bg-paper px-3 py-2">
                    <p className="text-[9.5px] text-admin-muted">{l}</p>
                    <p className="mt-1 text-[17px] font-bold leading-none">{v}</p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel kicker="Rules" title="分享规则">
              <ul className="space-y-2 text-[10.5px] leading-relaxed text-admin-muted">
                <li>· 私密文件也能分享，链接不进入 sitemap。</li>
                <li>· 密码使用 6 位以上，访问时需二次验证。</li>
                <li>· 过期后链接返回 404，不暴露文件是否存在。</li>
              </ul>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'clean' && (
        <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
          <div className="space-y-3">
            <Panel kicker="Storage" title="空间占用" desc={`${storage.total} GB 总额度 · 已用 ${storage.used} GB`}>
              <div className="flex h-3 w-full overflow-hidden rounded-full border border-ink/15 bg-paper">
                {storage.buckets.map((b) => (
                  <div key={b.label} style={{ width: `${(b.value / storage.total) * 100}%`, background: b.color }} title={`${b.label} ${b.value} GB`} />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {storage.buckets.map((b) => (
                  <div key={b.label}>
                    <p className="flex items-center gap-1 text-[9.5px] text-admin-muted">
                      <span className="h-1.5 w-1.5 rounded-sm" style={{ background: b.color }} /> {b.label}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px]">{b.value} GB</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel kicker="Trash" title="回收站" desc="文件保留 30 天，到期自动清理" flush>
              {trash.length === 0 ? (
                <EmptyState title="回收站是空的" desc="删除的文件会先进入这里" />
              ) : (
                <div>
                  {trash.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 border-b border-ink/10 px-4 py-2.5 last:border-0">
                      <Trash2 size={12} className="text-admin-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px]">{t.name}</p>
                        <p className="font-mono text-[9px] text-admin-muted">{t.size} · 删除于 {t.deleted}</p>
                      </div>
                      <AButton size="sm" variant="soft" onClick={() => { setTrash((l) => l.filter((x) => x.id !== t.id)); show('已恢复文件') }}>
                        恢复
                      </AButton>
                      <IconButton
                        label="彻底删除"
                        className="hover:border-coral/60 hover:text-admin-danger"
                        onClick={() => { setTrash((l) => l.filter((x) => x.id !== t.id)); show('已彻底删除') }}
                      >
                        <XIcon />
                      </IconButton>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-ink/10 bg-paper px-4 py-2.5">
                    <span className="text-[10px] text-admin-muted">共 {trash.length} 个文件</span>
                    <AButton size="sm" variant="danger" onClick={() => { setTrash([]); show('回收站已清空') }}>
                      清空回收站
                    </AButton>
                  </div>
                </div>
              )}
            </Panel>

            <Panel kicker="Duplicates" title="重复文件" desc="同名且内容哈希一致，可合并保留一份">
              <div className="space-y-2">
                {storage.duplicates.map((d) => (
                  <div key={d.name} className="flex items-center gap-3 rounded-lg border border-ink/15 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px]">{d.name}</p>
                      <p className="font-mono text-[9px] text-admin-muted">{d.copies} 份副本 · 占用 {d.size}</p>
                    </div>
                    <AButton size="sm" variant="soft" onClick={() => show('已合并重复文件（演示）')}>
                      合并
                    </AButton>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel kicker="Suggestions" title="清理建议">
              <div className="space-y-2">
                {[
                  ['回收站可释放', '3.4 GB', '立即清理'],
                  ['重复文件可释放', '61.2 MB', '合并'],
                  ['90 天未访问', '1.8 GB', '归档'],
                ].map(([k, v, act]) => (
                  <div key={k} className="flex items-center gap-2 rounded-lg border border-ink/15 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px]">{k}</p>
                      <p className="font-mono text-[9.5px] text-admin-muted">{v}</p>
                    </div>
                    <AButton size="sm" onClick={() => show(`${act}任务已创建（演示）`)}>
                      {act}
                    </AButton>
                  </div>
                ))}
              </div>
              <AButton variant="primary" className="mt-3 w-full" icon={<Check size={12} />} onClick={() => show('已执行安全清理，释放 3.4 GB')}>
                一键安全清理
              </AButton>
            </Panel>

            <Panel kicker="Policy" title="清理策略">
              <div className="space-y-2.5">
                {[
                  ['回收站保留 30 天', true],
                  ['自动清理空目录', true],
                  ['定期合并重复文件', false],
                ].map(([l, on]) => (
                  <div key={l as string} className="flex items-center justify-between rounded-lg border border-ink/15 px-3 py-2">
                    <span className="text-[11px]">{l}</span>
                    <Toggle on={on as boolean} onChange={() => show('策略已更新（演示）')} label={l as string} />
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      <AdminModal
        open={creating}
        onClose={() => setCreating(false)}
        title="新建分享链接"
        desc="链接格式：https://wyx.space/s/{token}"
        footer={
          <>
            <AButton onClick={() => setCreating(false)}>取消</AButton>
            <AButton variant="primary" onClick={createShare}>
              生成链接
            </AButton>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="文件">
            <Select value={shareDraft.file} onChange={(e) => setShareDraft({ ...shareDraft, file: e.target.value })}>
              {files.map((f) => (
                <option key={f.id}>{f.name}</option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="访问密码" hint="留空表示不需要密码">
              <Input value={shareDraft.password} onChange={(e) => setShareDraft({ ...shareDraft, password: e.target.value })} placeholder="可选" />
            </Field>
            <Field label="有效期">
              <Select value={shareDraft.expires} onChange={(e) => setShareDraft({ ...shareDraft, expires: e.target.value })}>
                {['永久', '7 天', '30 天', '90 天'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </AdminModal>
    </div>
  )
}

function XIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
