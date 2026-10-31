import { Check, ExternalLink, Loader2, Mail, MessageSquare, ShieldAlert, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { danmakuQueue as danmakuSeed, friendRequests as friendSeed, guestbookQueue as guestSeed } from '@/admin/data'
import { friends } from '@/data/me'
import {
  AButton,
  Badge,
  EmptyState,
  IconButton,
  LoadState,
  PageTitle,
  Panel,
  ReadOnlyNotice,
  SearchBox,
  Segmented,
  Status,
  TableHead,
  Tabs,
} from '@/admin/ui'
import { cn } from '@/lib/utils'
import { contents } from '@/services/content'
import { serverConfig } from '@/services/config'
import {
  approvePending,
  deleteMessage,
  listModerationQueue,
  listPending,
  rejectPending,
  type GuestMessage,
} from '@/services/guestbook'
import { listFriendRequests, reviewFriendRequest } from '@/services/settings'

type Tab = 'danmaku' | 'guestbook' | 'friends'
type Raw = Record<string, unknown>

type DanmakuRow = { id: string; user: string; text: string; page: string; time: string; status: string }
type GuestRow = { id: string; user: string; email: string; text: string; time: string; status: string; raw?: string }
type FriendRow = { id: string; name: string; url: string; desc: string; email: string; time: string; status: string }

const real = serverConfig.enabled
const DEMO_NOTE = '当前未配置服务端（VITE_API_BASE），通过 / 驳回 / 删除等审核操作已禁用。'

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const rawStatusLabel = (s?: string) =>
  s === 'published' ? '已通过' : s === 'rejected' ? '已拒绝' : s === 'hidden' ? '已拒绝' : s === 'draft' ? '草稿' : '待审'

const demoDanmaku: DanmakuRow[] = danmakuSeed.map((d) => ({ id: d.id, user: d.user, text: d.text, page: '/', time: '预置', status: d.status }))
const demoGuest: GuestRow[] = guestSeed.map((g) => ({ id: g.id, user: g.user, email: g.email, text: g.text, time: g.time, status: g.status }))
const demoFriends: FriendRow[] = friendSeed.map((f) => ({ id: f.id, name: f.name, url: f.url, desc: f.desc, email: f.email, time: f.time, status: f.status }))

export default function ModerationPage({
  tab,
  setTab,
  show,
  onPendingChange,
}: {
  tab: Tab
  setTab: (t: Tab) => void
  show: (m: string) => void
  onPendingChange?: () => void
}) {
  const [danmaku, setDanmaku] = useState<DanmakuRow[]>(real ? [] : demoDanmaku)
  const [guest, setGuest] = useState<GuestRow[]>(real ? [] : demoGuest)
  const [requests, setRequests] = useState<FriendRow[]>(real ? [] : demoFriends)
  const [localQueue, setLocalQueue] = useState<GuestMessage[]>([])
  const [loading, setLoading] = useState(real)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [query, setQuery] = useState('')

  const load = useCallback(async (spinner = true) => {
    if (!real) {
      setDanmaku(demoDanmaku)
      setGuest(demoGuest)
      setRequests(demoFriends)
      setLoading(false)
      setError('')
      return
    }
    if (spinner) setLoading(true)
    setError('')
    try {
      const [dmList, gbList, frList] = await Promise.all([
        contents.listAdmin('danmaku'),
        listModerationQueue(),
        listFriendRequests(),
      ])
      setDanmaku(
        (dmList as unknown as Raw[]).map((r) => ({
          id: str(r.id),
          user: str(r.user, '匿名'),
          text: str(r.text),
          page: str(r.page, '/'),
          time: str(r.createdAt).slice(0, 10) || str(r.time) || '—',
          status: rawStatusLabel(str(r.status)),
        })),
      )
      setGuest(
        gbList.map((m) => ({
          id: m.id,
          user: m.user,
          email: m.email || '—',
          text: m.text,
          time: m.time,
          status: rawStatusLabel(m.rawStatus),
          raw: m.rawStatus,
        })),
      )
      setRequests(
        frList.map((f) => ({
          id: f.id,
          name: f.name,
          url: f.url,
          desc: f.desc ?? '',
          email: '—',
          time: f.createdAt ? new Date(f.createdAt).toLocaleDateString('zh-CN') : '—',
          status: '待审',
        })),
      )
    } catch (err) {
      setError(`审核队列加载失败：${(err as Error).message}`)
    } finally {
      if (spinner) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // 本机留言（演示模式下访客在浏览器里写下的数据），真实模式由服务端队列接管
  const loadLocal = useCallback(async () => {
    try {
      setLocalQueue(await listPending())
    } catch {
      setLocalQueue([])
    }
  }, [])

  useEffect(() => {
    void loadLocal()
  }, [loadLocal])

  useEffect(() => {
    setQuery('')
    setFilter('all')
  }, [tab])

  const run = async (key: string, task: () => Promise<unknown>, ok: string, fail: string) => {
    if (!real) return show('未配置服务端，审核操作不可用')
    if (busy) return
    setBusy(key)
    try {
      await task()
      await load(false)
      await loadLocal()
      onPendingChange?.()
      show(ok)
    } catch (err) {
      show(`${fail}：${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  const reviewDanmaku = (row: DanmakuRow, next: 'published' | 'hidden') =>
    run(
      `danmaku-${row.id}-${next}`,
      () => contents.setStatus('danmaku', row.id, next),
      next === 'published' ? `已通过「${row.user}」的弹幕` : '弹幕已驳回',
      '审核失败',
    )

  const removeDanmaku = (row: DanmakuRow) => {
    if (!real) return show('未配置服务端，删除不可用')
    if (!window.confirm(`删除「${row.user}」的这条弹幕？`)) return
    void run(
      `danmaku-${row.id}-remove`,
      () => contents.remove('danmaku', row.id),
      '弹幕已删除',
      '删除失败',
    )
  }

  const reviewGuest = (row: GuestRow, action: 'approve' | 'reject' | 'delete') =>
    run(
      `guest-${row.id}-${action}`,
      () => (action === 'approve' ? approvePending(row.id) : action === 'reject' ? rejectPending(row.id) : deleteMessage(row.id)),
      action === 'approve' ? `已通过「${row.user}」的留言` : action === 'reject' ? '留言已驳回' : '留言已删除',
      '审核失败',
    )

  const reviewFriend = (row: FriendRow, action: 'approve' | 'reject' | 'delete') =>
    run(
      `friend-${row.id}-${action}`,
      () => reviewFriendRequest(row.id, action === 'approve' ? 'published' : 'hidden'),
      action === 'approve' ? `已通过「${row.name}」的友链申请` : '友链申请已删除',
      '审核失败',
    )

  const approveAllDanmaku = async () => {
    if (!real) return show('未配置服务端，批量审核不可用')
    const pending = danmaku.filter((d) => d.status === '待审')
    if (!pending.length) return show('没有待审弹幕')
    if (busy) return
    setBusy('danmaku-all')
    try {
      for (const d of pending) await contents.setStatus('danmaku', d.id, 'published')
      await load(false)
      onPendingChange?.()
      show(`已通过 ${pending.length} 条弹幕`)
    } catch (err) {
      show(`批量审核失败：${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  const pendingDanmaku = danmaku.filter((d) => d.status === '待审').length
  const pendingGuest = guest.filter((g) => g.status === '待审').length
  const pendingFriends = requests.filter((f) => f.status === '待审').length
  const totalPending = pendingDanmaku + pendingGuest + pendingFriends

  const match = (status: string, text: string) => {
    const okFilter = filter === 'all' || (filter === 'pending' ? status === '待审' : status !== '待审')
    return okFilter && text.toLowerCase().includes(query.trim().toLowerCase())
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <SearchBox value={query} onChange={setQuery} placeholder="搜索内容" className="w-40" />
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { key: 'all', label: '全部' },
          { key: 'pending', label: '待审' },
          { key: 'done', label: '已处理' },
        ]}
      />
    </div>
  )

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Moderation"
        title="互动审核"
        desc={real ? '待审队列来自服务端；通过 / 驳回 / 删除后重新拉取，数量与侧栏 badge 同步。' : '演示只读队列：审核操作已禁用，不会写入任何地方。'}
        right={<Badge tone={totalPending > 0 ? 'red' : 'teal'}>待处理 {totalPending} 条</Badge>}
      />

      <ReadOnlyNotice show={!real}>
        {DEMO_NOTE} 配置 <span className="font-mono text-[9.5px]">VITE_API_BASE</span> 并登录后自动启用审核。
      </ReadOnlyNotice>

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        items={[
          { key: 'danmaku', label: '弹幕', count: pendingDanmaku },
          { key: 'guestbook', label: '留言', count: pendingGuest },
          { key: 'friends', label: '友链', count: pendingFriends },
        ]}
      />

      {tab === 'danmaku' && (
        <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
          <Panel
            kicker="Danmaku"
            title="弹幕审核"
            desc={`共 ${danmaku.length} 条 · 待审 ${pendingDanmaku} 条${real ? '' : ' · 预置演示'}`}
            flush
            right={toolbar}
          >
            <LoadState loading={loading} error={error} onRetry={() => void load()} label="正在加载弹幕…">
              <div className="divide-y divide-ink/10">
                {danmaku
                  .filter((d) => match(d.status, `${d.user} ${d.text}`))
                  .map((d) => {
                    const approveKey = `danmaku-${d.id}-published`
                    const rejectKey = `danmaku-${d.id}-hidden`
                    const removeKey = `danmaku-${d.id}-remove`
                    return (
                      <div key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand/55 text-[11px] font-semibold text-admin-ink/70">
                          {d.user.slice(0, 1)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-[11.5px]">
                            <span className="font-medium">{d.user}</span>
                            <span className="font-mono text-[9px] text-admin-muted">{d.time}</span>
                            <span className="rounded bg-sand/55 px-1.5 py-px font-mono text-[9px] text-admin-muted">{d.page}</span>
                          </p>
                          <p className="mt-0.5 truncate text-[11.5px] text-admin-ink/80" title={d.text}>
                            {d.text}
                          </p>
                        </div>
                        <Status>{d.status}</Status>
                        <div className="flex items-center gap-1">
                          <IconButton
                            label="通过"
                            disabled={!real || busy !== null || d.status === '已通过'}
                            className="hover:border-admin-teal/40 hover:text-admin-teal"
                            onClick={() => void reviewDanmaku(d, 'published')}
                          >
                            {busy === approveKey ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                          </IconButton>
                          <IconButton
                            label="驳回"
                            disabled={!real || busy !== null || d.status === '已拒绝'}
                            className="hover:border-coral/60 hover:text-admin-danger"
                            onClick={() => void reviewDanmaku(d, 'hidden')}
                          >
                            {busy === rejectKey ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                          </IconButton>
                          <IconButton label="删除" disabled={!real || busy !== null} onClick={() => removeDanmaku(d)}>
                            {busy === removeKey ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          </IconButton>
                        </div>
                      </div>
                    )
                  })}
                {danmaku.filter((d) => match(d.status, `${d.user} ${d.text}`)).length === 0 && (
                  <EmptyState title="没有匹配的弹幕" desc={danmaku.length ? '试试换个关键字或筛选条件' : '前台收到弹幕后会进入这里'} />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 bg-paper px-4 py-2.5">
                <span className="text-[10px] text-admin-muted">通过后出现在前台弹幕墙；驳回 / 删除会下架</span>
                <AButton
                  size="sm"
                  disabled={!real || busy !== null || pendingDanmaku === 0}
                  title={real ? '' : '未配置服务端：批量审核不可用'}
                  onClick={() => void approveAllDanmaku()}
                  icon={busy === 'danmaku-all' ? <Loader2 size={11} className="animate-spin" /> : undefined}
                >
                  全部通过（{pendingDanmaku}）
                </AButton>
              </div>
            </LoadState>
          </Panel>

          <div className="space-y-3">
            <Panel kicker="Queue" title="队列概况">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ['弹幕待审', pendingDanmaku],
                  ['留言待审', pendingGuest],
                  ['友链待审', pendingFriends],
                  ['合计', totalPending],
                ].map(([l, v]) => (
                  <div key={l as string} className="rounded-lg bg-sand/55 px-3 py-2">
                    <p className="text-[9.5px] text-admin-muted">{l}</p>
                    <p className="mt-1 font-display text-[17px] font-bold leading-none">{v}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 font-mono text-[9px] leading-relaxed text-admin-muted">
                数据源：{real ? '/api/content/danmaku + /api/guestbook + /api/admin/friend-requests' : '本地演示快照（只读）'}
              </p>
            </Panel>

            <Panel kicker="Rules" title="审核规则">
              <div className="space-y-2">
                {[
                  ['关键词自动拦截', true, '命中敏感词的投稿仍会进入待审'],
                  ['新访客首条必审', true, '所有留言默认 pending'],
                  ['审核结果可追溯', true, '服务端写入审计日志'],
                ].map(([l, on, note]) => (
                  <div key={l as string} className="rounded-lg border border-ink/15 px-3 py-2">
                    <p className="flex items-center justify-between text-[11px]">
                      {l} <Badge tone={on ? 'teal' : 'neutral'}>{on ? '开启' : '关闭'}</Badge>
                    </p>
                    <p className="mt-1 text-[9.5px] text-admin-muted">{note}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 font-mono text-[9px] text-admin-muted">规则配置接口未接入，此处仅说明当前行为</p>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'guestbook' && (
        <div className="space-y-3">
          <Panel
            kicker="Guestbook"
            title="留言审核"
            desc={`共 ${guest.length} 条 · 待审 ${pendingGuest} 条${real ? '' : ' · 预置演示'}`}
            flush
            right={toolbar}
          >
            <LoadState loading={loading} error={error} onRetry={() => void load()} label="正在加载留言…">
              <div className="divide-y divide-ink/10">
                {guest
                  .filter((g) => match(g.status, `${g.user} ${g.text} ${g.email}`))
                  .map((g) => {
                    const approveKey = `guest-${g.id}-approve`
                    const rejectKey = `guest-${g.id}-reject`
                    const removeKey = `guest-${g.id}-delete`
                    return (
                      <div key={g.id} className="flex flex-wrap items-start gap-3 px-4 py-3 sm:px-5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand/55 text-[12px] font-semibold text-admin-ink/70">
                          {g.user.slice(0, 1)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-[11.5px]">
                            <span className="font-medium">{g.user}</span>
                            <span className="flex items-center gap-1 font-mono text-[9px] text-admin-muted">
                              <Mail size={9} /> {g.email}
                            </span>
                            <span className="font-mono text-[9px] text-admin-muted">{g.time}</span>
                            <Status>{g.status}</Status>
                          </p>
                          <p className="mt-1 text-[11.5px] leading-relaxed text-admin-ink/80">{g.text}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <AButton
                            size="sm"
                            variant="soft"
                            disabled={!real || busy !== null || g.status === '已通过'}
                            icon={busy === approveKey ? <Loader2 size={11} className="animate-spin" /> : <MessageSquare size={11} />}
                            onClick={() => void reviewGuest(g, 'approve')}
                          >
                            通过
                          </AButton>
                          <IconButton
                            label="驳回"
                            disabled={!real || busy !== null || g.status === '已拒绝'}
                            className="hover:border-coral/60 hover:text-admin-danger"
                            onClick={() => void reviewGuest(g, 'reject')}
                          >
                            {busy === rejectKey ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                          </IconButton>
                          <IconButton label="删除" disabled={!real || busy !== null} onClick={() => void reviewGuest(g, 'delete')}>
                            {busy === removeKey ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          </IconButton>
                        </div>
                      </div>
                    )
                  })}
                {guest.filter((g) => match(g.status, `${g.user} ${g.text} ${g.email}`)).length === 0 && (
                  <EmptyState title="没有匹配的留言" desc={guest.length ? '试试换个关键字或筛选条件' : '前台留言提交后会进入这里'} />
                )}
              </div>
            </LoadState>
          </Panel>

          {!real && (
            <Panel kicker="Local" title="本机留言" desc="来自这台浏览器写下的留言（localStorage），不含预置数据；演示模式下同样只读">
              {localQueue.length === 0 ? (
                <EmptyState title="本机还没有留言" desc="去前台「留言弹幕墙」发一条，它会出现在这里" />
              ) : (
                <div className="space-y-2">
                  {localQueue.map((m) => (
                    <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-ink/15 px-3 py-2">
                      <span className="text-[11.5px] font-medium">{m.user}</span>
                      <span className="min-w-0 flex-1 truncate text-[11.5px] text-admin-ink/75">{m.text}</span>
                      <Badge tone={m.status === 'published' ? 'teal' : 'amber'}>{m.status === 'published' ? '已通过' : '待审'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <Panel kicker="Filter" title="垃圾信息" desc="服务端自动识别">
              <div className="flex items-center gap-3 rounded-lg bg-sand/55 p-3">
                <ShieldAlert size={18} className="text-admin-amber" />
                <div>
                  <p className="font-display text-[16px] font-bold leading-none">{guest.filter((g) => g.status === '已拒绝').length}</p>
                  <p className="mt-1 text-[9.5px] text-admin-muted">当前队列中已驳回</p>
                </div>
              </div>
            </Panel>
            <Panel kicker="Reply" title="审核通过" desc="当前队列">
              <p className="font-display text-[24px] font-extrabold leading-none">{guest.filter((g) => g.status === '已通过').length}</p>
              <p className="mt-1.5 text-[10px] text-admin-muted">共 {guest.length} 条留言</p>
            </Panel>
            <Panel kicker="Notice" title="提示">
              <p className="text-[10.5px] leading-relaxed text-admin-muted">通过后留言会出现在前台弹幕墙；驳回会保留记录但不再公开，删除则从后台队列移除。</p>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'friends' && (
        <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
          <div className="space-y-3">
            <Panel
              kicker="Requests"
              title="友链申请"
              desc={`${requests.length} 条 · 待审 ${pendingFriends} 条${real ? '' : ' · 预置演示'}`}
              flush
              right={toolbar}
            >
              <LoadState loading={loading} error={error} onRetry={() => void load()} label="正在加载友链申请…">
                <div className="overflow-x-auto no-scrollbar">
                  <div className="admin-zebra min-w-[720px]">
                    <TableHead cols={['站点', '描述', '时间', '状态', '操作']} template="150px minmax(0,1fr) 90px 68px 132px" />
                    {requests
                      .filter((f) => match(f.status, `${f.name} ${f.url} ${f.desc}`))
                      .map((f) => {
                        const approveKey = `friend-${f.id}-approve`
                        const rejectKey = `friend-${f.id}-reject`
                        const removeKey = `friend-${f.id}-delete`
                        return (
                          <div
                            key={f.id}
                            className="grid grid-cols-[150px_minmax(0,1fr)_90px_68px_132px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11.5px] last:border-0 hover:bg-lime/20"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">{f.name}</p>
                              <p className="truncate font-mono text-[9px] text-admin-muted">{f.url}</p>
                            </div>
                            <p className="line-clamp-2 text-[10.5px] leading-snug text-admin-muted">{f.desc}</p>
                            <span className="font-mono text-[9px] text-admin-muted">{f.time}</span>
                            <Status>{f.status}</Status>
                            <div className="flex items-center justify-end gap-1">
                              <AButton
                                size="sm"
                                variant="soft"
                                disabled={!real || busy !== null}
                                icon={busy === approveKey ? <Loader2 size={11} className="animate-spin" /> : undefined}
                                onClick={() => void reviewFriend(f, 'approve')}
                              >
                                通过
                              </AButton>
                              <IconButton label="驳回" disabled={!real || busy !== null} className="hover:border-coral/60 hover:text-admin-danger" onClick={() => void reviewFriend(f, 'reject')}>
                                {busy === rejectKey ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                              </IconButton>
                              <IconButton label="删除申请" disabled={!real || busy !== null} onClick={() => void reviewFriend(f, 'delete')}>
                                {busy === removeKey ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                              </IconButton>
                            </div>
                          </div>
                        )
                      })}
                    {requests.filter((f) => match(f.status, `${f.name} ${f.url} ${f.desc}`)).length === 0 && (
                      <div className="px-4">
                        <EmptyState title="没有匹配的友链申请" desc={requests.length ? '试试换个关键字或筛选条件' : '前台提交友链后进入待审队列'} />
                      </div>
                    )}
                  </div>
                </div>
              </LoadState>
            </Panel>

            <Panel kicker="Online" title="当前友链" desc={`${friends.length} 个站点（静态展示）`} flush>
              <div className="grid gap-2 p-4 sm:grid-cols-2">
                {friends.map((f) => (
                  <div key={f.id} className="flex items-center gap-2.5 rounded-lg border border-ink/15 px-3 py-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: `color-mix(in srgb, ${f.color} 40%, transparent)` }}>
                      {f.avatar}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-medium">{f.name}</p>
                      <p className="truncate text-[9.5px] text-admin-muted">{f.desc}</p>
                    </div>
                    <Badge tone="neutral">{f.tag}</Badge>
                    <IconButton
                      label="打开站点"
                      disabled={!f.url}
                      onClick={() => f.url && window.open(f.url, '_blank', 'noopener')}
                    >
                      <ExternalLink size={11} />
                    </IconButton>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel kicker="Requirement" title="友链要求">
              <ul className="space-y-2 text-[10.5px] leading-relaxed text-admin-muted">
                <li>· 站点有持续更新的原创内容。</li>
                <li>· 首页或友链页已添加本站链接。</li>
                <li>· 不接受纯采集、导流或博彩类站点。</li>
                <li>· 每季度会清理 12 个月未更新的友链。</li>
              </ul>
            </Panel>
            <Panel kicker="Flow" title="审核流转">
              <div className="space-y-2 text-[11px]">
                {[
                  ['待审', '前台提交后进入队列'],
                  ['已通过', '写入 content.friends 并在前台展示'],
                  ['已拒绝', '保留记录，前台不可见'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-2 border-b border-ink/10 pb-1.5 last:border-0">
                    <Status>{k}</Status>
                    <span className="text-right text-[10px] text-admin-muted">{v}</span>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel kicker="Source" title="数据来源">
              <p className="text-[10.5px] leading-relaxed text-admin-muted">
                {real ? 'GET /api/admin/friend-requests（仅待审）→ PATCH /api/admin/friend-requests/:id。' : '演示快照来自 src/admin/data.ts，写操作禁用。'}
              </p>
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}
