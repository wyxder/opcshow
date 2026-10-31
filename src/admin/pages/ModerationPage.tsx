import { Check, ExternalLink, Mail, MessageSquare, ShieldAlert, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { danmakuQueue as danmakuSeed, friendRequests as friendSeed, guestbookQueue as guestSeed } from '@/admin/data'
import { friends } from '@/data/me'
import {
  AButton,
  AdminModal,
  Badge,
  EmptyState,
  Field,
  IconButton,
  PageTitle,
  Panel,
  SearchBox,
  Segmented,
  Status,
  TableHead,
  Tabs,
  Textarea,
} from '@/admin/ui'
import { cn } from '@/lib/utils'
import { approvePending, listPending, rejectPending, type GuestMessage } from '@/services/guestbook'
import { serverConfig } from '@/services/config'
import { listFriendRequests, reviewFriendRequest } from '@/services/settings'

type Tab = 'danmaku' | 'guestbook' | 'friends'

export default function ModerationPage({ tab, setTab, show }: { tab: Tab; setTab: (t: Tab) => void; show: (m: string) => void }) {
  const [danmaku, setDanmaku] = useState(danmakuSeed)
  const [guest, setGuest] = useState(guestSeed)
  const [requests, setRequests] = useState(friendSeed)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [query, setQuery] = useState('')
  const [reply, setReply] = useState<(typeof guestSeed)[number] | null>(null)
  const [replyText, setReplyText] = useState('')
  /** fx.md F5/B4 一期：本机真实留言（访客自填）进同一个审核队列 */
  const [localQueue, setLocalQueue] = useState<GuestMessage[]>([])
  const realMode = serverConfig.enabled

  useEffect(() => {
    let alive = true
    listPending().then((l) => alive && setLocalQueue(l))
    return () => {
      alive = false
    }
  }, [])

  // BE-14：友链申请读服务端待审队列，不再用演示种子
  const loadRequests = () => {
    if (!serverConfig.enabled) return
    listFriendRequests().then((list) =>
      setRequests(
        list.map((f) => ({
          id: f.id,
          name: f.name,
          url: f.url,
          desc: f.desc ?? '',
          email: '—',
          time: f.createdAt ? new Date(f.createdAt).toLocaleDateString('zh-CN') : '—',
          status: '待审' as const,
        })),
      ),
    )
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const reviewFriend = async (id: string, status: 'published' | 'hidden') => {
    if (!serverConfig.enabled) return show('未接服务端：友链审核不会保存')
    try {
      await reviewFriendRequest(id, status)
      setRequests((l) => l.filter((x) => x.id !== id))
      show(status === 'published' ? '友链已通过' : '友链已拒绝')
    } catch (err) {
      show(`友链审核失败：${(err as Error).message}`)
    }
  }

  const setGuestDemo = (id: string, status: string) => {
    setGuest((l) => l.map((x) => (x.id === id ? { ...x, status } : x)))
    show('仅本页演示：留言审核不会保存（真实队列见下方）')
  }

  const pendingDanmaku = danmaku.filter((d) => d.status === '待审').length
  const pendingGuest = guest.filter((g) => g.status === '待审').length
  const pendingFriends = requests.filter((f) => f.status === '待审').length

  const match = (status: string, text: string) => {
    const okFilter = filter === 'all' || (filter === 'pending' ? status === '待审' : status !== '待审')
    return okFilter && text.toLowerCase().includes(query.trim().toLowerCase())
  }

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Moderation"
        title="互动审核"
        desc="弹幕与留言默认先审后发；友链申请通过后自动出现在前台友链页。"
        right={
          <Badge tone={pendingDanmaku + pendingGuest + pendingFriends > 0 ? 'red' : 'teal'}>
            待处理 {pendingDanmaku + pendingGuest + pendingFriends} 条
          </Badge>
        }
      />

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
            desc={`共 ${danmaku.length} 条 · 待审 ${pendingDanmaku} 条`}
            flush
            right={
              <div className="flex items-center gap-2">
                <SearchBox value={query} onChange={setQuery} placeholder="搜索内容" className="w-36" />
                <Segmented
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { key: 'all', label: '全部' },
                    { key: 'pending', label: '待审' },
                    { key: 'done', label: '已通过' },
                  ]}
                />
              </div>
            }
          >
            <div className="divide-y divide-ink/10">
              {danmaku.filter((d) => match(d.status, d.user + d.text)).map((d) => (
                <div key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand/55 text-[11px] font-semibold text-admin-ink/70">
                    {d.user.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[11.5px]">
                      <span className="font-medium">{d.user}</span>
                      <span className="font-mono text-[9px] text-admin-muted">{d.time}</span>
                      <span className="rounded bg-sand/55 px-1.5 py-px font-mono text-[9px] text-admin-muted">{d.page}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[11.5px] text-admin-ink/80">{d.text}</p>
                  </div>
                  <Status>{d.status}</Status>
                  <div className="flex items-center gap-1">
                    <IconButton
                      label="通过"
                      className={cn('hover:border-admin-teal/40 hover:text-admin-teal')}
                      onClick={() => show('弹幕审核未接入服务端（不会保存）')}
                    >
                      <Check size={11} />
                    </IconButton>
                    <IconButton
                      label="拒绝"
                      className="hover:border-coral/60 hover:text-admin-danger"
                      onClick={() => show('弹幕审核未接入服务端（不会保存）')}
                    >
                      <X size={11} />
                    </IconButton>
                    <IconButton
                      label="删除"
                      onClick={() => show('弹幕删除未接入服务端（不会保存）')}
                    >
                      <Trash2 size={11} />
                    </IconButton>
                  </div>
                </div>
              ))}
              {danmaku.filter((d) => match(d.status, d.user + d.text)).length === 0 && <EmptyState title="没有匹配的弹幕" />}
            </div>
            <div className="flex items-center justify-between border-t border-ink/10 bg-paper px-4 py-2.5">
              <span className="text-[10px] text-admin-muted">弹幕审核未接入服务端（演示数据，不会保存）</span>
              <AButton
                size="sm"
                onClick={() => show('批量审核未接入服务端（不会保存）')}
              >
                全部通过
              </AButton>
            </div>
          </Panel>

          <Panel
            kicker="Real data"
            title="本机真实留言"
            desc={serverConfig.enabled ? '来自 /api/guestbook 的待审队列' : '来自这台浏览器写下的留言（localStorage），不是预置数据'}
          >
            {localQueue.length === 0 ? (
              <EmptyState title="本机还没有留言" desc="去前台「留言弹幕墙」发一条，它会出现在这里" />
            ) : (
              <div className="space-y-2">
                {localQueue.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-ink/15 px-3 py-2">
                    <span className="text-[11.5px] font-medium">{m.user}</span>
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-admin-ink/75">{m.text}</span>
                    <Badge tone={m.status === 'published' ? 'teal' : 'amber'}>{m.status === 'published' ? '已通过' : '待审'}</Badge>
                    <IconButton
                      label="通过"
                      onClick={() => {
                        void approvePending(m.id)
                          .then(() => {
                            setLocalQueue((l) => l.map((x) => (x.id === m.id ? { ...x, status: 'published' } : x)))
                            show('已通过，前台弹幕墙会显示这条留言')
                          })
                          .catch((err: Error) => show(`审核失败：${err.message}`))
                      }}
                    >
                      <Check size={11} />
                    </IconButton>
                    <IconButton
                      label="删除"
                      onClick={() => {
                        void rejectPending(m.id)
                          .then(() => {
                            setLocalQueue((l) => l.filter((x) => x.id !== m.id))
                            show('已删除这条留言')
                          })
                          .catch((err: Error) => show(`删除失败：${err.message}`))
                      }}
                    >
                      <Trash2 size={11} />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 font-mono text-[9px] text-admin-muted">
              数据源：services/guestbook.ts · {realMode ? '服务端 pending（需登录）' : '本机留言（预置种子弹幕不在此列）'}
            </p>
          </Panel>

          <div className="space-y-3">
            <Panel kicker="Rules" title="审核规则">
              <div className="space-y-2">
                {[
                  ['关键词自动拦截', true, '命中 32 个敏感词'],
                  ['新访客首条必审', true, '注册 7 天内'],
                  ['已通过用户免审', false, '信任等级 ≥ 3'],
                ].map(([l, on, note]) => (
                  <div key={l as string} className="rounded-lg border border-ink/15 px-3 py-2">
                    <p className="flex items-center justify-between text-[11px]">
                      {l} <Badge tone={on ? 'teal' : 'neutral'}>{on ? '开启' : '关闭'}</Badge>
                    </p>
                    <p className="mt-1 text-[9.5px] text-admin-muted">{note}</p>
                  </div>
                ))}
              </div>
              <AButton className="mt-3 w-full" onClick={() => show('规则设置（演示）')}>
                编辑规则
              </AButton>
            </Panel>
            <Panel kicker="Stats" title="近 7 天">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ['新增弹幕', 37],
                  ['通过', 29],
                  ['拦截', 6],
                  ['通过率', '78%'],
                ].map(([l, v]) => (
                  <div key={l as string} className="rounded-lg bg-sand/55 px-3 py-2">
                    <p className="text-[9.5px] text-admin-muted">{l}</p>
                    <p className="mt-1 font-display text-[17px] font-bold leading-none">{v}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'guestbook' && (
        <div className="space-y-3">
          <Panel kicker="Guestbook" title="留言审核（预置演示）" desc={`共 ${guest.length} 条 · 待审 ${pendingGuest} 条 · 真实队列见下方`} flush>
            <div className="divide-y divide-ink/10">
              {guest.map((g) => (
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
                    <AButton size="sm" variant="soft" icon={<MessageSquare size={11} />} onClick={() => { setReply(g); setReplyText('') }}>
                      回复
                    </AButton>
                    <IconButton label="通过" onClick={() => setGuestDemo(g.id, '已通过')}>
                      <Check size={11} />
                    </IconButton>
                    <IconButton
                      label="隐藏"
                      className="hover:border-coral/60 hover:text-admin-danger"
                      onClick={() => setGuestDemo(g.id, '已隐藏')}
                    >
                      <X size={11} />
                    </IconButton>
                    <IconButton
                      label="删除"
                      onClick={() => {
                        setGuest((l) => l.filter((x) => x.id !== g.id))
                        show('仅本页演示：删除不会保存')
                      }}
                    >
                      <Trash2 size={11} />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-3 md:grid-cols-3">
            <Panel kicker="Filter" title="垃圾信息" desc="系统自动识别">
              <div className="flex items-center gap-3 rounded-lg bg-sand/55 p-3">
                <ShieldAlert size={18} className="text-admin-amber" />
                <div>
                  <p className="font-display text-[16px] font-bold leading-none">12</p>
                  <p className="mt-1 text-[9.5px] text-admin-muted">近 30 天已拦截</p>
                </div>
              </div>
            </Panel>
            <Panel kicker="Reply" title="回复率" desc="本周">
              <p className="font-display text-[24px] font-extrabold leading-none">86%</p>
              <p className="mt-1.5 text-[10px] text-admin-muted">6 条留言中回复了 5 条</p>
            </Panel>
            <Panel kicker="Notice" title="提示">
              <p className="text-[10.5px] leading-relaxed text-admin-muted">带邮箱的留言会同步发送回复邮件；纯匿名留言仅站内展示。</p>
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
              desc={`${requests.length} 条 · 待审 ${pendingFriends} 条`}
              flush
              right={<AButton size="sm" onClick={() => show('友链规则文档未接入')}>申请规则</AButton>}
            >
              <div className="overflow-x-auto no-scrollbar">
                <div className="admin-zebra min-w-[700px]">
                  <TableHead cols={['站点', '描述', '邮箱', '时间', '状态', '操作']} template="150px minmax(0,1fr) 150px 76px 68px 108px" />
                  {requests.map((f) => (
                    <div
                      key={f.id}
                      className="grid grid-cols-[150px_minmax(0,1fr)_150px_76px_68px_108px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11.5px] last:border-0 hover:bg-lime/20"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{f.name}</p>
                        <p className="truncate font-mono text-[9px] text-admin-muted">{f.url}</p>
                      </div>
                      <p className="line-clamp-2 text-[10.5px] leading-snug text-admin-muted">{f.desc}</p>
                      <span className="truncate font-mono text-[9.5px] text-admin-muted">{f.email}</span>
                      <span className="font-mono text-[9px] text-admin-muted">{f.time}</span>
                      <Status>{f.status}</Status>
                      <div className="flex items-center justify-end gap-1">
                        <AButton
                          size="sm"
                          variant="soft"
                          onClick={() => void reviewFriend(f.id, 'published')}
                        >
                          通过
                        </AButton>
                        <IconButton
                          label="拒绝"
                          className="hover:border-coral/60 hover:text-admin-danger"
                          onClick={() => void reviewFriend(f.id, 'hidden')}
                        >
                          <X size={11} />
                        </IconButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel kicker="Online" title="当前友链" desc={`${friends.length} 个站点`} flush>
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
                    <IconButton label="打开站点" onClick={() => show('已打开友链（演示）')}>
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
            <Panel kicker="Config" title="展示设置">
              <div className="space-y-2 text-[11px]">
                {[
                  ['前台展示友链', '已开启'],
                  ['自动检测可用性', '每天 03:00'],
                  ['显示申请入口', '已开启'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-ink/10 pb-1.5 last:border-0">
                    <span className="text-admin-muted">{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
              <AButton className="mt-3 w-full" onClick={() => show('友链设置已保存')}>
                保存设置
              </AButton>
            </Panel>
          </div>
        </div>
      )}

      <AdminModal
        open={reply !== null}
        onClose={() => setReply(null)}
        title={`回复 ${reply?.user ?? ''}`}
        desc="回复会展示在留言下方，并发送邮件通知。"
        footer={
          <>
            <AButton onClick={() => setReply(null)}>取消</AButton>
            <AButton
              variant="primary"
              onClick={() => {
                setReply(null)
                setGuest((l) => l.map((x) => (x.id === reply?.id ? { ...x, status: '已通过' } : x)))
                show('回复已发送')
              }}
            >
              发送回复
            </AButton>
          </>
        }
      >
        <div className="rounded-lg bg-sand/55 px-3 py-2 text-[11.5px] leading-relaxed text-ink/75">{reply?.text}</div>
        <Field label="回复内容" className="mt-3">
          <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={4} placeholder="谢谢你的留言…" autoFocus />
        </Field>
      </AdminModal>
    </div>
  )
}
