import { ArrowUpCircle, Eye, EyeOff, FileText, Loader2, Pencil, Pin, Plus, Star, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminArticles, adminPosts, adminProjects } from '@/admin/data'
import {
  AButton,
  AdminModal,
  Badge,
  EmptyState,
  Field,
  IconButton,
  Input,
  LoadState,
  PageTitle,
  Panel,
  ReadOnlyNotice,
  SearchBox,
  Select,
  Status,
  TableHead,
  Tabs,
  Textarea,
} from '@/admin/ui'
import { cn, newId } from '@/lib/utils'
import { STATUS_LABELS, contents, toServerStatus, type PublishStatus } from '@/services/content'
import { serverConfig } from '@/services/config'

type Tab = 'articles' | 'projects' | 'moments'

type ArticleRow = {
  id: string
  title: string
  category: string
  status: string
  views: number
  comments: number
  date: string
  words: number
  abstract: string
  version?: number
  /** 结构化正文（sections）序列化结果，编辑弹窗里可直接改并回写服务端 */
  sectionsText?: string
}

type ProjectRow = {
  id: string
  title: string
  category: string
  status: string
  featured: boolean
  views: number
  stars: number
  stack: string[]
  accent: string
  updated: string
  version?: number
}

type MomentRow = {
  id: string
  date: string
  text: string
  tag: string
  visibility: string
  likes: number
  comments: number
  pinned: boolean
  status: string
  version?: number
}

type Raw = Record<string, unknown>

const real = serverConfig.enabled
const DEMO_NOTE = '当前未配置服务端（VITE_API_BASE），新建、编辑、发布、下架、删除等写操作已禁用。'

const STATUS_FILTERS = ['全部', '已发布', '待审核', '草稿', '已下线']
const STATUS_OPTIONS = ['草稿', '待审核', '已发布', '已下线']

/** 与服务端状态机保持一致；前端提前挡住非法迁移，避免提交后才报 422 */
const TRANSITIONS: Record<string, string[]> = {
  草稿: ['待审核', '已发布', '已下线'],
  待审核: ['草稿', '已发布', '已下线'],
  已发布: ['已下线', '草稿'],
  已下线: ['草稿', '已发布'],
}

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const num = (v: unknown) => (typeof v === 'number' ? v : 0)
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
const statusLabel = (s?: string) => (s && STATUS_LABELS[s as PublishStatus]) || s || '草稿'
const today = () => new Date().toISOString().slice(0, 10)

const demoArticles: ArticleRow[] = adminArticles.map((a) => ({
  id: a.id,
  title: a.title,
  category: a.category,
  status: a.status,
  views: a.views,
  comments: a.comments,
  date: a.date,
  words: a.words,
  abstract: '',
}))

const demoProjects: ProjectRow[] = adminProjects.map((p) => ({
  id: p.id,
  title: p.title,
  category: p.category,
  status: p.status,
  featured: p.featured,
  views: p.views,
  stars: p.stars,
  stack: p.stack,
  accent: p.accent,
  updated: p.updated,
}))

const demoMoments: MomentRow[] = adminPosts.map((p) => ({
  id: p.id,
  date: p.date,
  text: p.text,
  tag: p.tag,
  visibility: p.visibility,
  likes: p.likes,
  comments: p.comments,
  pinned: Boolean(p.pinned),
  status: '已发布',
}))

