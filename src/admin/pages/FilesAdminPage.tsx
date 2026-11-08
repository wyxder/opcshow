import { Copy, Download, Link2, Loader2, Pencil, Plus, RefreshCw, Share2, Trash2, UploadCloud } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import FileIcon from '@/components/ui/FileIcon'
import { adminFiles, shares as shareSeed, storage } from '@/admin/data'
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
  SearchBox,
  Select,
  Status,
  TableHead,
  Tabs,
} from '@/admin/ui'
import { cn, newId } from '@/lib/utils'
import { purgeFile } from '@/services/admin'
import {
  cleanupFiles,
  emptyTrash,
  getDuplicates,
  getStorageReport,
  type DuplicateGroup,
  type StorageReport,
} from '@/services/adminx'
import { apiUrl, serverConfig } from '@/services/config'
import {
  createFileRecord,
  createShareLink,
  deleteShare,
  listFiles,
  listShares,
  requestUploadTicket,
  restoreFile,
  setVisibility,
  shareHref,
  trashFile,
  updateFile,
  uploadToTicket,
  type ServerFile,
} from '@/services/files'

type Tab = 'upload' | 'share' | 'clean'
type FileRow = (typeof adminFiles)[number]
type Row = FileRow & { url?: string; status?: string }
type ShareRow = { id: string; file: string; token: string; password: string; expires: string; visits: number; created: string }
type TrashRow = { id: string; name: string; size: string; deleted: string }
type QueueRow = { id: string; name: string; size: string; progress: number; state: string }

const real = serverConfig.enabled
const DEMO_NOTE = '当前未配置服务端（VITE_API_BASE），上传、新建、编辑、分享、可见性、删除与回收站操作均已禁用。'

const KNOWN_CATEGORY = ['简历与作品集', '课程与讲义', '数据集', '模板', '源码', '未分类'] as const

/** 状态徽标：pending = 只有元数据没传真实文件，与服务端白名单对齐 */
const FILE_STATUS_LABEL: Record<string, string> = { published: '已发布', pending: '待上传', trashed: '回收站' }
const CATEGORY_COLORS = ['rgb(var(--c-coral))', 'rgb(var(--c-amber))', 'rgb(var(--c-blue))', 'rgb(var(--c-grape))', 'rgb(var(--c-rose))']

const rowFromServer = (f: ServerFile): Row => ({
  id: f.id,
  name: f.name,
  ext: (f.ext || '').toLowerCase(),
  size: f.size,
  category: f.category || '未分类',
  downloads: f.downloads,
  date: f.date,
  visibility: f.visibility === 'public' ? '公开' : '私密',
  shared: false,
  url: f.url,
  status: f.status,
})

const human = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

