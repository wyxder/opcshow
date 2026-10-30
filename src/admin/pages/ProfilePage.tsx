import { Check, Copy, KeyRound, Laptop, Lock, LogIn, Plus, ShieldCheck, Smartphone, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { profile } from '@/data/site'
import {
  AButton,
  AdminModal,
  Badge,
  Field,
  IconButton,
  Input,
  PageTitle,
  Panel,
  Status,
  Tabs,
  Textarea,
  Toggle,
} from '@/admin/ui'

type Tab = 'profile' | 'account' | 'security'

const tokens = [
  { id: 'k1', name: '站点前端', prefix: 'wyx_live_9f2a', created: '2026-09-12', last: '3 分钟前' },
  { id: 'k2', name: '评测中台同步', prefix: 'wyx_live_31bd', created: '2026-07-04', last: '昨天' },
  { id: 'k3', name: '本地脚本', prefix: 'wyx_test_c7e0', created: '2026-05-18', last: '2026-09-30' },
]

const logins = [
  { time: '2026-10-30 09:12', ip: '113.140.***.21', place: '陕西 · 西安', device: 'Chrome 130 / Windows', ok: true },
  { time: '2026-10-29 22:40', ip: '223.104.***.8', place: '陕西 · 西安', device: 'Safari / iPhone', ok: true },
  { time: '2026-10-28 10:02', ip: '45.132.***.77', place: '新加坡', device: 'Unknown / Linux', ok: false },
]

export default function ProfilePage({
  tab,
  setTab,
  show,
}: {
  tab: Tab
  setTab: (t: Tab) => void
  show: (m: string) => void
}) {
  const [info, setInfo] = useState({
    name: profile.name,
    latin: profile.latin,
    role: profile.role,
    location: profile.location,
    email: profile.email,
    wechat: profile.wechat,
    phone: profile.phone,
    tagline: profile.tagline,
    bio: profile.bio.join('\n\n'),
  })
  const [twoFa, setTwoFa] = useState(true)
  const [ipGuard, setIpGuard] = useState(false)
  const [tokenList, setTokenList] = useState(tokens)
  const [newToken, setNewToken] = useState(false)
  const [tokenName, setTokenName] = useState('')
  const [issued, setIssued] = useState<string | null>(null)
  const [pwd, setPwd] = useState({ old: '', next: '', confirm: '' })
  const [pwdErr, setPwdErr] = useState('')
  const [danger, setDanger] = useState<null | 'transfer' | 'delete'>(null)

  const issue = () => {
    if (!tokenName.trim()) return
    const value = `wyx_live_${Math.random().toString(36).slice(2, 10)}`
    setIssued(value)
    setTokenList((l) => [{ id: `k${Date.now()}`, name: tokenName.trim(), prefix: value.slice(0, 14), created: '2026-10-30', last: '从未使用' }, ...l])
    setTokenName('')
  }

  const savePwd = () => {
    if (pwd.next.length < 8) return setPwdErr('新密码至少 8 位')
    if (pwd.next !== pwd.confirm) return setPwdErr('两次输入的新密码不一致')
    setPwdErr('')
    setPwd({ old: '', next: '', confirm: '' })
    show('密码已更新')
  }

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Profile"
        title="个人中心"
        desc="这里的信息会同步到前台「关于我」、简历页脚与 AI 助手的自我介绍。"
        right={<Badge tone="teal">已同步至前台</Badge>}
      />

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        items={[
          { key: 'profile', label: '资料' },
          { key: 'account', label: '账号' },
          { key: 'security', label: '安全' },
        ]}
      />

      {tab === 'profile' && (
        <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            <Panel kicker="Basic" title="基础资料">
              <div className="mb-5 flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-1.5 border-ink bg-ink text-[22px] font-extrabold text-lime">魏</span>
                <div>
                  <p className="text-[13px] font-semibold">{info.name} · {info.latin}</p>
                  <p className="mt-0.5 text-[11px] text-ink/60">{info.role}</p>
                  <div className="mt-2 flex gap-2">
                    <AButton size="sm" onClick={() => show('头像上传面板（演示）')}>更换头像</AButton>
                    <AButton size="sm" variant="soft" onClick={() => show('已恢复默认头像')}>恢复默认</AButton>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="昵称">
                  <Input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} />
                </Field>
                <Field label="英文名">
                  <Input value={info.latin} onChange={(e) => setInfo({ ...info, latin: e.target.value })} />
                </Field>
                <Field label="身份 / 职位">
                  <Input value={info.role} onChange={(e) => setInfo({ ...info, role: e.target.value })} />
                </Field>
                <Field label="所在城市">
                  <Input value={info.location} onChange={(e) => setInfo({ ...info, location: e.target.value })} />
                </Field>
                <Field label="邮箱">
                  <Input value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} />
                </Field>
                <Field label="微信">
                  <Input value={info.wechat} onChange={(e) => setInfo({ ...info, wechat: e.target.value })} />
                </Field>
                <Field label="手机号" hint="不会公开展示">
                  <Input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} />
                </Field>
                <Field label="一句话简介">
                  <Input value={info.tagline} onChange={(e) => setInfo({ ...info, tagline: e.target.value })} />
                </Field>
                <Field label="个人简介" className="sm:col-span-2">
                  <Textarea value={info.bio} onChange={(e) => setInfo({ ...info, bio: e.target.value })} rows={5} />
                </Field>
              </div>

              <div className="mt-4 flex gap-2">
                <AButton variant="primary" icon={<Check size={13} />} onClick={() => show('资料已保存')}>
                  保存资料
                </AButton>
                <AButton onClick={() => setInfo({ ...info })}>重置</AButton>
              </div>
            </Panel>

            <Panel kicker="Links" title="社交与链接" desc="前台页脚与「关于我」会按顺序展示">
              <div className="space-y-2">
                {profile.socials.map((s) => (
                  <div key={s.label} className="flex items-center gap-2 rounded-lg border border-ink/15 bg-cream px-3 py-2">
                    <span className="w-16 shrink-0 text-[11px] font-medium">{s.label}</span>
                    <input
                      defaultValue={s.value}
                      className="min-w-0 flex-1 bg-transparent font-mono text-[10.5px] text-ink/60 outline-none"
                    />
                    <Badge tone="neutral">公开</Badge>
                    <IconButton label="删除链接" onClick={() => show('链接已移除（演示）')}>
                      <Trash2 size={12} />
                    </IconButton>
                  </div>
                ))}
              </div>
              <AButton className="mt-3" icon={<Plus size={12} />} onClick={() => show('添加链接（演示）')}>
                添加链接
              </AButton>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel kicker="Preview" title="前台展示预览">
              <div className="rounded-xl bg-paper p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border-1.5 border-ink bg-ink text-[16px] font-bold text-lime">魏</span>
                  <div>
                    <p className="text-[13px] font-semibold">{info.name}</p>
                    <p className="font-mono text-[9px] tracking-[0.14em] text-ink/60">{info.latin}</p>
                  </div>
                </div>
                <p className="mt-3 text-[11.5px] font-medium text-admin-danger">{info.tagline}</p>
                <p className="mt-2 line-clamp-3 text-[10.5px] leading-relaxed text-ink/60">{info.bio}</p>
                <p className="mt-3 border-t border-dashed border-ink/15 pt-2 font-mono text-[9.5px] text-ink/60">
                  {info.location} · {info.role}
                </p>
              </div>
              <AButton className="mt-3 w-full" onClick={() => window.open('/', '_blank')}>
                打开前台查看
              </AButton>
            </Panel>

            <Panel kicker="Keywords" title="AI 助手关键词" desc="影响站内检索与自我介绍">
              <div className="flex flex-wrap gap-1.5">
                {profile.keywords.map((k) => (
                  <span key={k} className="rounded-md bg-sand/50 px-2 py-1 font-mono text-[10px] text-admin-ink/70">
                    {k}
                  </span>
                ))}
              </div>
              <Field label="新增关键词" className="mt-3">
                <Input placeholder="回车添加，例如：MCP" onKeyDown={(e) => e.key === 'Enter' && show('关键词已添加（演示）')} />
              </Field>
            </Panel>

            <Panel kicker="Status" title="当前状态">
              <div className="space-y-2 text-[11.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-ink/60">求职状态</span>
                  <Badge tone="amber">寻找实习</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink/60">可到岗时间</span>
                  <span>{profile.availability}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink/60">最后更新</span>
                  <span className="font-mono text-[10.5px]">2026-10-30</span>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'account' && (
        <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <Panel kicker="Account" title="账号信息">
              <div className="flex items-center gap-3 rounded-xl bg-sand/60 p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-1.5 border-ink bg-ink text-[13px] font-bold text-lime">
                  <UserRound size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold">{profile.name}</p>
                  <p className="font-mono text-[10px] text-ink/60">@{profile.handle} · {profile.email}</p>
                </div>
                <Badge tone="red">owner</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="用户名">
                  <Input defaultValue={profile.handle} />
                </Field>
                <Field label="登录邮箱">
                  <Input defaultValue={profile.email} />
                </Field>
                <Field label="角色">
                  <Input defaultValue="owner（全部权限）" readOnly className="bg-paper text-ink/60" />
                </Field>
                <Field label="注册时间">
                  <Input defaultValue="2025-03-18" readOnly className="bg-paper text-ink/60" />
                </Field>
              </div>
              <div className="mt-4 flex gap-2">
                <AButton variant="primary" onClick={() => show('账号信息已保存')}>保存</AButton>
                <AButton onClick={() => show('验证邮件已发送')}>验证邮箱</AButton>
              </div>
            </Panel>

            <Panel kicker="Sessions" title="登录设备" desc="发现陌生设备可立即下线">
              <div className="space-y-2">
                {[
                  { icon: Laptop, name: 'Chrome 130 · Windows 11', meta: '西安 · 当前设备 · 113.140.***.21', now: true },
                  { icon: Smartphone, name: 'Safari · iPhone 15', meta: '西安 · 2 小时前', now: false },
                  { icon: Laptop, name: 'Edge · macOS', meta: '北京 · 3 天前', now: false },
                ].map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2.5 rounded-lg border border-ink/15 px-3 py-2">
                    <d.icon size={14} className="text-ink/60" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-medium">{d.name}</p>
                      <p className="font-mono text-[9.5px] text-ink/60">{d.meta}</p>
                    </div>
                    {d.now ? <Badge tone="teal">在线</Badge> : (
                      <AButton size="sm" variant="soft" onClick={() => show('设备已下线（演示）')}>
                        下线
                      </AButton>
                    )}
                    {i > 0 && <IconButton label="移除记录" onClick={() => show('记录已移除')}><Trash2 size={12} /></IconButton>}
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel kicker="Bindings" title="第三方绑定">
              <div className="space-y-2">
                {[
                  ['GitHub', '@wyx-code', true],
                  ['微信', 'wyx200265', true],
                  ['Google', '未绑定', false],
                ].map(([name, handle, on]) => (
                  <div key={name as string} className="flex items-center justify-between rounded-lg border border-ink/15 px-3 py-2.5">
                    <div>
                      <p className="text-[11.5px] font-medium">{name}</p>
                      <p className="font-mono text-[9.5px] text-ink/60">{handle}</p>
                    </div>
                    <AButton size="sm" variant={on ? 'soft' : 'ghost'} onClick={() => show(on ? '已解除绑定（演示）' : '跳转授权（演示）')}>
                      {on ? '解除' : '绑定'}
                    </AButton>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel kicker="Danger zone" title="危险操作" desc="这些操作会影响站点可用性">
              <div className="space-y-2">
                <AButton variant="danger" className="w-full justify-between" onClick={() => setDanger('transfer')}>
                  转移站点所有权 <LogIn size={13} />
                </AButton>
                <AButton variant="danger" className="w-full justify-between" onClick={() => setDanger('delete')}>
                  注销账号 <Trash2 size={13} />
                </AButton>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <Panel kicker="Password" title="修改密码" desc="修改后其他设备会被强制重新登录">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="当前密码">
                  <Input type="password" value={pwd.old} onChange={(e) => setPwd({ ...pwd, old: e.target.value })} placeholder="••••••••" />
                </Field>
                <Field label="新密码">
                  <Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} placeholder="至少 8 位" />
                </Field>
                <Field label="确认新密码">
                  <Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} placeholder="再输一次" />
                </Field>
              </div>
              {pwdErr && <p className="mt-2 text-[10.5px] text-admin-danger">{pwdErr}</p>}
              <div className="mt-3 flex items-center gap-2">
                <AButton variant="primary" icon={<Lock size={12} />} onClick={savePwd}>
                  更新密码
                </AButton>
                <span className="text-[10px] text-ink/60">建议使用 12 位以上、含符号的密码</span>
              </div>
            </Panel>

            <Panel kicker="Tokens" title="API 访问令牌" desc="用于前台读取内容与评测中台同步"
              right={<AButton size="sm" icon={<Plus size={11} />} onClick={() => setNewToken(true)}>生成</AButton>}
            >
              <div className="space-y-2">
                {tokenList.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-ink/15 px-3 py-2">
                    <KeyRound size={13} className="text-ink/60" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-medium">{t.name}</p>
                      <p className="font-mono text-[9.5px] text-ink/60">{t.prefix}••• · 创建 {t.created} · 最后使用 {t.last}</p>
                    </div>
                    <IconButton label="复制令牌" onClick={() => { navigator.clipboard?.writeText(t.prefix); show('令牌前缀已复制') }}>
                      <Copy size={12} />
                    </IconButton>
                    <AButton size="sm" variant="danger" onClick={() => { setTokenList((l) => l.filter((x) => x.id !== t.id)); show('令牌已撤销') }}>
                      撤销
                    </AButton>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel kicker="Audit log" title="登录日志" flush>
              <div className="divide-y divide-ink/10">
                {logins.map((l) => (
                  <div key={l.time} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[11px]">
                    <span className="font-mono text-[10px] text-ink/60">{l.time}</span>
                    <span className="min-w-0 flex-1 truncate">{l.device}</span>
                    <span className="text-ink/60">{l.place}</span>
                    <span className="font-mono text-[9.5px] text-ink/60">{l.ip}</span>
                    <Status>{l.ok ? '成功' : '已阻止'}</Status>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel kicker="2FA" title="两步验证">
              <div className="flex items-start justify-between gap-3 rounded-xl bg-paper p-3">
                <div>
                  <p className="flex items-center gap-1.5 text-[11.5px] font-medium">
                    <ShieldCheck size={13} className="text-admin-teal" /> 验证器 App
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink/60">已绑定 Authenticator，登录时需输入 6 位动态码。</p>
                </div>
                <Toggle on={twoFa} onChange={(v) => { setTwoFa(v); show(v ? '两步验证已开启' : '两步验证已关闭') }} label="两步验证" />
              </div>
              <AButton className="mt-3 w-full" onClick={() => show('恢复码已重新生成')}>
                查看恢复码
              </AButton>
            </Panel>

            <Panel kicker="Access" title="访问限制">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-ink/15 px-3 py-2.5">
                  <div>
                    <p className="text-[11.5px] font-medium">后台 IP 白名单</p>
                    <p className="text-[9.5px] text-ink/60">仅允许指定网段登录</p>
                  </div>
                  <Toggle on={ipGuard} onChange={(v) => { setIpGuard(v); show(v ? '白名单已启用' : '白名单已关闭') }} label="IP 白名单" />
                </div>
                <Field label="白名单网段">
                  <Input defaultValue="113.140.0.0/16" disabled={!ipGuard} className={ipGuard ? '' : 'opacity-60'} />
                </Field>
                <div className="flex items-center justify-between rounded-lg bg-paper px-3 py-2 text-[10.5px]">
                  <span className="text-ink/60">当前会话风险</span>
                  <Badge tone="teal">低</Badge>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      <AdminModal
        open={newToken}
        onClose={() => { setNewToken(false); setIssued(null) }}
        title="生成 API 令牌"
        desc="令牌只展示一次，请妥善保存。"
        footer={
          issued ? (
            <AButton variant="primary" onClick={() => { setNewToken(false); setIssued(null); show('令牌已生成') }}>
              我已保存
            </AButton>
          ) : (
            <>
              <AButton onClick={() => setNewToken(false)}>取消</AButton>
              <AButton variant="primary" onClick={issue} disabled={!tokenName.trim()}>
                生成令牌
              </AButton>
            </>
          )
        }
      >
        {issued ? (
          <div>
            <p className="text-[11.5px] text-ink/60">复制下面这串令牌，关闭后将无法再次查看：</p>
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-sand/50 px-3 py-2.5 font-mono text-[11px]">
              <span className="min-w-0 flex-1 break-all">{issued}</span>
              <IconButton label="复制" onClick={() => { navigator.clipboard?.writeText(issued); show('已复制') }}>
                <Copy size={12} />
              </IconButton>
            </div>
          </div>
        ) : (
          <Field label="令牌名称" hint="例如：站点前端、CI 同步">
            <Input autoFocus value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="输入用途" />
          </Field>
        )}
      </AdminModal>

      <AdminModal
        open={danger !== null}
        onClose={() => setDanger(null)}
        title={danger === 'delete' ? '注销账号' : '转移所有权'}
        desc="演示环境不会真的执行，但真实操作不可撤销。"
        footer={
          <>
            <AButton onClick={() => setDanger(null)}>取消</AButton>
            <AButton variant="danger" onClick={() => { setDanger(null); show('演示环境已拦截该操作') }}>
              确认
            </AButton>
          </>
        }
      >
        <p className="text-[12px] leading-relaxed text-admin-ink/80">
          {danger === 'delete'
            ? '注销后，站点内容、文件与备份将进入 30 天保留期，期间可联系运维恢复。'
            : '转移后你将失去 owner 权限，仅保留只读访问。需要目标账号先接受邀请。'}
        </p>
      </AdminModal>
    </div>
  )
}
