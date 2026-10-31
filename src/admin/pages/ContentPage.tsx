import { Eye, FileText, Pencil, Pin, Plus, Star, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminArticles, adminPosts, adminProjects, contentStats } from '@/admin/data'
import {
  AButton,
  AdminModal,
  Badge,
  Field,
  IconButton,
  Input,
  PageTitle,
  Panel,
  SearchBox,
  Select,
  Status,
  TableHead,
  Tabs,
  Textarea,
} from '@/admin/ui'
import { cn, newId } from '@/lib/utils'
import { STATUS_LABELS, contents, toServerStatus } from '@/services/content'
import { serverConfig } from '@/services/config'

type Tab = 'articles' | 'projects' | 'moments'
type ArticleRow = (typeof adminArticles)[number] & { version?: number }
type PostRow = (typeof adminPosts)[number] & { status?: string; version?: number; pinned?: boolean }
type ProjectRow = (typeof adminProjects)[number] & { version?: number; status?: string }

const statusFilters = ['全部', '已发布', '草稿', '待审核']
/** 演示模式写操作的统一说法：不伪装成功 */
const demoNote = '演示模式：只改本次会话，刷新后丢失'

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
  const [articles, setArticles] = useState<ArticleRow[]>(adminArticles)
  const [projects, setProjects] = useState<ProjectRow[]>(adminProjects)
  const [posts, setPosts] = useState<PostRow[]>(adminPosts)
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null)
  const [projectOpen, setProjectOpen] = useState(false)
  const [projectDraft, setProjectDraft] = useState({ title: '', category: '项目', status: '草稿' })
  const [editing, setEditing] = useState<ArticleRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ title: '', category: '工程手记', status: '草稿', abstract: '', body: '' })
  const [postText, setPostText] = useState('')
  const [postVisibility, setPostVisibility] = useState('公开')

  /** X-02：服务端模式下列表必须读真实数据（含草稿/状态/version），不再用演示种子 */
  const loadArticles = useCallback(async () => {
    if (!serverConfig.enabled) return
    const [list, projectList, momentList] = await Promise.all([
      contents.listAdmin('articles'),
      contents.listAdmin('projects'),
      contents.listAdmin('moments'),
    ])
    setArticles(
      list.map((a) => {
        const row = a as typeof a & { status?: string; comments?: number; words?: number; version?: number }
        const status = (STATUS_LABELS[row.status as keyof typeof STATUS_LABELS] ?? '已发布') as ArticleRow['status']
        return {
          id: a.id,
          title: a.title,
          category: a.category,
          status,
          views: a.views ?? 0,
          comments: row.comments ?? 0,
          date: a.date ?? '',
          words: row.words ?? 0,
          version: row.version,
        }
      }),
    )
    setProjects(
      projectList.map((p) => {
        const row = p as typeof p & { status?: string; version?: number; stack?: string[]; views?: number; stars?: number; updatedAt?: string; motif?: string }
        return {
          id: p.id,
          title: p.title,
          category: p.category ?? '项目',
          status: STATUS_LABELS[row.status as keyof typeof STATUS_LABELS] ?? '已发布',
          featured: Boolean((p as { featured?: boolean }).featured),
          views: row.views ?? 0,
          stars: row.stars ?? 0,
          stack: row.stack ?? [],
          accent: row.motif ?? 'rgb(var(--c-lime))',
          updated: (row.updatedAt ?? '').slice(0, 10) || '—',
          version: row.version,
        }
      }),
    )
    setPosts(
      momentList.map((m) => {
        const row = m as typeof m & { status?: string; version?: number; pinned?: boolean; likes?: number; comments?: number; visibility?: string; tag?: string; text?: string; place?: string; date?: string }
        return {
          id: m.id,
          date: (row.date ?? '').slice(0, 10) || '—',
          text: row.text ?? '',
          tag: (row.tag ?? '生活') as PostRow['tag'],
          visibility: row.visibility ?? '公开',
          likes: typeof row.likes === 'number' ? row.likes : 0,
          comments: Array.isArray((m as { comments?: unknown }).comments)
            ? ((m as { comments: unknown[] }).comments).length
            : Number((m as unknown as { comments?: number }).comments) || 0,
          pinned: Boolean(row.pinned),
          status: row.status ?? 'published',
          version: row.version,
        }
      }),
    )
  }, [])

  useEffect(() => {
    void loadArticles()
  }, [loadArticles])

  const filteredArticles = useMemo(
    () =>
      articles.filter(
        (a) =>
          (status === '全部' || a.status === status) &&
          (a.title + a.category).toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [articles, query, status],
  )

  const openCreate = () => {
    setDraft({ title: '', category: '工程手记', status: '草稿', abstract: '', body: '' })
    setCreating(true)
  }

  const openEdit = (a: ArticleRow) => {
    setDraft({ title: a.title, category: a.category, status: a.status, abstract: '保持原有摘要，仅演示编辑流程。', body: '' })
    setEditing(a)
  }

  const saveEdit = async () => {
    if (!draft.title.trim()) return show('标题不能为空')
    // BE-04：正文/元数据走 upsert，状态单独走状态机，不再用 PUT 直改 status
    const payload = { title: draft.title, category: draft.category, abstract: draft.abstract }
    if (!serverConfig.enabled) {
      if (editing) {
        setArticles((l) => l.map((a) => (a.id === editing.id ? { ...a, title: draft.title, category: draft.category, status: draft.status as ArticleRow['status'] } : a)))
        setEditing(null)
      } else {
        setArticles((l) => [
          { id: newId('new'), title: draft.title, category: draft.category, status: draft.status as ArticleRow['status'], views: 0, comments: 0, date: '2026-10-30', words: 0 },
          ...l,
        ])
        setCreating(false)
      }
      return show(`已更新界面 · ${demoNote}`)
    }
    try {
      const id = editing?.id ?? newId('article')
      if (editing) {
        await contents.upsert('articles', id, payload, editing.version)
        const nextStatus = toServerStatus(draft.status)
        if (nextStatus !== toServerStatus(editing.status)) await contents.setStatus('articles', id, nextStatus)
      } else {
        await contents.create('articles', id, { ...payload, status: toServerStatus(draft.status) })
      }
      setEditing(null)
      setCreating(false)
      await loadArticles()
      show('已保存到服务端')
    } catch (err) {
      show(`保存失败：${(err as Error).message}`)
    }
  }

  const saveProject = async () => {
    if (!projectDraft.title.trim()) return show('项目标题不能为空')
    if (!serverConfig.enabled) return show(demoNote)
    try {
      const id = editingProject?.id ?? newId('project')
      if (editingProject) {
        await contents.upsert('projects', id, { title: projectDraft.title, category: projectDraft.category }, editingProject.version)
        const next = toServerStatus(projectDraft.status)
        if (next !== toServerStatus(editingProject.status ?? '已发布')) await contents.setStatus('projects', id, next)
      } else {
        await contents.create('projects', id, { title: projectDraft.title, category: projectDraft.category, status: toServerStatus(projectDraft.status), stack: [], featured: false })
      }
      setProjectOpen(false)
      setEditingProject(null)
      await loadArticles()
      show('项目已保存')
    } catch (err) {
      show(`保存失败：${(err as Error).message}`)
    }
  }

  const publishPost = async () => {
    if (!postText.trim()) return show('先说点什么吧')
    const text = postText.trim()
    const id = newId('post')
    const row: PostRow = { id, date: new Date().toISOString().slice(0, 10), text, tag: '生活', visibility: postVisibility, likes: 0, comments: 0, pinned: false }
    if (serverConfig.enabled) {
      try {
        await contents.create('moments', id, { text, place: '西安', visibility: postVisibility, status: 'pending' })
        setPostText('')
        show('已提交到服务端，待审核后公开')
      } catch (err) {
        show(`发布失败：${(err as Error).message}`)
      }
      return
    }
    setPosts((l) => [row, ...l])
    setPostText('')
    show(`动态已发布 · ${demoNote}`)
  }

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Content"
        title="内容管理"
        desc={serverConfig.enabled ? '列表与状态来自服务端；保存走乐观锁，发布走状态机（前台仍读 src/data，见 fx2 X-05）。' : '当前未接服务端：列表为演示数据，写操作只改本次会话。'}
        right={
          <>
            <Link to="/learn" className="text-[11.5px] text-admin-muted transition hover:text-admin-ink">
              查看前台
            </Link>
            {tab === 'articles' && (
              <AButton variant="primary" icon={<Plus size={13} />} onClick={openCreate}>
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
                  setProjectOpen(true)
                }}
                disabled={!serverConfig.enabled}
                title={serverConfig.enabled ? '' : '未接服务端：不能新建'}
              >
                新建项目
              </AButton>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: '已发布内容', value: articles.filter((a) => a.status === '已发布').length + projects.filter((p) => p.status === '已发布').length + posts.filter((p) => p.status === 'published').length, note: '文章 + 项目 + 动态' },
          { label: '草稿 / 待审', value: articles.filter((a) => a.status !== '已发布').length + projects.filter((p) => p.status !== '已发布').length + posts.filter((p) => p.status !== 'published').length, note: '来自服务端状态' },
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
          { key: 'moments', label: '动态', count: posts.length },
        ]}
      />

      {tab === 'articles' && (
        <Panel
          kicker="Articles"
          title="文章列表"
          desc={`共 ${articles.length} 篇 · ${articles.filter((a) => a.status === '草稿').length} 篇草稿`}
          flush
          right={
            <div className="flex flex-wrap items-center gap-2">
              <SearchBox value={query} onChange={setQuery} placeholder="搜索标题或分类" className="w-40" />
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-0 w-28 py-1.5 text-[11px]">
                {statusFilters.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </div>
          }
        >
          <div className="overflow-x-auto no-scrollbar">
            <div className="admin-zebra min-w-[760px]">
              <TableHead cols={['标题', '分类', '状态', '浏览', '评论', '更新', '操作']} template="minmax(0,1fr) 96px 78px 58px 52px 78px 104px" />
              {filteredArticles.map((a) => (
                <div
                  key={a.id}
                  className="grid grid-cols-[minmax(0,1fr)_96px_78px_58px_52px_78px_104px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11.5px] last:border-0 hover:bg-lime/20"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText size={13} className="shrink-0 text-admin-muted" />
                    <span className="truncate font-medium">{a.title}</span>
                  </div>
                  <span className="truncate text-[10.5px] text-admin-muted">{a.category}</span>
                  <Status>{a.status}</Status>
                  <span className="font-mono text-[10.5px] text-admin-muted">{a.views.toLocaleString()}</span>
                  <span className="font-mono text-[10.5px] text-admin-muted">{a.comments}</span>
                  <span className="font-mono text-[9.5px] text-admin-muted">{a.date}</span>
                  <div className="flex items-center justify-end gap-1">
                    <Link to={`/learn/${a.id}`} aria-label="预览" className="flex h-7 w-7 items-center justify-center rounded-md border-1.5 border-ink/20 text-ink/60 transition hover:border-ink hover:bg-lime hover:text-ink">
                      <Eye size={12} />
                    </Link>
                    <IconButton label="编辑" onClick={() => openEdit(a)}>
                      <Pencil size={12} />
                    </IconButton>
                    <IconButton
                      label="删除"
                      className="hover:border-coral/60 hover:text-admin-danger"
                      onClick={() => {
                        if (!serverConfig.enabled) return show(demoNote)
                        void contents
                          .setStatus('articles', a.id, 'hidden')
                          .then(() => loadArticles())
                          .then(() => show('已下线（可在服务端重新发布）'))
                          .catch((err) => show(`下线失败：${(err as Error).message}`))
                      }}
                    >
                      <Trash2 size={12} />
                    </IconButton>
                  </div>
                </div>
              ))}
              {filteredArticles.length === 0 && <p className="px-4 py-10 text-center text-[11.5px] text-admin-muted">没有匹配的文章</p>}
            </div>
          </div>
        </Panel>
      )}

      {tab === 'projects' && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="group flex flex-col rounded-[18px] border-1.5 border-ink bg-cream p-4 shadow-hard-sm transition hover:-translate-y-0.5 hover:shadow-hard">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-6 w-1.5 shrink-0 rounded-full" style={{ background: p.accent }} />
                  <h3 className="truncate text-[12.5px] font-semibold" title={p.title}>
                    {p.title}
                  </h3>
                </div>
                <button
                  aria-label="首页推荐"
                  onClick={() => {
                    if (!serverConfig.enabled) return show(demoNote)
                    void contents
                      .upsert('projects', p.id, { featured: !p.featured }, p.version)
                      .then(() => loadArticles())
                      .then(() => show(p.featured ? '已取消首页推荐' : '已设为首页推荐'))
                      .catch((err) => show(`更新失败：${(err as Error).message}`))
                  }}
                  className={cn('shrink-0 rounded-md p-1 transition', p.featured ? 'text-admin-amber' : 'text-admin-muted/60 hover:text-admin-muted')}
                >
                  <Star size={13} fill={p.featured ? 'rgb(var(--c-amber))' : 'none'} />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.stack.map((s) => (
                  <span key={s} className="rounded border border-ink/15 px-1.5 py-px font-mono text-[9px] text-admin-muted">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3 text-[10px] text-admin-muted">
                <span>{p.category}</span>
                <span className="h-2.5 w-px bg-ink/15" />
                <span>浏览 {p.views}</span>
                <span>收藏 {p.stars}</span>
                <span className="ml-auto">{p.updated}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-dashed border-ink/15 pt-2.5">
                <Badge tone={p.status === '已发布' ? 'teal' : 'neutral'}>{p.status}</Badge>
                <div className="flex items-center gap-1">
                  <AButton
                    size="sm"
                    variant="soft"
                    onClick={() => {
                      if (!serverConfig.enabled) return show(demoNote)
                      setEditingProject(p)
                      setProjectDraft({ title: p.title, category: p.category, status: p.status })
                      setProjectOpen(true)
                    }}
                  >
                    编辑
                  </AButton>
                  <IconButton
                    label="下架"
                    className="hover:border-coral/60 hover:text-admin-danger"
                    onClick={() => {
                      if (!serverConfig.enabled) return show(demoNote)
                      void contents
                        .setStatus('projects', p.id, 'hidden')
                        .then(() => loadArticles())
                        .then(() => show('项目已下架'))
                        .catch((err) => show(`下架失败：${(err as Error).message}`))
                    }}
                  >
                    <Trash2 size={12} />
                  </IconButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'moments' && (
        <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-3">
            <Panel kicker="Compose" title="发布新动态">
              <Textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="记录一下今天… 支持换行，发布后会出现在「生活 / 动态」。"
                rows={4}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select value={postVisibility} onChange={(e) => setPostVisibility(e.target.value)} className="mt-0 w-28 py-1.5 text-[11px]">
                  <option>公开</option>
                  <option>仅自己</option>
                </Select>
                <span className="text-[10px] text-admin-muted">{postText.length} / 500 字</span>
                <AButton variant="primary" className="ml-auto" onClick={publishPost}>
                  发布动态
                </AButton>
              </div>
            </Panel>

            <Panel kicker="Timeline" title="动态列表" desc={`${posts.length} 条 · 置顶 ${posts.filter((p) => p.pinned).length} 条`} flush>
              <div className="divide-y divide-ink/10">
                {posts.map((p) => (
                  <div key={p.id} className="px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2 text-[10px] text-admin-muted">
                      <span className="font-mono">{p.date}</span>
                      <Badge tone="neutral">{p.tag}</Badge>
                      <span>{p.visibility}</span>
                      {p.pinned && <Badge tone="red">置顶</Badge>}
                      <div className="ml-auto flex items-center gap-1">
                        <IconButton
                          label={p.pinned ? '取消置顶' : '置顶'}
                          onClick={() => {
                            if (!serverConfig.enabled) return show(demoNote)
                            void contents
                              .upsert('moments', p.id, { pinned: !p.pinned }, p.version)
                              .then(() => loadArticles())
                              .then(() => show(p.pinned ? '已取消置顶' : '已置顶'))
                              .catch((err) => show(`置顶失败：${(err as Error).message}`))
                          }}
                        >
                          <Pin size={11} />
                        </IconButton>
                        <IconButton
                          label="删除"
                          className="hover:border-coral/60 hover:text-admin-danger"
                          onClick={() => {
                            if (!serverConfig.enabled) return show(demoNote)
                            void contents
                              .setStatus('moments', p.id, 'hidden')
                              .then(() => loadArticles())
                              .then(() => show('动态已下线'))
                              .catch((err) => show(`删除失败：${(err as Error).message}`))
                          }}
                        >
                          <Trash2 size={11} />
                        </IconButton>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-admin-ink/85">{p.text}</p>
                    <p className="mt-1.5 flex items-center gap-3 font-mono text-[9.5px] text-admin-muted">
                      <span>♥ {p.likes}</span>
                      <span>💬 {p.comments}</span>
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel kicker="Visibility" title="发布规则">
              <ul className="space-y-2 text-[11px] leading-relaxed text-admin-muted">
                <li>· 公开动态会同步到首页动态流与 RSS。</li>
                <li>· 「仅自己」只出现在后台，不会进入 sitemap。</li>
                <li>· 置顶动态最多展示 1 条，其余按时间排序。</li>
              </ul>
            </Panel>
            <Panel kicker="Tags" title="常用标签">
              <div className="flex flex-wrap gap-1.5">
                {['项目', '竞赛', '学习', '内容', '生活'].map((t) => (
                  <span key={t} className="rounded-md bg-sand/55 px-2 py-1 text-[10.5px] text-admin-ink/70">
                    {t}
                  </span>
                ))}
              </div>
            </Panel>
            <Panel kicker="Sync" title="同步状态">
              <div className="space-y-2 text-[11px]">
                {[
                  ['GitHub README', '已同步'],
                  ['RSS 订阅源', '已同步'],
                  ['公众号草稿箱', '未连接'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-admin-muted">{k}</span>
                    <Badge tone={v === '已同步' ? 'teal' : 'neutral'}>{v}</Badge>
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
          setCreating(false)
          setEditing(null)
        }}
        title={editing ? '编辑文章' : '新建文章'}
        desc={editing ? `最后更新 ${editing.date}` : '保存为草稿后可以继续编辑'}
        width="max-w-2xl"
        footer={
          <>
            <AButton
              onClick={() => {
                setCreating(false)
                setEditing(null)
              }}
            >
              取消
            </AButton>
            <AButton variant="primary" onClick={saveEdit}>
              {draft.status === '已发布' ? '保存并发布' : '保存草稿'}
            </AButton>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <Field label="标题">
            <Input autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="例如：把 RAG 评测做成流水线" />
          </Field>
          <Field label="状态">
            <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
              {statusFilters.slice(1).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="分类" className="sm:col-span-2">
            <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {['RAG 工程化', 'Agent 评测', '工程手记'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="摘要" className="sm:col-span-2">
            <Textarea value={draft.abstract} onChange={(e) => setDraft({ ...draft, abstract: e.target.value })} rows={2} placeholder="一两句话说明这篇在讲什么" />
          </Field>
          <Field label="正文（Markdown）" hint="块编辑器未接入：当前只保存标题/分类/摘要/状态，正文请在 src/data/articles.ts 编辑" className="sm:col-span-2">
            <Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={8} placeholder={'正文块编辑器未接入（保存不会写入正文）'} className="font-mono text-[11.5px]" readOnly />
          </Field>
        </div>
      </AdminModal>
      <AdminModal
        open={projectOpen}
        onClose={() => {
          setProjectOpen(false)
          setEditingProject(null)
        }}
        title={editingProject ? '编辑项目' : '新建项目'}
        desc="保存后写入 /api/content/projects，重新拉取列表确认"
        footer={
          <>
            <AButton
              onClick={() => {
                setProjectOpen(false)
                setEditingProject(null)
              }}
            >
              取消
            </AButton>
            <AButton variant="primary" onClick={saveProject}>
              保存
            </AButton>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <Field label="项目标题">
            <Input autoFocus value={projectDraft.title} onChange={(e) => setProjectDraft({ ...projectDraft, title: e.target.value })} placeholder="例如：Agent 评测中台" />
          </Field>
          <Field label="状态">
            <Select value={projectDraft.status} onChange={(e) => setProjectDraft({ ...projectDraft, status: e.target.value })}>
              {statusFilters.slice(1).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="分类" className="sm:col-span-2">
            <Input value={projectDraft.category} onChange={(e) => setProjectDraft({ ...projectDraft, category: e.target.value })} placeholder="项目 / 实习 / 开源" />
          </Field>
        </div>
      </AdminModal>
    </div>
  )
}
