import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AdminShell, { getSection, sections, type SectionKey } from '@/admin/AdminShell'
import LoginPage from '@/admin/LoginPage'
import { useAdminToast } from '@/admin/ui'
import { useSeo } from '@/lib/seo'
import { getSession, logout, type AdminSession } from '@/services/auth'
import { serverConfig } from '@/services/config'
import { apiJsonSafe } from '@/services/http'
import { listPending } from '@/services/guestbook'
import AnalyticsPage from '@/admin/pages/AnalyticsPage'
import ContentPage from '@/admin/pages/ContentPage'
import FilesAdminPage from '@/admin/pages/FilesAdminPage'
import ModerationPage from '@/admin/pages/ModerationPage'
import OverviewPage from '@/admin/pages/OverviewPage'
import ProfilePage from '@/admin/pages/ProfilePage'
import SettingsPage from '@/admin/pages/SettingsPage'
// 重页面拆 chunk，避免 Admin 首包超过 50 kB 预算
const AiConfigPage = lazy(() => import('@/admin/pages/AiConfigPage'))
const ResumeAdminPage = lazy(() => import('@/admin/pages/ResumeAdminPage'))

export default function AdminApp() {
  const location = useLocation()
  const navigate = useNavigate()
  const { show, node } = useAdminToast()
  const [session, setSession] = useState<AdminSession | null>(null)
  const [ready, setReady] = useState(!serverConfig.enabled)
  const [pending, setPending] = useState<number | null>(null)

  // fx.md S3：后台不参与索引
  useSeo({ title: '后台管理 · WYX.SPACE', description: '站点后台。', path: '/admin', robots: 'noindex, nofollow' })

  const reloadSession = useCallback(() => {
    setReady(false)
    getSession().then((s) => {
      setSession(s)
      setReady(true)
    })
  }, [])

  // fx.md B2：会话适配层。未配服务端 = 演示会话（不拦人，但界面必须说清楚）
  useEffect(() => {
    reloadSession()
  }, [reloadSession])

  // F-02 / F-07 / F-15：侧栏 badge 用真实待审数，不再写死
  const refreshPending = useCallback(() => {
    if (serverConfig.enabled) {
      if (!session) {
        setPending(null)
        return
      }
      apiJsonSafe<{ count: number }>('/api/guestbook/pending/count').then((r) => setPending(r?.count ?? null))
      return
    }
    // 演示模式：数本机留言队列（不含预置种子），没有服务端也能对上
    listPending().then((l) => setPending(l.length))
  }, [session])

  // 切页 / 审核完成后都刷新一次待审数，保证侧栏 badge 与列表同步
  useEffect(() => {
    refreshPending()
  }, [refreshPending, location.pathname])

  const handleLogout = async () => {
    if (!serverConfig.enabled) {
      show('演示模式：没有真实会话可退出')
      return
    }
    await logout()
    setSession(null)
    setPending(null)
    show('已退出登录')
    navigate('/admin/overview/overview', { replace: true })
  }

  const parts = location.pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean)
  const known = sections.some((s) => s.key === parts[0])
  const section = getSection(known ? parts[0] : 'overview')
  const key = section.key as SectionKey
  const tab = section.tabs.some((t) => t.key === parts[1]) ? parts[1] : section.tabs[0].key

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const go = (target: SectionKey, t?: string) => {
    const next = getSection(target)
    navigate(`/admin/${target}/${t ?? next.tabs[0].key}`)
  }
  const setTab = (t: string) => navigate(`/admin/${key}/${t}`)

  // F-02：真实模式下未登录不可进后台
  if (serverConfig.enabled && !ready) {
    return <div className="flex min-h-screen items-center justify-center bg-paper font-mono text-[11px] text-admin-muted">正在校验会话…</div>
  }
  if (serverConfig.enabled && !session) {
    return (
      <LoginPage
        onDone={() => {
          reloadSession()
          navigate('/admin/overview/overview', { replace: true })
        }}
      />
    )
  }

  const page = (() => {
    switch (key) {
      case 'overview':
        return tab === 'analytics' ? <AnalyticsPage show={show} /> : <OverviewPage show={show} go={go} />
      case 'profile':
        return <ProfilePage tab={tab as 'profile' | 'account' | 'security'} setTab={setTab} show={show} />
      case 'content':
        return <ContentPage tab={tab as 'articles' | 'projects' | 'moments'} setTab={setTab} show={show} />
      case 'resume':
        return <ResumeAdminPage tab={tab as 'parse' | 'modules' | 'versions'} setTab={setTab} show={show} />
      case 'files':
        return <FilesAdminPage tab={tab as 'upload' | 'share' | 'clean'} setTab={setTab} show={show} />
      case 'review':
        return (
          <ModerationPage
            tab={tab as 'danmaku' | 'guestbook' | 'friends'}
            setTab={setTab}
            show={show}
            onPendingChange={refreshPending}
          />
        )
      case 'ai':
        return <AiConfigPage tab={tab as 'models' | 'prompts' | 'usage'} setTab={setTab} show={show} />
      case 'settings':
        return <SettingsPage tab={tab as 'theme' | 'seo' | 'backup'} setTab={setTab} show={show} />
      default:
        return null
    }
  })()

  return (
    <AdminShell section={key} onNavigate={(k) => go(k)} onLogout={handleLogout} pending={pending}>
      {session?.mode === 'demo' && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border-1.5 border-dashed border-warning/60 bg-warning/10 px-3 py-2 text-[11.5px] text-ink">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-admin-warning">DEMO · 未鉴权</span>
          <span>演示模式：未配置 VITE_API_BASE。列表只读本地快照，写操作（新建 / 编辑 / 发布 / 删除 / 审核 / 上传 / 分享）已全部禁用，不会伪装成功。</span>
          <span className="font-mono text-[9.5px] text-ink/45">接入方式：VITE_API_BASE=/api（同源代理到 {serverConfig.authLoginPath}）</span>
        </div>
      )}
      {page}
      {node}
    </AdminShell>
  )
}