export default function FilesAdminPage({ tab, setTab, show }: { tab: Tab; setTab: (t: Tab) => void; show: (m: string) => void }) {
  const [files, setFiles] = useState<Row[]>(real ? [] : adminFiles)
  const [shares, setShares] = useState<ShareRow[]>(real ? [] : shareSeed)
  const [trash, setTrash] = useState<TrashRow[]>(real ? [] : storage.trash)
  const [shareLinks, setShareLinks] = useState<Record<string, string>>({})
  const [queue, setQueue] = useState<QueueRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(real)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [shareDraft, setShareDraft] = useState({ file: real ? '' : (adminFiles[0]?.name ?? ''), password: '', expires: '永久' })
  const [editing, setEditing] = useState<Row | null>(null)
  const [editDraft, setEditDraft] = useState({ name: '', category: '', size: '', visibility: '公开', status: 'published' })
  const [recordOpen, setRecordOpen] = useState(false)
  const [recordDraft, setRecordDraft] = useState({ name: '', category: '未分类', size: '' })
  const [report, setReport] = useState<StorageReport | null>(null)
  const [duplicates, setDuplicates] = useState<{ groups: DuplicateGroup[]; reclaimableBytes: number } | null>(null)
  const [reportLoading, setReportLoading] = useState(real)
  const [reportError, setReportError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (spinner = true) => {
    if (!real) {
      setFiles(adminFiles)
      setShares(shareSeed)
      setTrash(storage.trash)
      setLoading(false)
      setError('')
      return
    }
    if (spinner) setLoading(true)
    setError('')
    try {
      const [list, links] = await Promise.all([listFiles('admin'), listShares()])
      setFiles(list.filter((f) => f.status !== 'trashed').map(rowFromServer))
      setTrash(list.filter((f) => f.status === 'trashed').map((f) => ({ id: f.id, name: f.name, size: f.size, deleted: f.date })))
      setShares(
        links.map((s) => ({
          id: s.id,
          file: s.name,
          token: s.token,
          password: s.hasPassword ? '需要密码' : '无',
          expires: s.expiresAt ? s.expiresAt.slice(0, 10) : '永久',
          visits: s.visits,
          created: s.createdAt.slice(0, 10),
        })),
      )
      setShareLinks(Object.fromEntries(links.map((s) => [s.id, `/api/files/download/${s.token}`])))
    } catch (err) {
      setError(`文件数据加载失败：${(err as Error).message}`)
    } finally {
      if (spinner) setLoading(false)
    }
  }, [])

  /** 真实模式读服务端存储报告与重复文件检测；get 类读失败统一置空并暴露可重试错误 */
  const loadClean = useCallback(async () => {
    if (!real) return
    setReportLoading(true)
    setReportError('')
    try {
      const [rep, dup] = await Promise.all([getStorageReport(), getDuplicates()])
      if (!rep) throw new Error('存储报告接口未返回数据')
      setReport(rep)
      setDuplicates(dup ?? { groups: [], reclaimableBytes: 0 })
    } catch (err) {
      setReportError(`清理数据加载失败：${(err as Error).message}`)
    } finally {
      setReportLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void loadClean()
  }, [loadClean])

  const filtered = files.filter((f) => `${f.name} ${f.category}`.toLowerCase().includes(query.trim().toLowerCase()))
  const usedPercent = Math.round((storage.used / storage.total) * 100)
  const expiresDays = ({ 永久: 0, '7 天': 7, '30 天': 30, '90 天': 90 } as Record<string, number>)[shareDraft.expires] ?? 0

  const rep = report
  const catTotal = rep ? Object.values(rep.byCategory).reduce((s, v) => s + v, 0) || 1 : storage.total
  const buckets =
    rep && real
      ? Object.entries(rep.byCategory).map(([label, value], i) => ({
          label,
          value,
          color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
          pct: (value / catTotal) * 100,
          size: human(value),
        }))
      : storage.buckets.map((b) => ({
          label: b.label,
          value: b.value,
          color: b.color,
          pct: (b.value / storage.total) * 100,
          size: `${b.value} GB`,
        }))

  const run = async (key: string, task: () => Promise<unknown>, ok: string, fail: string) => {
    if (!real) return show('未配置服务端，写操作不可用')
    if (busy) return
    setBusy(key)
    try {
      await task()
      await load(false)
      await loadClean()
      show(ok)
    } catch (err) {
      show(`${fail}：${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  const onPick = async (list: FileList | null) => {
    if (!real) return show('未配置服务端，上传不可用')
    if (!list?.length) return
    const picked = Array.from(list)
    if (picked.length > 10) return show('单次最多上传 10 个文件')
    for (const file of picked) {
      if (file.size > 50 * 1024 * 1024) {
        show(`「${file.name}」超过 50 MB，已跳过`)
        continue
      }
      const qid = newId('up')
      setQueue((q) => [{ id: qid, name: file.name, size: human(file.size), progress: 5, state: '上传中' }, ...q])
      try {
        const ticket = await requestUploadTicket({ name: file.name, size: file.size, type: file.type })
        setQueue((q) => q.map((x) => (x.id === qid ? { ...x, progress: 55 } : x)))
        const uploaded = await uploadToTicket(ticket, file, { category: '未分类' })
        setQueue((q) => q.map((x) => (x.id === qid ? { ...x, progress: 100, state: '完成', size: uploaded.size } : x)))
        show(`已上传 ${file.name}`)
      } catch (err) {
        setQueue((q) => q.map((x) => (x.id === qid ? { ...x, state: '失败' } : x)))
        show(`上传失败：${(err as Error).message}`)
      }
    }
    await load(false)
  }

  const toggleVisibility = (f: Row) => {
    if (!real) return show('未配置服务端，不能修改可见性')
    void run(
      `visibility-${f.id}`,
      () => setVisibility(f.id, f.visibility === '公开' ? 'private' : 'public'),
      f.visibility === '公开' ? '已设为私密' : '已设为公开',
      '设置失败',
    )
  }

  const removeFile = (f: Row) => {
    if (!real) return show('未配置服务端，删除不可用')
    if (!window.confirm(`把「${f.name}」移入回收站？可以在「清理」中恢复。`)) return
    void run(`trash-${f.id}`, () => trashFile(f.id), '已移入回收站', '删除失败')
  }

  const createShare = async () => {
    if (!real) return setFormError(DEMO_NOTE)
    if (saving) return
    const target = files.find((f) => f.name === shareDraft.file)
    if (!target) return setFormError('找不到该文件的服务端记录，请刷新文件库后重试')
    if (shareDraft.password && shareDraft.password.length < 4) return setFormError('访问密码至少 4 位')
    setSaving(true)
    setFormError('')
    try {
      await createShareLink({ fileId: target.id, password: shareDraft.password || undefined, expiresDays })
      setCreating(false)
      await load(false)
      show('分享链接已生成')
    } catch (err) {
      setFormError(`分享失败：${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (f: Row) => {
    setEditDraft({ name: f.name, category: f.category, size: f.size, visibility: f.visibility, status: f.status ?? 'published' })
    setFormError('')
    setEditing(f)
  }

  const saveEdit = async () => {
    if (!real) return setFormError(DEMO_NOTE)
    if (!editing || saving) return
    const name = editDraft.name.trim()
    if (!name) return setFormError('文件名不能为空')
    setSaving(true)
    setFormError('')
    try {
      await updateFile(editing.id, {
        name,
        category: editDraft.category.trim() || undefined,
        size: editDraft.size.trim() || undefined,
        visibility: editDraft.visibility === '公开' ? 'public' : 'private',
        status: editDraft.status,
      })
      setEditing(null)
      await load(false)
      show('文件记录已更新')
    } catch (err) {
      setFormError(`保存失败：${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const saveRecord = async () => {
    if (!real) return setFormError(DEMO_NOTE)
    if (saving) return
    const name = recordDraft.name.trim()
    if (!name) return setFormError('文件名不能为空')
    setSaving(true)
    setFormError('')
    try {
      await createFileRecord({ name, category: recordDraft.category.trim() || undefined, size: recordDraft.size.trim() || undefined })
      setRecordOpen(false)
      await load(false)
      show('已创建「待上传」记录；在上传真实文件前不会提供下载')
    } catch (err) {
      setFormError(`新建失败：${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  /** 清空回收站：真删服务端记录与磁盘文件，用服务端返回的 removed/freedBytes 如实回显 */
  const emptyTrashNow = async () => {
    if (!real) return show('未配置服务端，清理操作不可用')
    if (!window.confirm('清空回收站？服务端将永久删除回收站记录与磁盘文件，不可恢复。')) return
    if (busy) return
    setBusy('trash-empty')
    try {
      const res = await emptyTrash()
      show(`回收站已清空：删除 ${res.removed} 个，释放 ${human(res.freedBytes)}`)
    } catch (err) {
      show(`清空回收站失败：${(err as Error).message}`)
    } finally {
      await load(false)
      await loadClean()
      setBusy(null)
    }
  }

  /** 一键清理：孤立文件 / 临时文件 / 过期分享，数量以服务端返回为准 */
  const cleanupNow = async () => {
    if (!real) return show('未配置服务端，清理操作不可用')
    if (!window.confirm('执行清理？将删除孤立文件、临时文件与过期分享。')) return
    if (busy) return
    setBusy('cleanup')
    try {
      const res = await cleanupFiles({ orphans: true, tmp: true, expiredShares: true })
      show(`清理完成：孤立文件 ${res.orphansRemoved} 个（释放 ${human(res.bytesFreed)}），临时文件 ${res.tmpRemoved} 个，过期分享 ${res.sharesRemoved} 个`)
    } catch (err) {
      show(`清理失败：${(err as Error).message}`)
    } finally {
      await load(false)
      await loadClean()
      setBusy(null)
    }
  }

  /** 删除重复文件：走 purgeFile 真删服务端记录与磁盘文件，不改动本地 state 冒充成功 */
  const purgeDuplicate = async (ids: string[], note: string) => {
    if (!real) return show('未配置服务端，删除不可用')
    if (!ids.length) return
    if (!window.confirm(`彻底删除 ${ids.length} 个重复文件？服务端会移除记录与磁盘文件，不可恢复。`)) return
    if (busy) return
    setBusy('dup-purge')
    try {
      for (const id of ids) await purgeFile(id)
      show(`已彻底删除 ${ids.length} 个重复文件（${note}）`)
    } catch (err) {
      show(`删除重复文件失败：${(err as Error).message}`)
    } finally {
      await load(false)
      await loadClean()
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Files"
        title="文件资源"
        desc={
          real
            ? '统一管理简历附件、课程讲义与数据集；公开文件会出现在前台文件页。'
            : '演示只读数据：上传、分享、可见性与回收站操作全部禁用，不会产生真实链接。'
        }
        right={
          <>
            <AButton
              icon={<RefreshCw size={13} className={loading ? 'animate-spin' : undefined} />}
              onClick={() => {
                void load()
                void loadClean()
              }}
              disabled={loading}
            >
              {loading ? '刷新中…' : '刷新'}
            </AButton>
            <AButton
              icon={<Plus size={13} />}
              onClick={() => {
                setRecordDraft({ name: '', category: '未分类', size: '' })
                setFormError('')
                setRecordOpen(true)
              }}
              disabled={!real}
              title={real ? '新建待上传的文件记录（不伪造下载地址）' : '未配置服务端：不能新建记录'}
            >
              新建记录
            </AButton>
            <AButton
              variant="primary"
              icon={<UploadCloud size={13} />}
              onClick={() => inputRef.current?.click()}
              disabled={!real}
              title={real ? '' : '未配置服务端：不能上传'}
            >
              上传文件
            </AButton>
            <input ref={inputRef} type="file" multiple hidden disabled={!real} onChange={(e) => void onPick(e.target.files)} />
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
          { key: 'upload', label: '上传', count: files.length },
          { key: 'share', label: '分享', count: shares.length },
          { key: 'clean', label: '清理', count: trash.length },
        ]}
      />

      {tab === 'upload' && (
        <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            <Panel kicker="Drop zone" title="拖拽上传" desc={real ? '单个文件不超过 50 MB，单次最多 10 个' : '未配置服务端：拖拽与点击上传已禁用'}>
              <div
                role="button"
                tabIndex={real ? 0 : -1}
                aria-disabled={!real}
                onClick={() => real && inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (real && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    inputRef.current?.click()
                  }
                }}
                onDragOver={(e) => real && e.preventDefault()}
                onDrop={(e) => {
                  if (!real) return
                  e.preventDefault()
                  void onPick(e.dataTransfer.files)
                }}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/25 bg-paper py-8 transition',
                  real ? 'cursor-pointer hover:border-ink hover:bg-lime/15' : 'cursor-not-allowed opacity-55',
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-admin-danger">
                  <UploadCloud size={18} />
                </span>
                <p className="text-[12px] font-medium">{real ? '把文件拖到这里，或点击选择' : '上传需要服务端签名'}</p>
                <p className="text-[10px] text-admin-muted">
                  {real ? 'PDF / MD / ZIP / XLSX / FIG / PY 等；上传后可调整分类与可见性' : '配置 VITE_API_BASE 后自动启用'}
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {queue.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-ink/15 px-3 py-3 text-center text-[10.5px] text-admin-muted">
                    本次会话还没有上传任务
                  </p>
                ) : (
                  queue.map((q) => (
                    <div key={q.id} className="flex items-center gap-2.5 rounded-lg border border-ink/15 px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px]">{q.name}</span>
                        <span className="font-mono text-[9px] text-admin-muted">{q.size}</span>
                      </span>
                      <div className="w-24">
                        <Meter value={q.progress} color={q.state === '完成' ? 'rgb(var(--c-teal))' : q.state === '失败' ? 'rgb(var(--c-danger))' : 'rgb(var(--c-amber))'} />
                      </div>
                      <Status>{q.state}</Status>
                      <IconButton label="移除" onClick={() => setQueue((l) => l.filter((x) => x.id !== q.id))}>
                        <Trash2 size={11} />
                      </IconButton>
                    </div>
                  ))
                )}
              </div>
            </Panel>

            <Panel
              kicker="Library"
              title="文件库"
              desc={`${files.length} 个文件 · 公开 ${files.filter((f) => f.visibility === '公开').length} 个${real ? '' : ' · 预置演示值'}`}
              flush
              right={<SearchBox value={query} onChange={setQuery} placeholder="搜索文件" className="w-40" />}
            >
              <LoadState loading={loading} error={error} onRetry={() => void load()} label="正在加载文件…">
                <div className="overflow-x-auto no-scrollbar">
                  <div className="admin-zebra min-w-[760px]">
                    <TableHead cols={['文件', '分类', '大小', '下载', '可见性', '操作']} template="minmax(0,1fr) 96px 68px 58px 92px 148px" />
                    {filtered.map((f) => {
                      const visibilityKey = `visibility-${f.id}`
                      const trashKey = `trash-${f.id}`
                      const status = f.status ?? 'published'
                      return (
                        <div
                          key={f.id}
                          className="grid grid-cols-[minmax(0,1fr)_96px_68px_58px_92px_148px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11.5px] last:border-0 hover:bg-lime/20"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <FileIcon ext={f.ext} size={16} className="shrink-0" />
                            <span className="truncate" title={f.name}>
                              {f.name}
                            </span>
                            {status !== 'published' && <Badge tone="amber" className="shrink-0">{FILE_STATUS_LABEL[status] ?? status}</Badge>}
                          </div>
                          <span className="truncate text-[10px] text-admin-muted">{f.category}</span>
                          <span className="font-mono text-[10px] text-admin-muted">{f.size}</span>
                          <span className="font-mono text-[10px] text-admin-muted">{f.downloads}</span>
                          <button
                            onClick={() => toggleVisibility(f)}
                            disabled={!real || busy !== null}
                            title={real ? '点击切换可见性' : '未配置服务端：不可修改'}
                            className={cn(
                              'w-fit rounded-full px-2 py-0.5 text-[9.5px] transition disabled:cursor-not-allowed disabled:opacity-50',
                              f.visibility === '公开' ? 'bg-lime/50 text-admin-moss' : 'bg-sand/55 text-admin-muted',
                            )}
                          >
                            {busy === visibilityKey ? '处理中…' : f.visibility}
                          </button>
                          <div className="flex items-center justify-end gap-1">
                            <IconButton
                              label={f.url ? '下载' : '无真实文件，不可下载'}
                              disabled={!f.url}
                              title={f.url ? undefined : '该条目还没有上传实际文件，不提供下载'}
                              onClick={() => {
                                if (f.url) window.open(apiUrl(f.url), '_blank', 'noopener')
                                else show('该文件没有服务端存储，无法下载')
                              }}
                            >
                              <Download size={11} />
                            </IconButton>
                            <IconButton
                              label={f.url ? '复制下载链接' : '待上传：暂无下载链接'}
                              disabled={!f.url}
                              title={f.url ? undefined : '上传真实文件后才会生成下载链接'}
                              onClick={() => {
                                if (!f.url) return show('该文件尚未上传，没有可用的下载链接')
                                void copyText(shareHref(f.url)).then((ok) => show(ok ? '下载链接已复制' : '浏览器不允许写入剪贴板，请手动复制'))
                              }}
                            >
                              <Copy size={11} />
                            </IconButton>
                            <IconButton
                              label="编辑"
                              disabled={!real}
                              title={real ? '编辑名称 / 分类 / 大小 / 可见性 / 状态' : '未配置服务端：不可编辑'}
                              onClick={() => openEdit(f)}
                            >
                              <Pencil size={11} />
                            </IconButton>
                            <IconButton
                              label="分享"
                              disabled={!real}
                              onClick={() => {
                                setShareDraft({ file: f.name, password: '', expires: '永久' })
                                setFormError('')
                                setCreating(true)
                              }}
                            >
                              <Share2 size={11} />
                            </IconButton>
                            <IconButton
                              label="删除"
                              disabled={!real || busy !== null}
                              className="hover:border-coral/60 hover:text-admin-danger"
                              onClick={() => removeFile(f)}
                            >
                              {busy === trashKey ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                            </IconButton>
                          </div>
                        </div>
                      )
                    })}
                    {filtered.length === 0 && (
                      <div className="px-4">
                        <EmptyState title={files.length ? '没有匹配的文件' : '文件库还是空的'} desc={files.length ? '试试换个关键字' : '上传文件后会出现在这里'} />
                      </div>
                    )}
                  </div>
                </div>
              </LoadState>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel
              kicker="Storage"
              title={real ? '存储用量' : '存储用量（预置演示值）'}
              desc={real ? 'GET /api/admin/files/storage · 服务端真实统计' : '真实占用需存储驱动统计，当前仅预置演示值'}
            >
              <div className="flex items-end justify-between">
                <p className="font-display text-[28px] font-extrabold leading-none">
                  {rep && real ? human(rep.totalBytes) : storage.used}{' '}
                  <span className="text-[12px] font-medium text-admin-muted">
                    / {rep && real ? `磁盘 ${human(rep.uploadsBytes)}` : `${storage.total} GB`}
                  </span>
                </p>
                <Badge tone={real ? 'teal' : usedPercent > 80 ? 'red' : 'teal'}>
                  {rep && real ? `${rep.files} 个文件` : `${usedPercent}%`}
                </Badge>
              </div>
              {rep && real ? (
                <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full border border-ink/15 bg-paper">
                  {buckets.map((b) => (
                    <div key={b.label} style={{ width: `${b.pct}%`, background: b.color }} title={`${b.label} ${b.size}`} />
                  ))}
                </div>
              ) : (
                <Meter value={usedPercent} className="mt-2.5 h-2" />
              )}
              <p className="mt-1.5 text-[10px] text-admin-muted">
                {rep && real
                  ? `磁盘实际占用 ${human(rep.uploadsBytes)} · 文件记录合计 ${human(rep.totalBytes)} · 孤立 ${rep.orphans} / 临时 ${rep.tmpCount}`
                  : storage.trend}
              </p>
              <div className="mt-3 space-y-1.5">
                {buckets.map((b) => (
                  <div key={b.label} className="flex items-center gap-2 text-[10.5px]">
                    <span className="h-2 w-2 rounded-[2px]" style={{ background: b.color }} />
                    <span className="flex-1 text-admin-muted">{b.label}</span>
                    <span className="font-mono">{b.size}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel kicker="Limits" title="上传限制（服务端环境变量）">
              <div className="space-y-2.5 text-[11px]">
                {[
                  ['单文件大小', rep && real ? human(rep.limits.maxBytes) : '50 MB'],
                  ['单次最多', '10 个文件'],
                  ['允许类型', rep && real ? rep.limits.allowedExt.join(' / ') : 'PDF / MD / ZIP / XLSX / FIG / PY'],
                  ['存储位置', rep && real ? `${rep.limits.driver} 驱动 · ${rep.limits.dir}` : 'server/data/uploads（local 驱动，预置演示值）'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <span className="text-admin-muted">{k}</span>
                    <span className="text-right font-mono text-[10px]">{v}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 font-mono text-[9px] leading-relaxed text-admin-muted">
                {real
                  ? '由 UPLOAD_MAX_BYTES / UPLOAD_ALLOWED_EXT 控制，此处回显 GET /api/admin/files/storage 的真实值；后台不支持热改'
                  : '预置演示值：由 UPLOAD_MAX_BYTES / UPLOAD_ALLOWED_EXT 控制，后台不支持热改'}
              </p>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'share' && (
        <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
          <Panel
            kicker="Links"
            title="分享链接"
            desc={`带密码的链接适合发给面试官，过期后自动失效${real ? '' : ' · 预置演示值'}`}
            flush
            right={
              <AButton
                size="sm"
                variant="primary"
                icon={<Plus size={11} />}
                onClick={() => {
                  setShareDraft({ file: files[0]?.name ?? '', password: '', expires: '永久' })
                  setFormError('')
                  setCreating(true)
                }}
                disabled={!real || files.length === 0}
                title={real ? (files.length ? '' : '文件库为空，先上传文件') : '未配置服务端：不能创建分享'}
              >
                新建分享
              </AButton>
            }
          >
            <LoadState loading={loading} error={error} onRetry={() => void load()} label="正在加载分享链接…">
              <div className="overflow-x-auto no-scrollbar">
                <div className="admin-zebra min-w-[760px]">
                  <TableHead cols={['文件', '链接', '密码', '访问', '过期', '操作']} template="minmax(0,1fr) 150px 72px 52px 96px 96px" />
                  {shares.map((s) => {
                    const removeKey = `share-${s.id}`
                    return (
                      <div
                        key={s.id}
                        className="grid grid-cols-[minmax(0,1fr)_150px_72px_52px_96px_96px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11.5px] last:border-0 hover:bg-lime/20"
                      >
                        <span className="truncate" title={s.file}>
                          {s.file}
                        </span>
                        <span className="flex items-center gap-1 truncate font-mono text-[10px] text-admin-muted" title={s.token}>
                          <Link2 size={10} /> {s.token.slice(0, 12)}
                        </span>
                        <span className="truncate font-mono text-[10px] text-admin-muted">{s.password}</span>
                        <span className="font-mono text-[10px]">{s.visits}</span>
                        <span className="font-mono text-[9.5px] text-admin-muted">{s.expires}</span>
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            label="复制链接"
                            disabled={!real}
                            onClick={() => {
                              const href = shareLinks[s.id] ?? `/api/files/download/${s.token}`
                              void copyText(shareHref(href)).then((ok) => show(ok ? '链接已复制' : '浏览器不允许写入剪贴板，请手动复制'))
                            }}
                          >
                            <Copy size={11} />
                          </IconButton>
                          <IconButton
                            label="关闭分享"
                            disabled={!real || busy !== null}
                            className="hover:border-coral/60 hover:text-admin-danger"
                            onClick={() => {
                              if (!window.confirm('关闭这个分享链接？访客将无法再访问。')) return
                              void run(removeKey, () => deleteShare(s.token), '分享已关闭', '关闭失败')
                            }}
                          >
                            {busy === removeKey ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          </IconButton>
                        </div>
                      </div>
                    )
                  })}
                  {shares.length === 0 && (
                    <div className="px-4">
                      <EmptyState title="还没有分享链接" desc="从文件库选择文件生成分享，或在右上角新建" />
                    </div>
                  )}
                </div>
              </div>
            </LoadState>
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
                <li>· 密码至少 4 位，访问时需二次验证。</li>
                <li>· 过期后链接返回 404，不暴露文件是否存在。</li>
                <li>· 服务端只返回「是否设置密码」，不返回哈希。</li>
              </ul>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'clean' && (
        <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
          <div className="space-y-3">
            <Panel
              kicker="Storage"
              title="空间占用"
              desc={
                rep && real
                  ? `磁盘实际占用 ${human(rep.uploadsBytes)} · 文件记录合计 ${human(rep.totalBytes)}（GET /api/admin/files/storage）`
                  : `${storage.total} GB 总额度 · 已用 ${storage.used} GB（预置演示值）`
              }
            >
              {real && reportLoading ? (
                <div className="flex items-center gap-2 py-3 text-[11px] text-admin-muted">
                  <Loader2 size={13} className="animate-spin" /> 正在读取存储报告…
                </div>
              ) : real && reportError ? (
                <div className="space-y-2 py-2">
                  <p className="text-[11px] text-admin-danger">{reportError}</p>
                  <AButton size="sm" onClick={() => void loadClean()}>重试</AButton>
                </div>
              ) : (
                <>
                  <div className="flex h-3 w-full overflow-hidden rounded-full border border-ink/15 bg-paper">
                    {buckets.map((b) => (
                      <div key={b.label} style={{ width: `${b.pct}%`, background: b.color }} title={`${b.label} ${b.size}`} />
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {buckets.map((b) => (
                      <div key={b.label}>
                        <p className="flex items-center gap-1 text-[9.5px] text-admin-muted">
                          <span className="h-1.5 w-1.5 rounded-sm" style={{ background: b.color }} /> {b.label}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px]">{b.size}</p>
                      </div>
                    ))}
                  </div>
                  {rep && real && (
                    <>
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {[
                          ['文件总数', rep.files],
                          ['已发布', rep.published],
                          ['回收站', rep.trashed],
                          ['待上传', rep.pending],
                          ['分享', rep.shares],
                          ['过期分享', rep.sharesExpired],
                        ].map(([l, v]) => (
                          <div key={l as string} className="rounded-lg bg-sand/55 px-2 py-1.5 text-center">
                            <p className="text-[9px] text-admin-muted">{l}</p>
                            <p className="mt-0.5 font-mono text-[13px] font-bold leading-none">{v}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {[
                          ['孤立文件', `${rep.orphans} 个 / ${human(rep.orphanBytes)}`],
                          ['临时文件', `${rep.tmpCount} 个 / ${human(rep.tmpBytes)}`],
                          ['可释放合计', human(rep.orphanBytes + rep.tmpBytes)],
                        ].map(([l, v]) => (
                          <div key={l as string} className="rounded-lg border border-ink/15 px-3 py-2">
                            <p className="text-[9.5px] text-admin-muted">{l}</p>
                            <p className="mt-0.5 font-mono text-[11px]">{v}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2.5 rounded-lg border border-dashed border-ink/20 px-3 py-2">
                        <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-admin-muted">上传限制</p>
                        <p className="mt-1 text-[10.5px] leading-relaxed text-admin-muted">
                          单文件 ≤ {human(rep.limits.maxBytes)} · 允许类型 {rep.limits.allowedExt.join(' / ')} · 驱动 {rep.limits.driver}
                        </p>
                        <p className="mt-0.5 break-all font-mono text-[9px] text-admin-muted">目录 {rep.limits.dir}</p>
                      </div>
                    </>
                  )}
                  {!real && <p className="mt-3 font-mono text-[9px] text-admin-muted">预置演示值：配置 VITE_API_BASE 后展示服务端真实统计</p>}
                </>
              )}
            </Panel>

            <Panel kicker="Trash" title="回收站" desc="文件保留 30 天，到期自动清理" flush>
              <LoadState loading={loading} error={error} onRetry={() => void load()} label="正在加载回收站…">
                {trash.length === 0 ? (
                  <EmptyState title="回收站是空的" desc="删除的文件会先进入这里" />
                ) : (
                  <div>
                    {trash.map((t) => {
                      const restoreKey = `restore-${t.id}`
                      const purgeKey = `purge-${t.id}`
                      return (
                        <div key={t.id} className="flex items-center gap-3 border-b border-ink/10 px-4 py-2.5 last:border-0">
                          <Trash2 size={12} className="shrink-0 text-admin-muted" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11.5px]">{t.name}</p>
                            <p className="font-mono text-[9px] text-admin-muted">
                              {t.size} · 删除于 {t.deleted}
                            </p>
                          </div>
                          <AButton
                            size="sm"
                            variant="soft"
                            disabled={!real || busy !== null}
                            title={real ? '' : '未配置服务端：不能恢复'}
                            icon={busy === restoreKey ? <Loader2 size={11} className="animate-spin" /> : undefined}
                            onClick={() => void run(restoreKey, () => restoreFile(t.id), '已恢复文件', '恢复失败')}
                          >
                            {busy === restoreKey ? '恢复中…' : '恢复'}
                          </AButton>
                          <IconButton
                            label="彻底删除"
                            disabled={!real || busy !== null}
                            className="hover:border-coral/60 hover:text-admin-danger"
                            onClick={() => {
                              if (!window.confirm(`彻底删除「${t.name}」？不可恢复。`)) return
                              void run(purgeKey, () => purgeFile(t.id), '已彻底删除', '删除失败')
                            }}
                          >
                            {busy === purgeKey ? <Loader2 size={11} className="animate-spin" /> : <XIcon />}
                          </IconButton>
                        </div>
                      )
                    })}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 bg-paper px-4 py-2.5">
                      <span className="text-[10px] text-admin-muted">共 {trash.length} 个文件</span>
                      <AButton
                        size="sm"
                        variant="danger"
                        disabled={!real || busy !== null}
                        title={real ? 'DELETE /api/admin/files/trashed · 真删服务端记录与磁盘文件' : '未配置服务端：不能清空'}
                        onClick={() => void emptyTrashNow()}
                        icon={busy === 'trash-empty' ? <Loader2 size={11} className="animate-spin" /> : undefined}
                      >
                        {busy === 'trash-empty' ? '清理中…' : '清空回收站'}
                      </AButton>
                    </div>
                  </div>
                )}
              </LoadState>
            </Panel>

            <Panel
              kicker="Duplicates"
              title="重复文件检测"
              desc={
                real
                  ? `GET /api/admin/files/duplicates · ${duplicates?.groups.length ?? 0} 组 · 可释放 ${human(duplicates?.reclaimableBytes ?? 0)}`
                  : '预置演示值：重复文件检测需要服务端'
              }
              flush
            >
              {!real ? (
                <div className="space-y-2 p-4">
                  {storage.duplicates.map((d) => (
                    <div key={d.name} className="flex items-center justify-between rounded-lg border border-ink/15 px-3 py-2 text-[11px]">
                      <span className="truncate">{d.name}</span>
                      <Badge tone="amber">{d.copies} 份 · {d.size}</Badge>
                    </div>
                  ))}
                  <p className="text-[9.5px] text-admin-muted">演示模式：以上为预置演示值，删除按钮不可用。</p>
                </div>
              ) : (
                <LoadState loading={reportLoading} error={reportError} onRetry={() => void loadClean()} label="正在检测重复文件…">
                  {!duplicates || duplicates.groups.length === 0 ? (
                    <EmptyState title="没有检测到重复文件" desc="同名同大小的记录会归为一组" />
                  ) : (
                    <div className="divide-y divide-ink/10">
                      {duplicates.groups.map((group, gi) => {
                        const first = group[0]
                        const rest = group.slice(1)
                        return (
                          <div key={`${first?.name ?? 'group'}-${gi}`} className="px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="min-w-0 truncate text-[11.5px] font-medium" title={first?.name}>{first?.name ?? '—'}</p>
                              <div className="flex items-center gap-2">
                                <Badge tone="amber">{group.length} 份 · {human(first?.sizeBytes ?? 0)} / 份</Badge>
                                <AButton
                                  size="sm"
                                  variant="danger"
                                  disabled={busy !== null}
                                  onClick={() => void purgeDuplicate(rest.map((x) => x.id), '保留 1 份')}
                                  icon={busy === 'dup-purge' ? <Loader2 size={11} className="animate-spin" /> : undefined}
                                >
                                  保留一份，删除其余 {rest.length} 份
                                </AButton>
                              </div>
                            </div>
                            <div className="mt-2 space-y-1">
                              {group.map((item, ii) => (
                                <div key={item.id} className="flex items-center gap-2 rounded-lg bg-sand/40 px-2.5 py-1.5 text-[10px]">
                                  <span className="font-mono text-admin-muted">#{ii + 1}</span>
                                  <span className="min-w-0 flex-1 truncate font-mono text-admin-muted" title={item.id}>{item.id}</span>
                                  <Status>{FILE_STATUS_LABEL[item.status] ?? item.status}</Status>
                                  <span className="font-mono text-admin-muted">{item.createdAt?.slice(0, 10) || '—'}</span>
                                  {ii === 0 ? (
                                    <Badge tone="teal">保留</Badge>
                                  ) : (
                                    <IconButton
                                      label="彻底删除此重复"
                                      disabled={busy !== null}
                                      className="hover:border-coral/60 hover:text-admin-danger"
                                      onClick={() => void purgeDuplicate([item.id], '单项删除')}
                                    >
                                      <XIcon />
                                    </IconButton>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </LoadState>
              )}
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel kicker="Policy" title="清理策略">
              <div className="space-y-2.5 text-[11px]">
                {[
                  ['回收站保留 30 天', '到期后由服务端任务清理'],
                  ['删除 = 移入回收站', '可在清理 Tab 恢复'],
                  ['彻底删除不可恢复', '会同时移除分享链接'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 border-b border-ink/10 pb-1.5 last:border-0">
                    <span>{k}</span>
                    <span className="text-right text-[10px] text-admin-muted">{v}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 font-mono text-[9px] leading-relaxed text-admin-muted">重复文件检测与一键清理已接入服务端（GET /api/admin/files/duplicates、POST /api/admin/files/cleanup）；回收站 / 彻底删除均以服务端响应为准。自动定时清理仍需外部调度器，站内不自带定时任务。</p>
            </Panel>

            <Panel
              kicker={real ? 'Cleanup' : 'Suggestions'}
              title={real ? '一键清理' : '清理建议（预置演示值）'}
              desc={real ? 'POST /api/admin/files/cleanup · 真删孤立 / 临时文件与过期分享' : '仅版式示意，写操作禁用'}
            >
              {real ? (
                <>
                  <div className="space-y-2 text-[11px]">
                    {[
                      ['孤立文件（无记录）', rep ? `${rep.orphans} 个 · ${human(rep.orphanBytes)}` : '—'],
                      ['临时 / 备份文件', rep ? `${rep.tmpCount} 个 · ${human(rep.tmpBytes)}` : '—'],
                      ['过期分享', rep ? `${rep.sharesExpired} 个` : '—'],
                      ['预计可释放', rep ? human(rep.orphanBytes + rep.tmpBytes) : '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between rounded-lg border border-ink/15 px-3 py-2">
                        <span>{k}</span>
                        <span className="font-mono text-[10px] text-admin-muted">{v}</span>
                      </div>
                    ))}
                  </div>
                  <AButton
                    className="mt-3 w-full justify-center"
                    variant="primary"
                    disabled={busy !== null || reportLoading || !rep}
                    onClick={() => void cleanupNow()}
                    icon={busy === 'cleanup' ? <Loader2 size={12} className="animate-spin" /> : undefined}
                  >
                    {busy === 'cleanup' ? '清理中…' : '执行清理（孤立 / 临时 / 过期分享）'}
                  </AButton>
                  <p className="mt-2 text-[9.5px] leading-relaxed text-admin-muted">
                    实际删除数量以服务端返回为准，成功后重新拉取存储报告与文件列表。自动定时清理仍需外部调度器，站内不自带定时任务。
                  </p>
                </>
              ) : (
                <>
                  <div className="space-y-2 text-[11px]">
                    {[
                      ['回收站可释放', '3.4 GB'],
                      ['90 天未访问', '1.8 GB'],
                      ['重复文件', '61.2 MB'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between rounded-lg border border-ink/15 px-3 py-2">
                        <span>{k}</span>
                        <span className="font-mono text-[10px] text-admin-muted">{v}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[9.5px] leading-relaxed text-admin-muted">预置演示值：请在左侧回收站逐项恢复或彻底删除；清理按钮在演示模式下禁用。</p>
                </>
              )}
            </Panel>
          </div>
        </div>
      )}

      <AdminModal
        open={creating}
        onClose={() => {
          if (saving) return
          setCreating(false)
        }}
        title="新建分享链接"
        desc={real ? '链接由服务端生成，可选密码与有效期' : DEMO_NOTE}
        footer={
          <>
            <AButton disabled={saving} onClick={() => setCreating(false)}>
              取消
            </AButton>
            <AButton
              variant="primary"
              disabled={saving || !real || files.length === 0}
              title={real ? '' : '未配置服务端：不能生成链接'}
              onClick={() => void createShare()}
              icon={saving ? <Loader2 size={12} className="animate-spin" /> : undefined}
            >
              {saving ? '生成中…' : '生成链接'}
            </AButton>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="文件">
            <Select
              value={shareDraft.file}
              onChange={(e) => setShareDraft({ ...shareDraft, file: e.target.value })}
              disabled={saving || files.length === 0}
            >
              {files.length === 0 ? <option value="">文件库为空</option> : null}
              {files.map((f) => (
                <option key={f.id}>{f.name}</option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="访问密码" hint="留空表示不需要密码，至少 4 位">
              <Input
                value={shareDraft.password}
                disabled={saving}
                onChange={(e) => setShareDraft({ ...shareDraft, password: e.target.value })}
                placeholder="可选"
              />
            </Field>
            <Field label="有效期">
              <Select value={shareDraft.expires} disabled={saving} onChange={(e) => setShareDraft({ ...shareDraft, expires: e.target.value })}>
                {['永久', '7 天', '30 天', '90 天'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
            </Field>
          </div>
          {formError && (
            <p role="alert" className="text-[11px] text-admin-danger">
              {formError}
            </p>
          )}
        </div>
      </AdminModal>

      <AdminModal
        open={editing !== null}
        onClose={() => {
          if (saving) return
          setEditing(null)
        }}
        title="编辑文件记录"
        desc={real ? '修改名称 / 分类 / 大小 / 可见性 / 状态；前台资源中心同步生效' : DEMO_NOTE}
        footer={
          <>
            <AButton disabled={saving} onClick={() => setEditing(null)}>
              取消
            </AButton>
            <AButton
              variant="primary"
              disabled={saving || !real}
              title={real ? '' : '未配置服务端：不能保存'}
              onClick={() => void saveEdit()}
              icon={saving ? <Loader2 size={12} className="animate-spin" /> : undefined}
            >
              {saving ? '保存中…' : '保存修改'}
            </AButton>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="文件名" hint="改名会同步更新扩展名图标">
            <Input value={editDraft.name} disabled={saving} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="分类">
              <Select value={editDraft.category} disabled={saving} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}>
                {[...new Set([...KNOWN_CATEGORY, editDraft.category].filter(Boolean))].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="大小" hint="仅展示用，真实体积以服务端存储为准">
              <Input value={editDraft.size} disabled={saving} onChange={(e) => setEditDraft({ ...editDraft, size: e.target.value })} placeholder="如 8.4 MB" />
            </Field>
            <Field label="可见性">
              <Select value={editDraft.visibility} disabled={saving} onChange={(e) => setEditDraft({ ...editDraft, visibility: e.target.value })}>
                <option>公开</option>
                <option>私密</option>
              </Select>
            </Field>
            <Field label="状态" hint="只有上传过真实文件的记录才能发布下载">
              <Select value={editDraft.status} disabled={saving} onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })}>
                {['published', 'pending'].map((s) => (
                  <option key={s} value={s}>
                    {FILE_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {editing && !editing.url && editDraft.status === 'published' && (
            <p className="rounded-lg border border-dashed border-ink/20 px-3 py-2 text-[10.5px] leading-relaxed text-admin-muted">
              注意：该条目还没有存储实体，即使标为「已发布」，服务端下载接口仍会如实返回「尚未上传」，前台不会得到可用链接。
            </p>
          )}
          {formError && (
            <p role="alert" className="text-[11px] text-admin-danger">
              {formError}
            </p>
          )}
        </div>
      </AdminModal>

      <AdminModal
        open={recordOpen}
        onClose={() => {
          if (saving) return
          setRecordOpen(false)
        }}
        title="新建文件记录"
        desc={real ? '先登记元数据占位，状态为「待上传」；上传真实文件前不会产生下载地址' : DEMO_NOTE}
        footer={
          <>
            <AButton disabled={saving} onClick={() => setRecordOpen(false)}>
              取消
            </AButton>
            <AButton
              variant="primary"
              disabled={saving || !real}
              title={real ? '' : '未配置服务端：不能新建'}
              onClick={() => void saveRecord()}
              icon={saving ? <Loader2 size={12} className="animate-spin" /> : undefined}
            >
              {saving ? '创建中…' : '创建记录'}
            </AButton>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="文件名" hint="含扩展名，图标按扩展名自动映射">
            <Input value={recordDraft.name} disabled={saving} onChange={(e) => setRecordDraft({ ...recordDraft, name: e.target.value })} placeholder="如：评测集 v2.xlsx" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="分类">
              <Select value={recordDraft.category} disabled={saving} onChange={(e) => setRecordDraft({ ...recordDraft, category: e.target.value })}>
                {KNOWN_CATEGORY.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="预估大小" hint="可选，仅展示用">
              <Input value={recordDraft.size} disabled={saving} onChange={(e) => setRecordDraft({ ...recordDraft, size: e.target.value })} placeholder="如 12 MB" />
            </Field>
          </div>
          {recordDraft.name.trim() && <FileCellPreview name={recordDraft.name.trim()} />}
          {formError && (
            <p role="alert" className="text-[11px] text-admin-danger">
              {formError}
            </p>
          )}
        </div>
      </AdminModal>
    </div>
  )
}

/** 新建记录时的图标预览：确认扩展名映射效果，避免建完才发现图标不对 */
function FileCellPreview({ name }: { name: string }) {
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
  return (
    <div className="flex items-center gap-2 rounded-lg border border-ink/15 bg-paper px-3 py-2">
      <FileIcon ext={ext} size={20} />
      <span className="text-[11px] text-admin-muted">
        图标预览：{ext ? `${ext.toUpperCase()} 类型` : '未识别到扩展名，将使用通用样式'}
      </span>
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