export default function ContentPage({
  tab,
  setTab,
  show,
}: {
  tab: Tab
  setTab: (t: Tab) => void
  show: (m: string) => void
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('全部')
  const [articles, setArticles] = useState<ArticleRow[]>(real ? [] : demoArticles)
  const [projects, setProjects] = useState<ProjectRow[]>(real ? [] : demoProjects)
  const [moments, setMoments] = useState<MomentRow[]>(real ? [] : demoMoments)
  const [loading, setLoading] = useState(real)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ArticleRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [draft, setDraft] = useState({ title: '', category: '工程手记', status: '草稿', abstract: '', sectionsText: '[]' })

  const [projectOpen, setProjectOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null)
  const [projectDraft, setProjectDraft] = useState({ title: '', category: '项目', status: '草稿' })

  const [editingMoment, setEditingMoment] = useState<MomentRow | null>(null)
  const [momentDraft, setMomentDraft] = useState({ text: '', tag: '生活', visibility: '公开' })

  const [postText, setPostText] = useState('')
  const [postVisibility, setPostVisibility] = useState('公开')
  const [publishing, setPublishing] = useState(false)
  const [composeError, setComposeError] = useState('')

  /** 真实模式下拉全量（含草稿 / 已下线）；演示模式只读本地快照 */
  const load = useCallback(async (spinner = true) => {
    if (!real) {
      setArticles(demoArticles)
      setProjects(demoProjects)
      setMoments(demoMoments)
      setLoading(false)
      setError('')
      return
    }
    if (spinner) setLoading(true)
    setError('')
    try {
      const [articleList, projectList, momentList] = await Promise.all([
        contents.listAdmin('articles'),
        contents.listAdmin('projects'),
        contents.listAdmin('moments'),
      ])
      setArticles(
        (articleList as unknown as Raw[]).map((r) => ({
          id: str(r.id),
          title: str(r.title, '未命名文章'),
          category: str(r.category, '未分类'),
          status: statusLabel(str(r.status)),
          views: num(r.views),
          comments: num(r.comments),
          date: str(r.date) || str(r.updatedAt).slice(0, 10) || '—',
          words: num(r.words),
          abstract: str(r.abstract),
          version: typeof r.version === 'number' ? r.version : undefined,
          sectionsText: Array.isArray(r.sections) ? JSON.stringify(r.sections, null, 2) : '[]',
        })),
      )
      setProjects(
        (projectList as unknown as Raw[]).map((r) => ({
          id: str(r.id),
          title: str(r.title, '未命名项目'),
          category: str(r.category, '未分类'),
          status: statusLabel(str(r.status)),
          featured: Boolean(r.featured),
          views: num(r.views),
          stars: num(r.stars),
          stack: arr(r.stack),
          accent: str(r.accent, 'rgb(var(--c-lime))'),
          updated: str(r.updatedAt).slice(0, 10) || '—',
          version: typeof r.version === 'number' ? r.version : undefined,
        })),
      )
      setMoments(
        (momentList as unknown as Raw[]).map((r) => ({
          id: str(r.id),
          date: str(r.date) || str(r.time) || '—',
          text: str(r.text),
          tag: str(r.tag) || arr(r.tags)[0] || '生活',
          visibility: str(r.visibility, '公开'),
          likes: num(r.likes),
          comments: Array.isArray(r.comments) ? r.comments.length : num(r.comments),
          pinned: Boolean(r.pinned),
          status: statusLabel(str(r.status)),
          version: typeof r.version === 'number' ? r.version : undefined,
        })),
      )
    } catch (err) {
      setError(`内容列表加载失败：${(err as Error).message}`)
    } finally {
      if (spinner) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // 切 Tab 时重置筛选，避免把「文章」的关键字带到「动态」
  useEffect(() => {
    setQuery('')
    setStatus('全部')
  }, [tab])

  const keyword = query.trim().toLowerCase()
  const filteredArticles = useMemo(
    () =>
      articles.filter(
        (a) => (status === '全部' || a.status === status) && `${a.title} ${a.category}`.toLowerCase().includes(keyword),
      ),
    [articles, status, keyword],
  )
  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (p) => (status === '全部' || p.status === status) && `${p.title} ${p.category} ${p.stack.join(' ')}`.toLowerCase().includes(keyword),
      ),
    [projects, status, keyword],
  )
  const filteredMoments = useMemo(
    () =>
      moments.filter(
        (m) => (status === '全部' || m.status === status) && `${m.text} ${m.tag}`.toLowerCase().includes(keyword),
      ),
    [moments, status, keyword],
  )

  const runAction = async (key: string, task: () => Promise<unknown>, ok: string, fail: string) => {
    if (!real) return show('未配置服务端，写操作不可用')
    if (busy) return
    setBusy(key)
    try {
      await task()
      await load(false)
      show(ok)
    } catch (err) {
      show(`${fail}：${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  const changeStatus = (domain: 'articles' | 'projects' | 'moments', row: { id: string; title?: string; status: string }, next: PublishStatus) =>
    runAction(
      `${domain}-${row.id}-status`,
      () => contents.setStatus(domain, row.id, next),
      `「${row.title ?? '内容'}」${next === 'published' ? '已发布' : '已下架'}`,
      '状态更新失败',
    )

  const removeRow = (domain: 'articles' | 'projects' | 'moments', row: { id: string; title: string }) => {
    if (!real) return show('未配置服务端，删除不可用')
    if (!window.confirm(`删除「${row.title}」？服务端会标记为「已下线」，可通过状态筛选重新发布。`)) return
    void runAction(
      `${domain}-${row.id}-remove`,
      () => contents.remove(domain, row.id),
      `已删除「${row.title}」（软删除，可在「已下线」中恢复）`,
      '删除失败',
    )
  }

  const openCreate = () => {
    setDraft({ title: '', category: '工程手记', status: '草稿', abstract: '', sectionsText: '[]' })
    setFormError('')
    setCreating(true)
  }

  const openEdit = (a: ArticleRow) => {
    setDraft({ title: a.title, category: a.category, status: a.status, abstract: a.abstract, sectionsText: a.sectionsText ?? '[]' })
    setFormError('')
    setEditing(a)
  }

  /** 正文是 src/data/articles.ts 的 Section[] 结构，后台用 JSON 直接编辑；
   *  空串视为不改动 / 空正文，非法 JSON 或非数组直接拦下，不写入服务端。 */
  const parseSections = (): unknown[] | null => {
    const raw = draft.sectionsText.trim()
    if (!raw) return []
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      setFormError('正文 JSON 格式错误，请检查引号与逗号')
      return null
    }
    if (!Array.isArray(parsed)) {
      setFormError('正文必须是 Section 数组（[{ id, title, subs: [...] }]）')
      return null
    }
    return parsed
  }

  const saveArticle = async () => {
    if (!draft.title.trim()) return setFormError('标题不能为空')
    if (!real) return setFormError(DEMO_NOTE)
    if (saving) return
    const sections = parseSections()
    if (!sections) return
    setSaving(true)
    setFormError('')
    try {
      if (editing) {
        // 元数据与结构化正文一起走乐观锁 upsert，状态单独走状态机（BE-04）
        await contents.upsert('articles', editing.id, { title: draft.title.trim(), category: draft.category, abstract: draft.abstract, sections }, editing.version)
        if (draft.status !== editing.status) {
          await contents.setStatus('articles', editing.id, toServerStatus(draft.status))
        }
        show(`文章「${draft.title.trim()}」已保存`)
      } else {
        await contents.create('articles', newId('article'), {
          title: draft.title.trim(),
          category: draft.category,
          abstract: draft.abstract,
          sections,
          status: toServerStatus(draft.status),
          date: today(),
          views: 0,
          comments: 0,
          words: 0,
        })
        show(`文章「${draft.title.trim()}」已创建`)
      }
      setCreating(false)
      setEditing(null)
      setSaving(false)
      await load(false)
    } catch (err) {
      setFormError(`保存失败：${(err as Error).message}`)
      show(`保存失败：${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const saveProject = async () => {
    if (!projectDraft.title.trim()) return setFormError('项目标题不能为空')
    if (!real) return setFormError(DEMO_NOTE)
    if (saving) return
    setSaving(true)
    setFormError('')
    try {
      if (editingProject) {
        await contents.upsert(
          'projects',
          editingProject.id,
          { title: projectDraft.title.trim(), category: projectDraft.category },
          editingProject.version,
        )
        if (projectDraft.status !== editingProject.status) {
          await contents.setStatus('projects', editingProject.id, toServerStatus(projectDraft.status))
        }
        show('项目已保存')
      } else {
        await contents.create('projects', newId('project'), {
          title: projectDraft.title.trim(),
          category: projectDraft.category,
          status: toServerStatus(projectDraft.status),
          stack: [],
          featured: false,
          views: 0,
          stars: 0,
        })
        show('项目已创建')
      }
      setProjectOpen(false)
      setEditingProject(null)
      setSaving(false)
      await load(false)
    } catch (err) {
      setFormError(`保存失败：${(err as Error).message}`)
      show(`保存失败：${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const publishMoment = async () => {
    if (!real) return show('未配置服务端，发布不可用')
    if (!postText.trim()) return setComposeError('先说点什么吧')
    if (publishing) return
    setPublishing(true)
    setComposeError('')
    try {
      await contents.create('moments', newId('moment'), {
        text: postText.trim(),
        tag: '生活',
        place: '西安',
        visibility: postVisibility,
        pinned: false,
        likes: 0,
        status: 'published',
        date: today(),
      })
      setPostText('')
      await load(false)
      show('动态已发布')
    } catch (err) {
      setComposeError(`发布失败：${(err as Error).message}`)
      show(`发布失败：${(err as Error).message}`)
    } finally {
      setPublishing(false)
    }
  }

  const openMomentEdit = (m: MomentRow) => {
    setMomentDraft({ text: m.text, tag: m.tag, visibility: m.visibility })
    setFormError('')
    setEditingMoment(m)
  }

  const saveMoment = async () => {
    if (!editingMoment) return
    if (!momentDraft.text.trim()) return setFormError('动态内容不能为空')
    if (!real) return setFormError(DEMO_NOTE)
    if (saving) return
    setSaving(true)
    setFormError('')
    try {
      await contents.upsert(
        'moments',
        editingMoment.id,
        { text: momentDraft.text.trim(), tag: momentDraft.tag.trim() || '生活', visibility: momentDraft.visibility },
        editingMoment.version,
      )
      setEditingMoment(null)
      setSaving(false)
      await load(false)
      show('动态已保存')
    } catch (err) {
      setFormError(`保存失败：${(err as Error).message}`)
      show(`保存失败：${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const statusOptions = editing ? [editing.status, ...(TRANSITIONS[editing.status] ?? [])].filter((v, i, a) => a.indexOf(v) === i) : STATUS_OPTIONS
  const projectStatusOptions = editingProject
    ? [editingProject.status, ...(TRANSITIONS[editingProject.status] ?? [])].filter((v, i, a) => a.indexOf(v) === i)
    : STATUS_OPTIONS

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <SearchBox value={query} onChange={setQuery} placeholder="搜索标题 / 分类" className="w-44" />
      <Select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-0 w-28 py-1.5 text-[11px]">
        {STATUS_FILTERS.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </Select>
    </div>
  )

  const publishedCount =
    articles.filter((a) => a.status === '已发布').length +
    projects.filter((p) => p.status === '已发布').length +
    moments.filter((m) => m.status === '已发布').length
  const unpublishedCount = articles.length + projects.length + moments.length - publishedCount

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Content"
        title="内容管理"
        desc={real ? '列表与状态来自服务端；保存走乐观锁，发布 / 下架走状态机。' : '当前为演示只读数据：写操作全部禁用，不会伪装成功。'}
        right={
          <>
            <Link to="/learn" className="text-[11.5px] text-admin-muted transition hover:text-admin-ink">
              查看前台
            </Link>
            {tab === 'articles' && (
              <AButton
                variant="primary"
                icon={<Plus size={13} />}
                onClick={openCreate}
                disabled={!real}
                title={real ? '' : '未配置服务端：不能新建'}
              >
                新建文章
              </AButton>
            )}
            {tab === 'projects' && (
              <AButton
                variant="primary"
                icon={<Plus size={13} />}
                onClick={() => {
                  setEditingProject(null)
                  setProjectDraft({ title: '', category: '项目', status: '草稿' })
                  setFormError('')
                  setProjectOpen(true)
                }}
                disabled={!real}
                title={real ? '' : '未配置服务端：不能新建'}
              >
                新建项目
              </AButton>
            )}
          </>
        }
      />

      <ReadOnlyNotice show={!real}>
        {DEMO_NOTE} 配置 <span className="font-mono text-[9.5px]">VITE_API_BASE</span> 并登录后自动切换到真实接口。
      </ReadOnlyNotice>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: '已发布内容', value: publishedCount, note: '文章 + 项目 + 动态' },
          { label: '草稿 / 待审 / 下线', value: unpublishedCount, note: '按服务端状态统计' },
          { label: '文章总浏览', value: articles.reduce((s, a) => s + (a.views || 0), 0).toLocaleString(), note: '后端字段 views' },
          { label: '项目推荐位', value: String(projects.filter((p) => p.featured).length), note: 'featured=true' },
        ].map((s) => (
          <div key={s.label} className="flex items-center justify-between rounded-[18px] border-1.5 border-ink bg-cream px-3.5 py-3 shadow-hard-sm">
            <div>
              <p className="text-[10.5px] text-admin-muted">{s.label}</p>
              <p className="mt-1.5 font-display text-[23px] font-extrabold leading-none">{s.value}</p>
            </div>
            <span className="text-right text-[9.5px] leading-tight text-admin-muted">{s.note}</span>
          </div>
        ))}
      </div>

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        items={[
          { key: 'articles', label: '文章', count: articles.length },
          { key: 'projects', label: '项目', count: projects.length },
          { key: 'moments', label: '动态', count: moments.length },
        ]}
      />

      {tab === 'articles' && (
        <Panel
          kicker="Articles"
          title="文章列表"
          desc={`共 ${articles.length} 篇 · 已发布 ${articles.filter((a) => a.status === '已发布').length} 篇`}
          flush
          right={toolbar}
        >
          <LoadState loading={loading} error={error} onRetry={() => void load()} label="正在加载文章…">
            <div className="overflow-x-auto no-scrollbar">
              <div className="admin-zebra min-w-[880px]">
                <TableHead cols={['标题', '分类', '状态', '浏览', '评论', '更新', '操作']} template="minmax(0,1fr) 96px 78px 58px 52px 86px 150px" />
                {filteredArticles.map((a) => {
                  const statusKey = `articles-${a.id}-status`
                  const removeKey = `articles-${a.id}-remove`
                  const published = a.status === '已发布'
                  return (
                    <div
                      key={a.id}
                      className="grid grid-cols-[minmax(0,1fr)_96px_78px_58px_52px_86px_150px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11.5px] last:border-0 hover:bg-lime/20"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText size={13} className="shrink-0 text-admin-muted" />
                        <span className="truncate font-medium" title={a.title}>
                          {a.title}
                        </span>
                        {busy === statusKey && <Loader2 size={11} className="shrink-0 animate-spin text-admin-muted" />}
                      </div>
                      <span className="truncate text-[10.5px] text-admin-muted">{a.category}</span>
                      <Status>{a.status}</Status>
                      <span className="font-mono text-[10.5px] text-admin-muted">{a.views.toLocaleString()}</span>
                      <span className="font-mono text-[10.5px] text-admin-muted">{a.comments}</span>
                      <span className="font-mono text-[9.5px] text-admin-muted">{a.date}</span>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/learn/${a.id}`}
                          aria-label="预览"
                          title="预览前台文章"
                          className="flex h-7 w-7 items-center justify-center rounded-md border-1.5 border-ink/20 text-ink/60 transition hover:border-ink hover:bg-lime hover:text-ink"
                        >
                          <Eye size={12} />
                        </Link>
                        <IconButton
                          label={published ? '下架' : '发布'}
                          disabled={!real || busy !== null}
                          onClick={() => void changeStatus('articles', a, published ? 'hidden' : 'published')}
                        >
                          {published ? <EyeOff size={12} /> : <ArrowUpCircle size={12} />}
                        </IconButton>
                        <IconButton
                          label="编辑"
                          disabled={!real || busy !== null}
                          onClick={() => openEdit(a)}
                        >
                          <Pencil size={12} />
                        </IconButton>
                        <IconButton
                          label="删除"
                          disabled={!real || busy !== null}
                          className="hover:border-coral/60 hover:text-admin-danger"
                          onClick={() => removeRow('articles', a)}
                        >
                          {busy === removeKey ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </IconButton>
                      </div>
                    </div>
                  )
                })}
                {filteredArticles.length === 0 && (
                  <EmptyState title={articles.length ? '没有匹配的文章' : '还没有文章'} desc={articles.length ? '试试换个关键字或状态筛选' : '新建一篇文章后会出现在这里'} />
                )}
              </div>
            </div>
          </LoadState>
        </Panel>
      )}

      {tab === 'projects' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] border-1.5 border-ink bg-cream px-3.5 py-2.5 shadow-hard-sm">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-admin-muted">
              PROJECTS / {filteredProjects.length} OF {projects.length}
            </span>
            {toolbar}
          </div>
          <LoadState loading={loading} error={error} onRetry={() => void load()} label="正在加载项目…">
            {filteredProjects.length === 0 ? (
              <div className="rounded-[18px] border-1.5 border-dashed border-ink/20 bg-cream/60">
                <EmptyState title={projects.length ? '没有匹配的项目' : '还没有项目'} desc={projects.length ? '试试换个关键字或状态筛选' : '新建项目后会出现在这里'} />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredProjects.map((p) => {
                  const statusKey = `projects-${p.id}-status`
                  const removeKey = `projects-${p.id}-remove`
                  const featuredKey = `projects-${p.id}-featured`
                  const published = p.status === '已发布'
                  return (
                    <div key={p.id} className="group flex flex-col rounded-[18px] border-1.5 border-ink bg-cream p-4 shadow-hard-sm transition hover:-translate-y-0.5 hover:shadow-hard">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-6 w-1.5 shrink-0 rounded-full" style={{ background: p.accent }} />
                          <h3 className="truncate text-[12.5px] font-semibold" title={p.title}>
                            {p.title}
                          </h3>
                        </div>
                        <button
                          aria-label={p.featured ? '取消首页推荐' : '设为首页推荐'}
                          title={real ? (p.featured ? '取消首页推荐' : '设为首页推荐') : '未配置服务端：不可修改'}
                          disabled={!real || busy !== null}
                          onClick={() =>
                            void runAction(
                              featuredKey,
                              () => contents.upsert('projects', p.id, { featured: !p.featured }, p.version),
                              p.featured ? '已取消首页推荐' : '已设为首页推荐',
                              '更新失败',
                            )
                          }
                          className={cn(
                            'shrink-0 rounded-md p-1 transition disabled:cursor-not-allowed disabled:opacity-40',
                            p.featured ? 'text-admin-amber' : 'text-admin-muted/60 hover:text-admin-muted',
                          )}
                        >
                          {busy === featuredKey ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} fill={p.featured ? 'rgb(var(--c-amber))' : 'none'} />}
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.stack.length ? (
                          p.stack.slice(0, 5).map((s) => (
                            <span key={s} className="rounded border border-ink/15 px-1.5 py-px font-mono text-[9px] text-admin-muted">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="font-mono text-[9px] text-admin-muted">暂无技术栈</span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-admin-muted">
                        <span>{p.category}</span>
                        <span className="h-2.5 w-px bg-ink/15" />
                        <span>浏览 {p.views}</span>
                        <span>收藏 {p.stars}</span>
                        <span className="ml-auto">{p.updated}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-dashed border-ink/15 pt-2.5">
                        <Badge tone={p.status === '已发布' ? 'teal' : p.status === '已下线' ? 'neutral' : 'amber'}>{p.status}</Badge>
                        <div className="flex items-center gap-1">
                          <AButton
                            size="sm"
                            variant="soft"
                            disabled={!real || busy !== null}
                            title={real ? '' : '未配置服务端：不可编辑'}
                            onClick={() => {
                              setEditingProject(p)
                              setProjectDraft({ title: p.title, category: p.category, status: p.status })
                              setFormError('')
                              setProjectOpen(true)
                            }}
                          >
                            编辑
                          </AButton>
                          <IconButton
                            label={published ? '下架' : '发布'}
                            disabled={!real || busy !== null}
                            onClick={() => void changeStatus('projects', p, published ? 'hidden' : 'published')}
                          >
                            {busy === statusKey ? <Loader2 size={12} className="animate-spin" /> : published ? <EyeOff size={12} /> : <ArrowUpCircle size={12} />}
                          </IconButton>
                          <IconButton
                            label="删除"
                            disabled={!real || busy !== null}
                            className="hover:border-coral/60 hover:text-admin-danger"
                            onClick={() => removeRow('projects', p)}
                          >
                            {busy === removeKey ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </IconButton>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </LoadState>
        </div>
      )}

      {tab === 'moments' && (
        <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-3">
            <Panel kicker="Compose" title="发布新动态" desc={real ? '发布后立即进入动态流；可随时下架。' : '未配置服务端：编辑框与发布按钮已禁用。'}>
              <Textarea
                value={postText}
                onChange={(e) => {
                  setPostText(e.target.value)
                  if (composeError) setComposeError('')
                }}
                disabled={!real || publishing}
                placeholder={real ? '记录一下今天… 支持换行，发布后会出现在「生活 / 动态」。' : '未配置服务端（VITE_API_BASE），暂时不能发布动态'}
                rows={4}
              />
              {composeError && <p className="mt-2 text-[10.5px] text-admin-danger">{composeError}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select
                  value={postVisibility}
                  onChange={(e) => setPostVisibility(e.target.value)}
                  disabled={!real || publishing}
                  className="mt-0 w-28 py-1.5 text-[11px]"
                >
                  <option>公开</option>
                  <option>仅自己</option>
                </Select>
                <span className="text-[10px] text-admin-muted">{postText.length} / 500 字</span>
                <AButton
                  variant="primary"
                  className="ml-auto"
                  disabled={!real || publishing}
                  title={real ? '' : '未配置服务端：不能发布'}
                  onClick={() => void publishMoment()}
                  icon={publishing ? <Loader2 size={12} className="animate-spin" /> : undefined}
                >
                  {publishing ? '发布中…' : '发布动态'}
                </AButton>
              </div>
            </Panel>

            <Panel
              kicker="Timeline"
              title="动态列表"
              desc={`${moments.length} 条 · 置顶 ${moments.filter((m) => m.pinned).length} 条`}
              flush
              right={toolbar}
            >
              <LoadState loading={loading} error={error} onRetry={() => void load()} label="正在加载动态…">
                <div className="divide-y divide-ink/10">
                  {filteredMoments.map((m) => {
                    const statusKey = `moments-${m.id}-status`
                    const removeKey = `moments-${m.id}-remove`
                    const pinKey = `moments-${m.id}-pin`
                    const published = m.status === '已发布'
                    return (
                      <div key={m.id} className="px-4 py-3 sm:px-5">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-admin-muted">
                          <span className="font-mono">{m.date}</span>
                          <Badge tone="neutral">{m.tag}</Badge>
                          <span>{m.visibility}</span>
                          <Status>{m.status}</Status>
                          {m.pinned && <Badge tone="red">置顶</Badge>}
                          <div className="ml-auto flex items-center gap-1">
                            <IconButton
                              label={m.pinned ? '取消置顶' : '置顶'}
                              disabled={!real || busy !== null}
                              onClick={() =>
                                void runAction(
                                  pinKey,
                                  () => contents.upsert('moments', m.id, { pinned: !m.pinned }, m.version),
                                  m.pinned ? '已取消置顶' : '已置顶',
                                  '置顶失败',
                                )
                              }
                            >
                              {busy === pinKey ? <Loader2 size={11} className="animate-spin" /> : <Pin size={11} />}
                            </IconButton>
                            <IconButton label="编辑" disabled={!real || busy !== null} onClick={() => openMomentEdit(m)}>
                              <Pencil size={11} />
                            </IconButton>
                            <IconButton
                              label={published ? '下架' : '发布'}
                              disabled={!real || busy !== null}
                              onClick={() =>
                                void changeStatus('moments', { id: m.id, title: m.text.slice(0, 18) || '这条动态', status: m.status }, published ? 'hidden' : 'published')
                              }
                            >
                              {busy === statusKey ? <Loader2 size={11} className="animate-spin" /> : published ? <EyeOff size={11} /> : <ArrowUpCircle size={11} />}
                            </IconButton>
                            <IconButton
                              label="删除"
                              disabled={!real || busy !== null}
                              className="hover:border-coral/60 hover:text-admin-danger"
                              onClick={() => removeRow('moments', { id: m.id, title: m.text.slice(0, 18) || '这条动态' })}
                            >
                              {busy === removeKey ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                            </IconButton>
                          </div>
                        </div>
                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-admin-ink/85">{m.text}</p>
                        <p className="mt-1.5 flex items-center gap-3 font-mono text-[9.5px] text-admin-muted">
                          <span>♥ {m.likes}</span>
                          <span>💬 {m.comments}</span>
                        </p>
                      </div>
                    )
                  })}
                  {filteredMoments.length === 0 && (
                    <EmptyState title={moments.length ? '没有匹配的动态' : '还没有动态'} desc={moments.length ? '试试换个关键字或状态筛选' : '发布第一条动态后会出现在这里'} />
                  )}
                </div>
              </LoadState>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel kicker="Visibility" title="发布规则">
              <ul className="space-y-2 text-[11px] leading-relaxed text-admin-muted">
                <li>· 公开动态会同步到首页动态流与 RSS。</li>
                <li>· 「仅自己」只出现在后台，不会进入 sitemap。</li>
                <li>· 置顶动态最多展示 1 条，其余按时间排序。</li>
                <li>· 下架后仍保留在后台，可重新发布。</li>
              </ul>
            </Panel>
            <Panel kicker="Status" title="状态说明">
              <div className="space-y-2 text-[11px]">
                {[
                  ['草稿', '仅后台可见，可继续编辑'],
                  ['待审核', '等待人工确认后发布'],
                  ['已发布', '前台 / RSS 可见'],
                  ['已下线', '从前台移除，可恢复'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-2 border-b border-ink/10 pb-1.5 last:border-0">
                    <Status>{k}</Status>
                    <span className="text-right text-[10px] text-admin-muted">{v}</span>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel kicker="Sync" title="同步状态">
              <div className="space-y-2 text-[11px]">
                {[
                  ['GitHub README', '未接入'],
                  ['RSS 订阅源', real ? '随发布更新' : '未接入'],
                  ['公众号草稿箱', '未连接'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-admin-muted">{k}</span>
                    <Badge tone={v === '随发布更新' ? 'teal' : 'neutral'}>{v}</Badge>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      <AdminModal
        open={creating || editing !== null}
        onClose={() => {
          if (saving) return
          setCreating(false)
          setEditing(null)
        }}
        title={editing ? '编辑文章' : '新建文章'}
        desc={editing ? `最后更新 ${editing.date} · 保存走乐观锁` : '创建后可继续编辑；状态遵循服务端状态机'}
        width="max-w-2xl"
        footer={
          <>
            <AButton
              disabled={saving}
              onClick={() => {
                setCreating(false)
                setEditing(null)
              }}
            >
              取消
            </AButton>
            <AButton
              variant="primary"
              disabled={saving || !real}
              title={real ? '' : '未配置服务端：不能保存'}
              onClick={() => void saveArticle()}
              icon={saving ? <Loader2 size={12} className="animate-spin" /> : undefined}
            >
              {saving ? '保存中…' : draft.status === '已发布' ? '保存并发布' : '保存'}
            </AButton>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <Field label="标题">
            <Input
              autoFocus
              value={draft.title}
              disabled={saving}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="例如：把 RAG 评测做成流水线"
            />
          </Field>
          <Field label="状态">
            <Select value={draft.status} disabled={saving} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
              {statusOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="分类" className="sm:col-span-2">
            <Select value={draft.category} disabled={saving} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {['RAG 工程化', 'Agent 评测', '工程手记'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="摘要" className="sm:col-span-2">
            <Textarea
              value={draft.abstract}
              disabled={saving}
              onChange={(e) => setDraft({ ...draft, abstract: e.target.value })}
              rows={2}
              placeholder="一两句话说明这篇在讲什么"
            />
          </Field>
          <Field
            label="正文（结构化 JSON）"
            hint="前台文章正文为 Section[]：每项 { id, title, lead?, subs: [{ id, title, blocks: [{ t, v, … }] }] }。直接编辑 JSON，保存时校验并写入服务端 /api/content/articles/:id"
            className="sm:col-span-2"
          >
            <Textarea
              value={draft.sectionsText}
              disabled={saving || !real}
              onChange={(e) => setDraft({ ...draft, sectionsText: e.target.value })}
              rows={8}
              spellCheck={false}
              placeholder='[{ "id": "s1", "title": "章节标题", "subs": [{ "id": "s1-1", "title": "小节", "blocks": [{ "t": "p", "v": "正文段落" }] }] }]'
              className="font-mono text-[11px] leading-relaxed"
            />
          </Field>
          {formError && (
            <p role="alert" className="text-[11px] text-admin-danger sm:col-span-2">
              {formError}
            </p>
          )}
        </div>
      </AdminModal>

      <AdminModal
        open={projectOpen}
        onClose={() => {
          if (saving) return
          setProjectOpen(false)
          setEditingProject(null)
        }}
        title={editingProject ? '编辑项目' : '新建项目'}
        desc="保存后写入 /api/content/projects，并重新拉取列表确认"
        footer={
          <>
            <AButton
              disabled={saving}
              onClick={() => {
                setProjectOpen(false)
                setEditingProject(null)
              }}
            >
              取消
            </AButton>
            <AButton
              variant="primary"
              disabled={saving || !real}
              title={real ? '' : '未配置服务端：不能保存'}
              onClick={() => void saveProject()}
              icon={saving ? <Loader2 size={12} className="animate-spin" /> : undefined}
            >
              {saving ? '保存中…' : '保存'}
            </AButton>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <Field label="项目标题">
            <Input
              autoFocus
              value={projectDraft.title}
              disabled={saving}
              onChange={(e) => setProjectDraft({ ...projectDraft, title: e.target.value })}
              placeholder="例如：Agent 评测中台"
            />
          </Field>
          <Field label="状态">
            <Select value={projectDraft.status} disabled={saving} onChange={(e) => setProjectDraft({ ...projectDraft, status: e.target.value })}>
              {projectStatusOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="分类" className="sm:col-span-2">
            <Input
              value={projectDraft.category}
              disabled={saving}
              onChange={(e) => setProjectDraft({ ...projectDraft, category: e.target.value })}
              placeholder="AI 全栈 / Agent 开发 / 开源"
            />
          </Field>
          <p className="text-[10.5px] leading-relaxed text-admin-muted sm:col-span-2">
            技术栈、指标与详情仍在前台数据文件中维护；这里管理标题、分类与发布状态。
          </p>
          {formError && (
            <p role="alert" className="text-[11px] text-admin-danger sm:col-span-2">
              {formError}
            </p>
          )}
        </div>
      </AdminModal>
      <AdminModal
        open={editingMoment !== null}
        onClose={() => {
          if (saving) return
          setEditingMoment(null)
        }}
        title="编辑动态"
        desc="保存后重新拉取列表确认；状态与置顶请在列表中操作"
        width="max-w-xl"
        footer={
          <>
            <AButton disabled={saving} onClick={() => setEditingMoment(null)}>
              取消
            </AButton>
            <AButton
              variant="primary"
              disabled={saving || !real}
              title={real ? '' : '未配置服务端：不能保存'}
              onClick={() => void saveMoment()}
              icon={saving ? <Loader2 size={12} className="animate-spin" /> : undefined}
            >
              {saving ? '保存中…' : '保存'}
            </AButton>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="内容">
            <Textarea
              autoFocus
              value={momentDraft.text}
              disabled={saving}
              onChange={(e) => setMomentDraft({ ...momentDraft, text: e.target.value })}
              rows={4}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="标签">
              <Input value={momentDraft.tag} disabled={saving} onChange={(e) => setMomentDraft({ ...momentDraft, tag: e.target.value })} placeholder="生活" />
            </Field>
            <Field label="可见性">
              <Select value={momentDraft.visibility} disabled={saving} onChange={(e) => setMomentDraft({ ...momentDraft, visibility: e.target.value })}>
                <option>公开</option>
                <option>仅自己</option>
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
    </div>
  )
}
