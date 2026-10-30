import { Eye, FileText, Pencil, Pin, Plus, Star, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
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
import { cn } from '@/lib/utils'

type Tab = 'articles' | 'projects' | 'moments'
type ArticleRow = (typeof adminArticles)[number]
type PostRow = (typeof adminPosts)[number]

const statusFilters = ['全部', '已发布', '草稿', '待审核']

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
  const [projects, setProjects] = useState(adminProjects)
  const [posts, setPosts] = useState<PostRow[]>(adminPosts)
  const [editing, setEditing] = useState<ArticleRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ title: '', category: '工程手记', status: '草稿', abstract: '', body: '' })
  const [postText, setPostText] = useState('')
  const [postVisibility, setPostVisibility] = useState('公开')

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

  const saveEdit = () => {
    if (!draft.title.trim()) return show('标题不能为空')
    if (editing) {
      setArticles((l) => l.map((a) => (a.id === editing.id ? { ...a, title: draft.title, category: draft.category, status: draft.status as ArticleRow['status'] } : a)))
      setEditing(null)
      show('文章已更新')
    } else {
      setArticles((l) => [
        {
          id: `new-${Date.now()}`,
          title: draft.title,
          category: draft.category,
          status: draft.status as ArticleRow['status'],
          views: 0,
          comments: 0,
          date: '2026-10-30',
          words: 0,
        },
        ...l,
      ])
      setCreating(false)
      show(draft.status === '已发布' ? '文章已发布' : '草稿已创建')
    }
  }

  const publishPost = () => {
    if (!postText.trim()) return show('先说点什么吧')
    setPosts((l) => [
      {
        id: `post-${Date.now()}`,
        date: '2026-10-30',
        text: postText.trim(),
        tag: '生活',
        visibility: postVisibility,
        likes: 0,
        comments: 0,
        pinned: false,
      },
      ...l,
    ])
    setPostText('')
    show('动态已发布')
  }

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Content"
        title="内容管理"
        desc="文章、项目与动态共用一套内容模型，发布后会即时出现在前台对应栏目。"
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
              <AButton variant="primary" icon={<Plus size={13} />} onClick={() => show('项目创建面板（演示）')}>
                新建项目
              </AButton>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {contentStats.map((s) => (
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
                        setArticles((l) => l.filter((x) => x.id !== a.id))
                        show('已删除（演示）')
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
                    setProjects((l) => l.map((x) => (x.id === p.id ? { ...x, featured: !x.featured } : x)))
                    show(p.featured ? '已取消首页推荐' : '已设为首页推荐')
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
                  <AButton size="sm" variant="soft" onClick={() => show('项目编辑面板（演示）')}>
                    编辑
                  </AButton>
                  <IconButton
                    label="下架"
                    className="hover:border-coral/60 hover:text-admin-danger"
                    onClick={() => {
                      setProjects((l) => l.filter((x) => x.id !== p.id))
                      show('项目已下架（演示）')
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
                            setPosts((l) => l.map((x) => (x.id === p.id ? { ...x, pinned: !x.pinned } : x)))
                            show(p.pinned ? '已取消置顶' : '已置顶')
                          }}
                        >
                          <Pin size={11} />
                        </IconButton>
                        <IconButton
                          label="删除"
                          className="hover:border-coral/60 hover:text-admin-danger"
                          onClick={() => {
                            setPosts((l) => l.filter((x) => x.id !== p.id))
                            show('动态已删除')
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
          <Field label="正文（Markdown）" className="sm:col-span-2">
            <Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={8} placeholder={'## 小标题\n\n写点什么…'} className="font-mono text-[11.5px]" />
          </Field>
        </div>
      </AdminModal>
    </div>
  )
}
