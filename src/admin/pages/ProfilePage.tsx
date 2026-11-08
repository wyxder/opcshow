import { Check, Copy, KeyRound, Laptop, Lock, LogIn, Plus, ShieldCheck, Trash2, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { profile } from '@/data/site'
import { serverConfig } from '@/services/config'
import { getProfile, saveProfile, type ProfilePatch, type SocialLink } from '@/services/settings'
import { changePassword, getSessions, getSecurity, revokeSession, type SecurityInfo, type SessionRow } from '@/services/admin'
import {
  createToken,
  createUser,
  deleteUser,
  getCapabilities,
  getIpGuard,
  getLoginLogs,
  listTokens,
  listUsers,
  resetUserPassword,
  revokeToken,
  saveIpGuard,
  updateUser,
  type AdminUser,
  type ApiToken,
  type Capabilities,
  type IpGuard,
} from '@/services/adminx'
import {
  AButton,
  AdminModal,
  Badge,
  Field,
  IconButton,
  Input,
  LoadState,
  PageTitle,
  Panel,
  ReadOnlyNotice,
  Select,
  TableHead,
  Tabs,
  Textarea,
  Toggle,
} from '@/admin/ui'

type Tab = 'profile' | 'account' | 'security'

const USER_TEMPLATE = 'minmax(0,1.3fr) minmax(0,0.8fr) minmax(0,0.7fr) auto'

const errMsg = (err: unknown): string => (err instanceof Error ? err.message : String(err))
const str = (v: unknown): string => (typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v))
const fmtTime = (v: unknown): string => {
  const raw = str(v)
  const t = Date.parse(raw)
  return raw && !Number.isNaN(t) ? new Date(t).toLocaleString('zh-CN') : raw || '—'
}
const actionLabel = (a: string): { text: string; tone: 'teal' | 'neutral' | 'amber' } => {
  if (a.includes('logout')) return { text: '登出', tone: 'neutral' }
  if (a.includes('password')) return { text: '改密', tone: 'amber' }
  if (a.includes('login')) return { text: '登录', tone: 'teal' }
  return { text: a, tone: 'neutral' }
}

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
    status: profile.status,
    availability: profile.availability,
    bio: profile.bio.join('\n\n'),
  })
  const [infoBusy, setInfoBusy] = useState(false)
  const [avatar, setAvatar] = useState(profile.avatar ?? '')
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [socials, setSocials] = useState<SocialLink[]>(profile.socials)
  const [socialBusy, setSocialBusy] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [keywords, setKeywords] = useState<string[]>(profile.keywords)
  const [newKeyword, setNewKeyword] = useState('')
  const [keywordBusy, setKeywordBusy] = useState(false)

  // 账号 / 安全：会话、安全状态、能力清单、账号 / 令牌 / IP 白名单 / 登录日志都读服务端
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [security, setSecurity] = useState<SecurityInfo | null>(null)
  const [loginLogs, setLoginLogs] = useState<Record<string, unknown>[]>([])
  const [capabilities, setCapabilities] = useState<Capabilities>({})
  const [dataLoading, setDataLoading] = useState(serverConfig.enabled)

  // 账号管理
  const [users, setUsers] = useState<AdminUser[]>([])
  const [accountModal, setAccountModal] = useState<{ mode: 'create' } | { mode: 'edit'; user: AdminUser } | null>(null)
  const [formUser, setFormUser] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<'admin' | 'editor'>('editor')
  const [formActive, setFormActive] = useState(true)
  const [accountBusy, setAccountBusy] = useState(false)
  const [resetModal, setResetModal] = useState<AdminUser | null>(null)
  const [resetPwd, setResetPwd] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [resetResult, setResetResult] = useState<{ user: string; password: string; note: string } | null>(null)
  const [deleteModal, setDeleteModal] = useState<AdminUser | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  // 安全
  const [tokenList, setTokenList] = useState<ApiToken[]>([])
  const [newToken, setNewToken] = useState(false)
  const [tokenName, setTokenName] = useState('')
  const [issued, setIssued] = useState<string | null>(null)
  const [issueBusy, setIssueBusy] = useState(false)
  const [pwd, setPwd] = useState({ old: '', next: '', confirm: '' })
  const [pwdErr, setPwdErr] = useState('')
  const [pwdBusy, setPwdBusy] = useState(false)
  const [ipGuard, setIpGuard] = useState<IpGuard>({ enabled: false, cidrs: [] })
  const [ipCidrText, setIpCidrText] = useState('')
  const [ipBusy, setIpBusy] = useState(false)

  const capReason = (key: string): string =>
    capabilities[key]?.reason ?? (serverConfig.enabled ? '能力清单暂不可用' : '未接服务端，无法使用该能力')
  const capAvailable = (key: string): boolean => capabilities[key]?.available === true

  const applyProfile = (saved: ProfilePatch) => {
    setInfo((cur) => ({
      name: saved.name ?? cur.name,
      latin: saved.latin ?? cur.latin,
      role: saved.role ?? cur.role,
      location: saved.location ?? cur.location,
      email: saved.email ?? cur.email,
      wechat: saved.wechat ?? cur.wechat,
      phone: saved.phone ?? cur.phone,
      tagline: saved.tagline ?? cur.tagline,
      status: saved.status ?? cur.status,
      availability: saved.availability ?? cur.availability,
      bio: Array.isArray(saved.bio) ? saved.bio.join('\n\n') : cur.bio,
    }))
    if (Array.isArray(saved.keywords)) setKeywords(saved.keywords)
    if (Array.isArray(saved.socials)) setSocials(saved.socials)
    if (typeof saved.avatar === 'string') setAvatar(saved.avatar)
    setUpdatedAt(saved.updatedAt ?? null)
  }

  const refreshUsers = async () => {
    setUsers(await listUsers())
  }
  const refreshTokens = async () => {
    setTokenList(await listTokens())
  }

  useEffect(() => {
    if (!serverConfig.enabled) return
    let alive = true
    getProfile().then((saved) => {
      if (!alive || !saved) return
      applyProfile(saved)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!serverConfig.enabled) return
    let alive = true
    setDataLoading(true)
    void (async () => {
      try {
        const [sess, sec, logs, caps, us, toks, guard] = await Promise.all([
          getSessions(),
          getSecurity(),
          getLoginLogs(30),
          getCapabilities(),
          listUsers(),
          listTokens(),
          getIpGuard(),
        ])
        if (!alive) return
        setSessions(sess)
        setSecurity(sec)
        setLoginLogs(logs)
        setCapabilities(caps ?? {})
        setUsers(us)
        setTokenList(toks)
        if (guard) {
          setIpGuard(guard)
          setIpCidrText(guard.cidrs.join('\n'))
        }
      } finally {
        if (alive) setDataLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  /* ------------------------------- 资料 ------------------------------- */

  const saveInfo = async () => {
    if (!serverConfig.enabled) return show('未接服务端：资料只改本页，刷新丢失')
    setInfoBusy(true)
    try {
      const saved = await saveProfile({
        name: info.name,
        latin: info.latin,
        role: info.role,
        location: info.location,
        email: info.email,
        wechat: info.wechat,
        phone: info.phone,
        tagline: info.tagline,
        status: info.status,
        availability: info.availability,
        bio: info.bio.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean),
      })
      applyProfile(saved)
      show('资料已保存到服务端')
    } catch (err) {
      show(`保存失败：${errMsg(err)}`)
    } finally {
      setInfoBusy(false)
    }
  }

  const reloadProfile = async () => {
    if (serverConfig.enabled) {
      const saved = await getProfile()
      if (saved) {
        applyProfile(saved)
        show('已重新载入服务端资料')
        return
      }
    }
    setInfo({
      name: profile.name,
      latin: profile.latin,
      role: profile.role,
      location: profile.location,
      email: profile.email,
      wechat: profile.wechat,
      phone: profile.phone,
      tagline: profile.tagline,
      status: profile.status,
      availability: profile.availability,
      bio: profile.bio.join('\n\n'),
    })
    setKeywords(profile.keywords)
    setSocials(profile.socials)
    setAvatar(profile.avatar ?? '')
    setUpdatedAt(null)
    show('已恢复初始资料')
  }

  const addKeyword = async () => {
    const k = newKeyword.trim()
    if (!k) return
    if (!serverConfig.enabled) return show('未接服务端：关键词仅本页可见')
    if (keywords.includes(k)) return show('该关键词已存在')
    setKeywordBusy(true)
    try {
      const next = [...keywords, k]
      const saved = await saveProfile({ keywords: next })
      setKeywords(Array.isArray(saved.keywords) ? saved.keywords : next)
      setNewKeyword('')
      show('关键词已保存')
    } catch (err) {
      show(`关键词保存失败：${errMsg(err)}`)
    } finally {
      setKeywordBusy(false)
    }
  }

  const removeKeyword = async (k: string) => {
    if (!serverConfig.enabled) return show('未接服务端：关键词仅本页可见')
    setKeywordBusy(true)
    try {
      const next = keywords.filter((x) => x !== k)
      const saved = await saveProfile({ keywords: next })
      setKeywords(Array.isArray(saved.keywords) ? saved.keywords : next)
      show('关键词已移除')
    } catch (err) {
      show(`移除失败：${errMsg(err)}`)
    } finally {
      setKeywordBusy(false)
    }
  }

  const saveAvatar = async (value: string) => {
    if (!serverConfig.enabled) return show('未接服务端：头像设置不可用')
    setAvatarBusy(true)
    try {
      const saved = await saveProfile({ avatar: value.trim() })
      applyProfile(saved)
      show(value.trim() ? '头像地址已保存，刷新前台即可看到' : '已恢复默认头像')
    } catch (err) {
      show(`头像保存失败：${errMsg(err)}`)
    } finally {
      setAvatarBusy(false)
    }
  }

  const patchSocial = (i: number, key: keyof SocialLink, value: string) => {
    setSocials((cur) => cur.map((s, n) => (n === i ? { ...s, [key]: value } : s)))
  }

  const saveSocials = async (next?: SocialLink[]) => {
    if (!serverConfig.enabled) return show('未接服务端：社交链接不可编辑')
    const list = next ?? socials
    setSocialBusy(true)
    try {
      const saved = await saveProfile({
        socials: list.map((s) => ({
          label: s.label.trim(),
          value: s.value.trim(),
          href: s.href?.trim() || null,
          icon: s.icon || undefined,
        })).filter((s) => s.label && s.value),
      })
      applyProfile(saved)
      show('社交链接已保存到服务端，前台页脚刷新后生效')
    } catch (err) {
      show(`社交链接保存失败：${errMsg(err)}`)
    } finally {
      setSocialBusy(false)
    }
  }

  const addSocial = () => {
    setSocials((cur) => [...cur, { label: '新链接', value: '', href: '', icon: 'link' }])
  }

  const removeSocial = (i: number) => {
    const next = socials.filter((_, n) => n !== i)
    setSocials(next)
    void saveSocials(next)
  }

  /* ------------------------------- 账号 ------------------------------- */

  const saveAccount = async () => {
    if (!serverConfig.enabled) return show('未接服务端：账号信息只读')
    try {
      await saveProfile({ email: info.email })
      show('联系方式已保存')
    } catch (err) {
      show(`保存失败：${errMsg(err)}`)
    }
  }

  const openCreate = () => {
    setFormUser('')
    setFormPassword('')
    setFormRole('editor')
    setFormActive(true)
    setAccountModal({ mode: 'create' })
  }
  const openEdit = (u: AdminUser) => {
    setFormUser(u.user)
    setFormPassword('')
    setFormRole(u.role)
    setFormActive(u.active)
    setAccountModal({ mode: 'edit', user: u })
  }
  const submitAccount = async () => {
    if (!accountModal) return
    setAccountBusy(true)
    try {
      if (accountModal.mode === 'create') {
        if (formPassword.length < 8) {
          show('初始密码至少 8 位')
          return
        }
        await createUser({ user: formUser.trim(), password: formPassword, role: formRole })
        show('账号已创建')
      } else {
        await updateUser(accountModal.user.id, { user: formUser.trim(), role: formRole, active: formActive })
        show('账号已更新')
      }
      await refreshUsers()
      setAccountModal(null)
    } catch (err) {
      show(`${accountModal.mode === 'create' ? '创建' : '更新'}失败：${errMsg(err)}`)
    } finally {
      setAccountBusy(false)
    }
  }

  const openReset = (u: AdminUser) => {
    setResetModal(u)
    setResetPwd('')
    setResetResult(null)
  }
  const submitReset = async () => {
    if (!resetModal) return
    if (resetPwd && resetPwd.length < 8) {
      show('新密码至少 8 位')
      return
    }
    setResetBusy(true)
    try {
      const r = await resetUserPassword(resetModal.id, resetPwd || undefined)
      setResetResult({ user: resetModal.user, password: r.password, note: r.note })
      setSessions(await getSessions())
      show('密码已重置')
    } catch (err) {
      show(`重置失败：${errMsg(err)}`)
    } finally {
      setResetBusy(false)
    }
  }

  const submitDelete = async () => {
    if (!deleteModal) return
    setDeleteBusy(true)
    try {
      await deleteUser(deleteModal.id)
      await refreshUsers()
      show('账号已删除')
      setDeleteModal(null)
    } catch (err) {
      show(`删除失败：${errMsg(err)}`)
    } finally {
      setDeleteBusy(false)
    }
  }

  const dropSession = async (id: string) => {
    try {
      await revokeSession(id)
      setSessions((l) => l.filter((s) => s.id !== id))
      show('已撤销该会话')
    } catch (err) {
      show(`撤销失败：${errMsg(err)}`)
    }
  }

  /* ------------------------------- 安全 ------------------------------- */

  const issue = async () => {
    if (!tokenName.trim()) return
    setIssueBusy(true)
    try {
      const res = await createToken(tokenName.trim())
      setIssued(res.token)
      await refreshTokens()
      show('令牌已签发')
    } catch (err) {
      show(`签发失败：${errMsg(err)}`)
    } finally {
      setIssueBusy(false)
    }
  }

  const revokeTok = async (id: string) => {
    try {
      await revokeToken(id)
      await refreshTokens()
      show('令牌已撤销')
    } catch (err) {
      show(`撤销失败：${errMsg(err)}`)
    }
  }

  const savePwd = async () => {
    if (pwd.next.length < 8) return setPwdErr('新密码至少 8 位')
    if (pwd.next !== pwd.confirm) return setPwdErr('两次输入的新密码不一致')
    setPwdErr('')
    if (!serverConfig.enabled) return show('未接服务端：密码修改不可用')
    setPwdBusy(true)
    try {
      await changePassword({ current: pwd.old, next: pwd.next })
      setPwd({ old: '', next: '', confirm: '' })
      const [freshSessions, freshLogs] = await Promise.all([getSessions(), getLoginLogs(30)])
      setSessions(freshSessions)
      setLoginLogs(freshLogs)
      show('密码已更新，其它设备会话已失效')
    } catch (err) {
      setPwdErr(errMsg(err))
    } finally {
      setPwdBusy(false)
    }
  }

  const saveIp = async () => {
    if (!serverConfig.enabled) return show('未接服务端：IP 白名单不可写')
    setIpBusy(true)
    try {
      const cidrs = ipCidrText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
      const saved = await saveIpGuard({ enabled: ipGuard.enabled, cidrs })
      setIpGuard(saved)
      setIpCidrText(saved.cidrs.join('\n'))
      show('IP 白名单已保存')
    } catch (err) {
      show(`保存失败：${errMsg(err)}`)
    } finally {
      setIpBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Profile"
        title="个人中心"
        desc={serverConfig.enabled ? '资料、账号与安全设置均由服务端持久化，保存后前台即时生效。' : '未接服务端时仅展示本机演示数据，写操作已禁用。'}
        right={<Badge tone={serverConfig.enabled ? 'teal' : 'amber'}>{serverConfig.enabled ? '已接服务端' : '本机演示'}</Badge>}
      />

      {!serverConfig.enabled && (
        <ReadOnlyNotice show>当前未接入服务端：所有资料 / 账号 / 安全数据均为本机演示，写操作已禁用。配置 VITE_API_BASE 并重启后可用真实数据。</ReadOnlyNotice>
      )}

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
              <div className="mb-5 flex items-start gap-4">
                {avatar.trim() ? (
                  <img src={avatar} alt="当前头像" className="h-16 w-16 shrink-0 rounded-full border-1.5 border-ink object-cover" />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-1.5 border-ink bg-ink text-[22px] font-extrabold text-lime">魏</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">{info.name} · {info.latin}</p>
                  <p className="mt-0.5 text-[11px] text-ink/60">{info.role}</p>
                  <Field label="头像图片地址" className="mt-2" hint="可填 /image/xx.jpg、/uploads/xx.png 或 https://… 外链；图片可先在「文件资源 → 上传」上传后复制地址">
                    <Input
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      disabled={!serverConfig.enabled || avatarBusy}
                      placeholder="/image/toux.jpg"
                    />
                  </Field>
                  <div className="mt-2 flex gap-2">
                    <AButton size="sm" disabled={!serverConfig.enabled || avatarBusy} onClick={() => void saveAvatar(avatar)}>
                      {avatarBusy ? '保存中…' : '保存头像'}
                    </AButton>
                    <AButton size="sm" variant="soft" disabled={!serverConfig.enabled || avatarBusy} onClick={() => { setAvatar(''); void saveAvatar('') }}>
                      恢复默认
                    </AButton>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-admin-muted">写入服务端 settings.profile.avatar；前台「关于我」与 AI 分身头像刷新后生效，留空回落到站内默认图。</p>
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
                <Field label="求职状态">
                  <Input value={info.status} onChange={(e) => setInfo({ ...info, status: e.target.value })} />
                </Field>
                <Field label="可到岗时间">
                  <Input value={info.availability} onChange={(e) => setInfo({ ...info, availability: e.target.value })} />
                </Field>
                <Field label="个人简介" className="sm:col-span-2">
                  <Textarea value={info.bio} onChange={(e) => setInfo({ ...info, bio: e.target.value })} rows={5} />
                </Field>
              </div>

              <div className="mt-4 flex gap-2">
                <AButton variant="primary" icon={<Check size={13} />} onClick={() => void saveInfo()} disabled={infoBusy || !serverConfig.enabled}>
                  {infoBusy ? '保存中…' : '保存资料'}
                </AButton>
                <AButton onClick={() => void reloadProfile()}>重置</AButton>
              </div>
            </Panel>

            <Panel kicker="Links" title="社交与链接" desc="前台页脚按顺序展示；href 留空渲染为不可点标签">
              <div className="space-y-2">
                {socials.map((s, i) => (
                  <div key={`${s.label}-${i}`} className="grid grid-cols-[84px_minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-2 rounded-lg border border-ink/15 bg-cream px-3 py-2">
                    <Input
                      aria-label={`第 ${i + 1} 条名称`}
                      value={s.label}
                      disabled={!serverConfig.enabled || socialBusy}
                      onChange={(e) => patchSocial(i, 'label', e.target.value)}
                      className="!px-2 !py-1 !text-[11px]"
                    />
                    <Input
                      aria-label={`第 ${i + 1} 条显示值`}
                      value={s.value}
                      disabled={!serverConfig.enabled || socialBusy}
                      onChange={(e) => patchSocial(i, 'value', e.target.value)}
                      className="!px-2 !py-1 !font-mono !text-[10.5px]"
                      placeholder="显示文字"
                    />
                    <Input
                      aria-label={`第 ${i + 1} 条链接`}
                      value={s.href ?? ''}
                      disabled={!serverConfig.enabled || socialBusy}
                      onChange={(e) => patchSocial(i, 'href', e.target.value)}
                      className="!px-2 !py-1 !font-mono !text-[10.5px]"
                      placeholder="https://… 或留空"
                    />
                    <IconButton label="删除链接" disabled={!serverConfig.enabled || socialBusy} onClick={() => removeSocial(i)}>
                      <Trash2 size={12} />
                    </IconButton>
                  </div>
                ))}
                {!socials.length && <p className="py-3 text-center text-[11px] text-admin-muted">还没有社交链接，点下方按钮添加。</p>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <AButton icon={<Plus size={12} />} disabled={!serverConfig.enabled || socialBusy} onClick={addSocial}>添加链接</AButton>
                <AButton variant="primary" icon={<Check size={12} />} disabled={!serverConfig.enabled || socialBusy} onClick={() => void saveSocials()}>
                  {socialBusy ? '保存中…' : '保存链接'}
                </AButton>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-admin-muted">
                保存后写入服务端 settings.profile.socials，前台启动时由 /api/profile 水合覆盖页脚链接。删除会立即保存；新增或改名需点「保存链接」。图标按名称自动匹配（mail / github / chat / book / link）。
              </p>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel kicker="Preview" title="前台展示预览">
              <div className="rounded-xl bg-paper p-4">
                <div className="flex items-center gap-3">
                  {avatar.trim() ? (
                    <img src={avatar} alt="头像预览" className="h-12 w-12 shrink-0 rounded-full border-1.5 border-ink object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-1.5 border-ink bg-ink text-[16px] font-bold text-lime">魏</span>
                  )}
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
                {keywords.map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={!serverConfig.enabled || keywordBusy}
                    onClick={() => void removeKeyword(k)}
                    title={serverConfig.enabled ? '点击移除' : '未接服务端：不可编辑'}
                    className="group inline-flex items-center gap-1 rounded-md bg-sand/50 px-2 py-1 font-mono text-[10px] text-admin-ink/70 transition hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {k}
                    <X size={10} className="opacity-0 transition group-hover:opacity-100" />
                  </button>
                ))}
              </div>
              <Field label="新增关键词" className="mt-3" hint={serverConfig.enabled ? '回车添加；点击标签可移除' : '未接服务端：关键词编辑已禁用'}>
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addKeyword() } }}
                  placeholder="回车添加，例如：MCP"
                  disabled={!serverConfig.enabled || keywordBusy}
                />
              </Field>
            </Panel>

            <Panel kicker="Status" title="当前状态">
              <div className="space-y-2 text-[11.5px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-ink/60">求职状态</span>
                  <span className="truncate text-right">{info.status || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-ink/60">可到岗时间</span>
                  <span className="truncate text-right">{info.availability || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-ink/60">最后更新</span>
                  <span className="truncate text-right font-mono text-[10.5px]">{fmtTime(updatedAt)}</span>
                </div>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-admin-muted">状态与到岗时间可在「基础资料」里修改并保存；「最后更新」来自服务端 settings.profile.updatedAt。</p>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'account' && (
        <div className="space-y-3">
          <Panel
            kicker="Users"
            title="账号管理"
            desc="列出后台账号，可新建、改角色 / 启停、重置密码与删除"
            right={<AButton size="sm" icon={<Plus size={11} />} disabled={!serverConfig.enabled} onClick={openCreate}>新建账号</AButton>}
          >
            <TableHead cols={['账号', '角色', '状态', '操作']} template={USER_TEMPLATE} />
            {serverConfig.enabled ? (
              <LoadState loading={dataLoading} label="正在加载账号…">
                <div className="divide-y divide-ink/10">
                  {users.map((u) => (
                    <div key={u.id} className="grid items-center gap-3 px-4 py-2.5 text-[11px]" style={{ gridTemplateColumns: USER_TEMPLATE }}>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate font-mono text-[11px] font-medium">{u.user}</span>
                        {u.user === security?.user && <Badge tone="teal">当前</Badge>}
                      </span>
                      <span><Badge tone={u.role === 'admin' ? 'red' : 'neutral'}>{u.role}</Badge></span>
                      <span><Badge tone={u.active ? 'teal' : 'neutral'}>{u.active ? '启用' : '停用'}</Badge></span>
                      <span className="flex justify-end gap-1.5">
                        <AButton size="sm" variant="soft" disabled={!serverConfig.enabled} onClick={() => openEdit(u)}>编辑</AButton>
                        <AButton size="sm" variant="soft" disabled={!serverConfig.enabled} onClick={() => openReset(u)}>重置密码</AButton>
                        <IconButton label="删除账号" disabled={!serverConfig.enabled} onClick={() => setDeleteModal(u)}>
                          <Trash2 size={12} />
                        </IconButton>
                      </span>
                    </div>
                  ))}
                  {users.length === 0 && <p className="px-4 py-6 text-center text-[11px] text-admin-muted">暂无账号</p>}
                </div>
              </LoadState>
            ) : (
              <div className="p-4"><ReadOnlyNotice show>未接服务端：无法读取账号列表，写操作已禁用。</ReadOnlyNotice></div>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-admin-muted">
              当前登录：{security?.user ?? '—'}。服务端会阻止停用 / 降级 / 删除当前账号，以及删除最后一个启用的管理员。
            </p>
          </Panel>

          <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-3">
              <Panel kicker="Account" title="账号信息">
                <div className="flex items-center gap-3 rounded-xl bg-sand/60 p-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-1.5 border-ink bg-ink text-[13px] font-bold text-lime">
                    <UserRound size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold">{profile.name}</p>
                    <p className="font-mono text-[10px] text-ink/60">@{security?.user ?? profile.handle} · {info.email}</p>
                  </div>
                  <Badge tone="red">owner</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label="用户名" hint="在「账号管理」中通过编辑修改">
                    <Input value={security?.user ?? profile.handle} readOnly className="bg-paper text-ink/60" />
                  </Field>
                  <Field label="登录邮箱">
                    <Input value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} disabled={!serverConfig.enabled} />
                  </Field>
                  <Field label="角色" hint="在「账号管理」中通过编辑修改">
                    <Input value={security?.role ?? '—'} readOnly className="bg-paper text-ink/60" />
                  </Field>
                  <Field label="账号来源">
                    <Input value="server/data/users.json" readOnly className="bg-paper text-ink/60" />
                  </Field>
                </div>
                <div className="mt-4 flex gap-2">
                  <AButton variant="primary" disabled={!serverConfig.enabled} onClick={() => void saveAccount()}>保存联系方式</AButton>
                  <AButton disabled={!capAvailable('email')}>验证邮箱</AButton>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-admin-muted">验证邮箱：{capReason('email')}</p>
              </Panel>

              <Panel kicker="Sessions" title="登录设备" desc={serverConfig.enabled ? `当前 ${sessions.length} 个会话，可直接撤销其它设备` : '未接服务端：仅展示本机演示数据'}>
                <div className="space-y-2">
                  {(serverConfig.enabled ? sessions : []).map((s) => (
                    <div key={s.id} className="flex items-center gap-2.5 rounded-lg border border-ink/15 px-3 py-2">
                      <Laptop size={14} className="text-ink/60" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[11px] font-medium">{s.shortId}…</p>
                        <p className="font-mono text-[9.5px] text-ink/60">创建 {new Date(s.createdAt).toLocaleString('zh-CN')} · 到期 {new Date(s.expiresAt).toLocaleDateString('zh-CN')}</p>
                      </div>
                      {s.current ? (
                        <Badge tone="teal">当前</Badge>
                      ) : (
                        <AButton size="sm" variant="soft" onClick={() => void dropSession(s.id)}>
                          下线
                        </AButton>
                      )}
                    </div>
                  ))}
                  {serverConfig.enabled && sessions.length === 0 && <p className="py-4 text-center text-[11px] text-admin-muted">暂无会话</p>}
                  {!serverConfig.enabled && (
                    <p className="rounded-lg border border-dashed border-ink/20 px-3 py-4 text-center text-[11px] text-admin-muted">
                      未接服务端：没有真实会话可展示
                    </p>
                  )}
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
                      <AButton size="sm" variant={on ? 'soft' : 'ghost'} disabled={!capAvailable('oauth')}>
                        {on ? '解除' : '绑定'}
                      </AButton>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-admin-muted">{capReason('oauth')}</p>
              </Panel>

              <Panel kicker="Danger zone" title="危险操作" desc="这些操作会影响站点可用性">
                <div className="space-y-2">
                  <AButton variant="danger" className="w-full justify-between" disabled>转移站点所有权 <LogIn size={13} /></AButton>
                  <AButton variant="danger" className="w-full justify-between" disabled>注销账号 <Trash2 size={13} /></AButton>
                  <p className="text-[10px] leading-relaxed text-admin-muted">转移站点所有权与注销当前账号属于不可逆的归属变更，服务端未提供对应接口；账号的停用 / 删除请使用上方「账号管理」。</p>
                </div>
              </Panel>
            </div>
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
                <AButton variant="primary" icon={<Lock size={12} />} onClick={() => void savePwd()} disabled={pwdBusy || !serverConfig.enabled}>
                  {pwdBusy ? '更新中…' : '更新密码'}
                </AButton>
                <span className="text-[10px] text-ink/60">建议使用 12 位以上、含符号的密码</span>
              </div>
            </Panel>

            <Panel
              kicker="Tokens"
              title="API 访问令牌"
              desc="用于前台读取内容与评测中台同步"
              right={<AButton size="sm" icon={<Plus size={11} />} disabled={!serverConfig.enabled} onClick={() => { setIssued(null); setTokenName(''); setNewToken(true) }}>生成</AButton>}
            >
              {serverConfig.enabled ? (
                <LoadState loading={dataLoading} label="正在加载令牌…">
                  <div className="space-y-2">
                    {tokenList.map((t) => (
                      <div key={t.id} className="flex items-center gap-2.5 rounded-lg border border-ink/15 px-3 py-2">
                        <KeyRound size={14} className="text-ink/60" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11.5px] font-medium">{t.name} <span className="font-mono text-[9.5px] text-ink/60">{t.prefix}…</span></p>
                          <p className="font-mono text-[9.5px] text-ink/60">创建 {fmtTime(t.createdAt)} · 最近使用 {t.lastUsedAt ? fmtTime(t.lastUsedAt) : '从未'}</p>
                        </div>
                        {t.revoked ? <Badge tone="neutral">已撤销</Badge> : <AButton size="sm" variant="soft" disabled={!serverConfig.enabled} onClick={() => void revokeTok(t.id)}>撤销</AButton>}
                      </div>
                    ))}
                    {tokenList.length === 0 && <p className="rounded-lg border border-dashed border-ink/20 px-3 py-6 text-center text-[11px] text-admin-muted">还没有令牌，点击「生成」创建一个</p>}
                  </div>
                </LoadState>
              ) : (
                <ReadOnlyNotice show>未接服务端：无法签发或撤销令牌。</ReadOnlyNotice>
              )}
            </Panel>

            <Panel kicker="Audit log" title="登录 / 安全日志" flush>
              {serverConfig.enabled ? (
                <LoadState loading={dataLoading} label="正在加载日志…">
                  <div className="divide-y divide-ink/10">
                    {loginLogs.map((l, i) => {
                      const tag = actionLabel(str(l.action))
                      return (
                        <div key={str(l.id) || String(i)} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[11px]">
                          <span className="font-mono text-[10px] text-ink/60">{fmtTime(l.ts)}</span>
                          <Badge tone={tag.tone}>{tag.text}</Badge>
                          <span className="min-w-0 flex-1 truncate">{str(l.actor)} · {str(l.action)}</span>
                          <span className="font-mono text-[9.5px] text-ink/60">{str(l.target) || '—'}</span>
                        </div>
                      )
                    })}
                    {loginLogs.length === 0 && <p className="px-4 py-6 text-center text-[11px] text-admin-muted">还没有登录 / 登出记录</p>}
                  </div>
                </LoadState>
              ) : (
                <p className="px-4 py-6 text-center text-[11px] text-admin-muted">未接服务端：没有可读审计日志</p>
              )}
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel kicker="2FA" title="两步验证" desc={capReason('totp')}>
              <div className="flex items-start justify-between gap-3 rounded-xl bg-paper p-3">
                <div>
                  <p className="flex items-center gap-1.5 text-[11.5px] font-medium">
                    <ShieldCheck size={13} className="text-admin-teal" /> 验证器 App
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink/60">{capReason('totp')}</p>
                </div>
                <Badge tone="amber">不可用</Badge>
              </div>
              <AButton className="mt-3 w-full" disabled={!capAvailable('totp')}>查看恢复码</AButton>
              <p className="mt-2 text-[10px] leading-relaxed text-admin-muted">恢复码：{capReason('totp')}</p>
            </Panel>

            <Panel kicker="Access" title="访问限制">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-ink/15 px-3 py-2.5">
                  <div>
                    <p className="text-[11.5px] font-medium">后台 IP 白名单</p>
                    <p className="text-[9.5px] text-ink/60">仅允许指定网段登录</p>
                  </div>
                  <Toggle on={ipGuard.enabled} onChange={(v) => setIpGuard((g) => ({ ...g, enabled: v }))} disabled={!serverConfig.enabled} label="IP 白名单" />
                </div>
                <Field label="白名单网段" hint="CIDR，每行或逗号分隔，最多 50 条">
                  <Textarea rows={3} value={ipCidrText} onChange={(e) => setIpCidrText(e.target.value)} disabled={!serverConfig.enabled} placeholder="113.140.0.0/16" />
                </Field>
                <AButton variant="primary" disabled={ipBusy || !serverConfig.enabled} onClick={() => void saveIp()}>
                  {ipBusy ? '保存中…' : '保存白名单'}
                </AButton>
                {!serverConfig.enabled && <ReadOnlyNotice show>未接服务端：IP 白名单不可编辑。</ReadOnlyNotice>}
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
            <AButton variant="primary" onClick={() => { setNewToken(false); setIssued(null); setTokenName('') }}>
              我已保存
            </AButton>
          ) : (
            <>
              <AButton onClick={() => setNewToken(false)}>取消</AButton>
              <AButton variant="primary" onClick={() => void issue()} disabled={!tokenName.trim() || issueBusy || !serverConfig.enabled}>
                {issueBusy ? '签发中…' : '生成令牌'}
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
        open={accountModal !== null}
        onClose={() => setAccountModal(null)}
        title={accountModal?.mode === 'create' ? '新建账号' : '编辑账号'}
        desc={accountModal?.mode === 'create' ? '创建一个可登录后台的账号，初始密码至少 8 位。' : '修改用户名 / 角色 / 启停；不能停用或降级当前登录的账号。'}
        footer={
          <>
            <AButton onClick={() => setAccountModal(null)}>取消</AButton>
            <AButton variant="primary" disabled={accountBusy || !formUser.trim()} onClick={() => void submitAccount()}>
              {accountBusy ? '保存中…' : '保存'}
            </AButton>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="用户名">
            <Input value={formUser} onChange={(e) => setFormUser(e.target.value)} placeholder="登录账号" />
          </Field>
          {accountModal?.mode === 'create' && (
            <Field label="初始密码" hint="至少 8 位">
              <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="至少 8 位" />
            </Field>
          )}
          <Field label="角色">
            <Select value={formRole} onChange={(e) => setFormRole(e.target.value as 'admin' | 'editor')}>
              <option value="editor">editor（编辑）</option>
              <option value="admin">admin（管理员）</option>
            </Select>
          </Field>
          {accountModal?.mode === 'edit' && (
            <div className="flex items-center justify-between rounded-lg border border-ink/15 px-3 py-2.5">
              <div>
                <p className="text-[11.5px] font-medium">启用该账号</p>
                <p className="text-[9.5px] text-ink/60">停用后该账号无法登录</p>
              </div>
              <Toggle on={formActive} onChange={(v) => setFormActive(v)} label="启用" />
            </div>
          )}
        </div>
      </AdminModal>

      <AdminModal
        open={resetModal !== null}
        onClose={() => { setResetModal(null); setResetResult(null); setResetPwd('') }}
        title="重置密码"
        desc={resetResult ? '请立即保存明文密码，关闭后将无法再次查看。' : '留空将由服务端生成随机密码；重置后该账号的其它会话会被撤销。'}
        footer={
          resetResult ? (
            <AButton variant="primary" onClick={() => { setResetModal(null); setResetResult(null); setResetPwd('') }}>我已保存</AButton>
          ) : (
            <>
              <AButton onClick={() => setResetModal(null)}>取消</AButton>
              <AButton variant="danger" disabled={resetBusy} onClick={() => void submitReset()}>
                {resetBusy ? '重置中…' : '确认重置'}
              </AButton>
            </>
          )
        }
      >
        {resetResult ? (
          <div>
            <p className="text-[11.5px] text-ink/60">{resetResult.note}</p>
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-sand/50 px-3 py-2.5 font-mono text-[11px]">
              <span className="min-w-0 flex-1 break-all">{resetResult.password}</span>
              <IconButton label="复制" onClick={() => { navigator.clipboard?.writeText(resetResult.password); show('已复制') }}>
                <Copy size={12} />
              </IconButton>
            </div>
            <p className="mt-2 text-[10.5px] text-admin-muted">账号：{resetResult.user}</p>
          </div>
        ) : (
          <Field label="新密码（可选）" hint="留空自动生成；自定义至少 8 位">
            <Input type="password" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} placeholder="留空自动生成" />
          </Field>
        )}
      </AdminModal>

      <AdminModal
        open={deleteModal !== null}
        onClose={() => setDeleteModal(null)}
        title="删除账号"
        desc="该操作不可撤销，账号的会话会被一并清除。"
        footer={
          <>
            <AButton onClick={() => setDeleteModal(null)}>取消</AButton>
            <AButton variant="danger" disabled={deleteBusy} onClick={() => void submitDelete()}>
              {deleteBusy ? '删除中…' : '确认删除'}
            </AButton>
          </>
        }
      >
        <p className="text-[12px] leading-relaxed text-admin-ink/80">
          确定删除账号 <span className="font-mono font-semibold">{deleteModal?.user}</span> 吗？服务端会阻止删除当前登录账号与最后一个启用的管理员。
        </p>
      </AdminModal>
    </div>
  )
}
